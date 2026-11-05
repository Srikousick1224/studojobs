-- StudoJob migration 007: onboarding for Google / GitHub sign-in.
--
-- WHY: Google and GitHub cannot tell us whether someone is a student or an employer, but the
-- signup trigger (migration 003) creates a profile for EVERY new auth user, defaulting to
-- "student". Without a marker we could not tell "a student who chose it" from "a social user
-- who has not been asked yet". This migration adds that marker and one safe way to set it.
--
-- WHAT CHANGES
--  1. profiles.onboarded_at  (null = has not picked an account type yet). Existing rows are
--     back-filled as onboarded, so every current email/password user is unaffected.
--  2. private.handle_new_user() is REPLACED (the trigger itself is untouched, no duplicate):
--       - only an EMAIL signup may become an employer or be pre-onboarded, so a social
--         provider can never smuggle a role through its profile data;
--       - the display name also falls back to the provider's "name" / "user_name".
--  3. private.profiles_guard() is REPLACED so a person can set their account type exactly once,
--     only to student or employer, only while onboarded_at is null. Admin stays impossible.
--  4. public.complete_onboarding(role): the one server-called way to do that (one-time; refuses admins).
--     It runs as the caller (SECURITY INVOKER), so RLS and the guard above still apply to it.
--
-- Nothing is weakened: RLS policies are unchanged, nobody can become admin, and an onboarded
-- account's role can no longer change by any user action.

alter table public.profiles add column onboarded_at timestamptz;

-- Everyone who exists today registered through the email form and chose their type.
update public.profiles set onboarded_at = created_at where onboarded_at is null;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_email_signup boolean := coalesce(new.raw_app_meta_data ->> 'provider', '') = 'email';
  v_chosen       text    := new.raw_user_meta_data ->> 'role';
  v_role         public.user_role;
  v_name         text;
begin
  v_role := case when v_email_signup and v_chosen = 'employer'
                 then 'employer'::public.user_role else 'student'::public.user_role end;
  v_name := left(btrim(coalesce(
              nullif(new.raw_user_meta_data ->> 'full_name', ''),
              nullif(new.raw_user_meta_data ->> 'name', ''),
              nullif(new.raw_user_meta_data ->> 'user_name', ''), '')), 100);

  insert into public.profiles (id, role, full_name, onboarded_at)
  values (new.id, v_role, v_name,
          case when v_email_signup and v_chosen in ('student', 'employer') then now() end);
  -- Only people who already chose a type get their student/employer row now. A social-login user
  -- gets theirs from complete_onboarding(), so nobody is left with the wrong kind of row.
  if v_email_signup and v_chosen in ('student', 'employer') then
    if v_role = 'student' then
      insert into public.student_profiles (profile_id) values (new.id);
    else
      insert into public.employer_profiles (profile_id) values (new.id);
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.profiles_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not private.is_admin() then
    if new.id is distinct from old.id or new.is_suspended is distinct from old.is_suspended then
      raise exception 'You are not allowed to change role or suspension status' using errcode = '42501';
    end if;
    -- Once onboarded, the marker is frozen.
    if old.onboarded_at is not null and new.onboarded_at is distinct from old.onboarded_at then
      raise exception 'Onboarding is already complete' using errcode = '42501';
    end if;
    -- A role may change only as part of the one-time onboarding choice, and never to admin.
    if new.role is distinct from old.role
       and not (old.onboarded_at is null and new.onboarded_at is not null and new.role in ('student', 'employer')) then
      raise exception 'You are not allowed to change role or suspension status' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.complete_onboarding(p_role text)
returns public.user_role language plpgsql security invoker set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.profiles;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if p_role is null or p_role not in ('student', 'employer') then
    raise exception 'Choose student or employer' using errcode = '22023';
  end if;

  select * into v_row from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
  -- The choice is one-time. An onboarded account (or an admin, or a suspended account) is never changed here.
  if v_row.onboarded_at is not null then
    raise exception 'Account type is already chosen' using errcode = '42501';
  end if;
  if v_row.role = 'admin' or v_row.is_suspended then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  update public.profiles set role = p_role::public.user_role, onboarded_at = now() where id = v_uid;
  if p_role = 'student' then
    insert into public.student_profiles (profile_id) values (v_uid) on conflict do nothing;
  else
    insert into public.employer_profiles (profile_id) values (v_uid) on conflict do nothing;
  end if;
  return p_role::public.user_role;
end;
$$;

revoke all on function public.complete_onboarding(text) from public, anon;
grant execute on function public.complete_onboarding(text) to authenticated;
