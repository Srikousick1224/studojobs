-- StudoJob migration 003: helper functions + triggers.
--
-- WHY THIS EXISTS: Row Level Security decides WHICH ROWS a user may touch, but it cannot
-- limit WHICH COLUMNS or WHICH STATUS CHANGES. These triggers close that gap, so even a
-- hacker who skips our website and talks to the database directly cannot, for example,
-- make themselves an admin or mark their own company as "verified".
--
-- Helper functions live in the `private` schema, which the Supabase API does not expose.

create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Helper functions used by RLS policies (SECURITY DEFINER avoids recursive RLS)
-- ---------------------------------------------------------------------------

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and not p.is_suspended
  );
$$;

create or replace function private.is_active_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and not p.is_suspended);
$$;

create or replace function private.user_role()
returns public.user_role language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function private.owns_company(p_company uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.companies c where c.id = p_company and c.owner_id = (select auth.uid()));
$$;

create or replace function private.owns_job(p_job uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jobs j join public.companies c on c.id = j.company_id
    where j.id = p_job and c.owner_id = (select auth.uid())
  );
$$;

create or replace function private.owns_application_job(p_application uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.applications a
    join public.jobs j on j.id = a.job_id
    join public.companies c on c.id = j.company_id
    where a.id = p_application and c.owner_id = (select auth.uid())
  );
$$;

create or replace function private.student_in_application(p_application uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.applications a where a.id = p_application and a.student_id = (select auth.uid()));
$$;

create or replace function private.job_is_public(p_job uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jobs j
    where j.id = p_job and j.status = 'published'
      and (j.application_deadline is null or j.application_deadline > now())
  );
$$;

create or replace function private.company_has_public_job(p_company uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jobs j
    where j.company_id = p_company and j.status = 'published'
      and (j.application_deadline is null or j.application_deadline > now())
  );
$$;

create or replace function private.student_has_ties_to_job(p_job uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.applications a where a.job_id = p_job and a.student_id = (select auth.uid()))
      or exists (select 1 from public.saved_jobs s where s.job_id = p_job and s.student_id = (select auth.uid()));
$$;

-- An employer may see a student's profile ONLY after that student applied to one of the employer's jobs.
create or replace function private.employer_can_view_student(p_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.applications a
    join public.jobs j on j.id = a.job_id
    join public.companies c on c.id = j.company_id
    where a.student_id = p_student and c.owner_id = (select auth.uid())
  );
$$;

-- ...and may read a resume ONLY if the student attached that exact resume to an application to the employer's job.
create or replace function private.employer_can_read_resume(p_resume uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.applications a
    join public.jobs j on j.id = a.job_id
    join public.companies c on c.id = j.company_id
    where a.resume_id = p_resume and c.owner_id = (select auth.uid())
  );
$$;

create or replace function private.employer_can_read_resume_path(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.resumes r
    join public.applications a on a.resume_id = r.id
    join public.jobs j on j.id = a.job_id
    join public.companies c on c.id = j.company_id
    where r.storage_path = p_path and c.owner_id = (select auth.uid())
  );
$$;

create or replace function private.owns_company_folder(p_folder text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.companies c where c.id::text = p_folder and c.owner_id = (select auth.uid()));
$$;

-- ---------------------------------------------------------------------------
-- New user -> profile. The role comes from signup metadata, which the USER controls,
-- so we only ever accept 'employer'; everything else (including 'admin') becomes 'student'.
-- Admins are created ONLY by an operator running SQL (see README).
-- ---------------------------------------------------------------------------

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role public.user_role;
  v_name text;
begin
  v_role := case when new.raw_user_meta_data ->> 'role' = 'employer'
                 then 'employer'::public.user_role else 'student'::public.user_role end;
  v_name := left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 100);

  insert into public.profiles (id, role, full_name) values (new.id, v_role, v_name);
  if v_role = 'student' then
    insert into public.student_profiles (profile_id) values (new.id);
  else
    insert into public.employer_profiles (profile_id) values (new.id);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- profiles: nobody but an admin may change role or suspension
-- ---------------------------------------------------------------------------

create or replace function private.profiles_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not private.is_admin() then
    if new.id is distinct from old.id
       or new.role is distinct from old.role
       or new.is_suspended is distinct from old.is_suspended then
      raise exception 'You are not allowed to change role or suspension status' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger profiles_guard before update on public.profiles
  for each row execute function private.profiles_guard();

-- ---------------------------------------------------------------------------
-- companies: owners cannot verify themselves; renaming resets verification
-- ---------------------------------------------------------------------------

create or replace function private.unique_company_slug(p_name text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_base text := public.slugify(p_name);
  v_slug text;
  v_i int := 1;
begin
  if v_base = '' then v_base := 'company'; end if;
  v_slug := v_base;
  while exists (select 1 from public.companies where slug = v_slug) loop
    v_i := v_i + 1;
    v_slug := v_base || '-' || v_i;
  end loop;
  return v_slug;
end;
$$;

create or replace function private.companies_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_priv boolean := (select auth.uid()) is null or private.is_admin();
begin
  if tg_op = 'INSERT' then
    if not v_priv then
      new.verification_status := 'pending';
      new.verified_at := null;
    end if;
    if new.slug is null or new.slug = '' then
      new.slug := private.unique_company_slug(new.name);
    end if;
  else
    new.slug := old.slug; -- slugs are permanent so links never break
    if not v_priv then
      if new.owner_id is distinct from old.owner_id
         or new.verification_status is distinct from old.verification_status
         or new.verified_at is distinct from old.verified_at then
        raise exception 'Only a moderator can change verification' using errcode = '42501';
      end if;
      -- Changing the identity of an approved company requires a fresh review (stops "rename after approval" fraud).
      if old.verification_status = 'approved'
         and (new.name is distinct from old.name or new.website is distinct from old.website) then
        new.verification_status := 'pending';
        new.verified_at := null;
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger companies_guard before insert or update on public.companies
  for each row execute function private.companies_guard();

create or replace function private.companies_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.employer_profiles set company_id = new.id where profile_id = new.owner_id;
  return new;
end;
$$;
create trigger companies_after_insert after insert on public.companies
  for each row execute function private.companies_after_insert();

-- ---------------------------------------------------------------------------
-- company_verifications: only admins decide; the decision flows to the company
-- ---------------------------------------------------------------------------

create or replace function private.verifications_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null then new.submitted_by := (select auth.uid()); end if;
    if (select auth.uid()) is not null and not private.is_admin() then
      new.status := 'pending'; new.reviewed_by := null; new.reviewed_at := null; new.review_notes := null;
    end if;
  else
    if new.company_id is distinct from old.company_id or new.submitted_by is distinct from old.submitted_by then
      raise exception 'Verification ownership cannot change' using errcode = '42501';
    end if;
    if new.status is distinct from old.status and new.status <> 'pending' then
      new.reviewed_by := coalesce((select auth.uid()), new.reviewed_by);
      new.reviewed_at := now();
    end if;
  end if;
  return new;
end;
$$;
create trigger verifications_guard before insert or update on public.company_verifications
  for each row execute function private.verifications_guard();

create unique index company_verifications_one_pending
  on public.company_verifications (company_id) where status = 'pending';

create or replace function private.verifications_after_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    update public.companies
       set verification_status = new.status,
           verified_at = case when new.status = 'approved' then now() else null end
     where id = new.company_id
    returning owner_id into v_owner;

    insert into public.notifications (user_id, type, title, body, link)
    values (
      v_owner,
      'company_' || new.status,
      case when new.status = 'approved' then 'Your company is verified' else 'Verification was not approved' end,
      case when new.status = 'approved'
           then 'Your listings can now be published straight away.'
           else coalesce(nullif(new.review_notes, ''), 'Please review the feedback and submit again.') end,
      '/employer'
    );
  end if;
  return new;
end;
$$;
create trigger verifications_after_update after update on public.company_verifications
  for each row execute function private.verifications_after_update();

-- ---------------------------------------------------------------------------
-- jobs: status rules. Employers cannot reject, and only verified companies publish instantly.
-- ---------------------------------------------------------------------------

create or replace function private.jobs_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_priv boolean := (select auth.uid()) is null or private.is_admin();
  v_approved boolean;
begin
  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null then new.created_by := (select auth.uid()); end if;
    new.published_at := null;
    new.closed_at := null;
    if not v_priv then new.moderation_note := null; end if;
    if new.application_deadline is not null and new.application_deadline <= now() then
      raise exception 'The application deadline must be in the future' using errcode = '23514';
    end if;
    if not v_priv and (
         select count(*) from public.jobs j
         where j.created_by = new.created_by and j.created_at > now() - interval '1 day') >= 30 then
      raise exception 'Daily listing limit reached. Please try again tomorrow.' using errcode = 'P0001';
    end if;
  else
    if not v_priv then
      if new.company_id is distinct from old.company_id or new.created_by is distinct from old.created_by then
        raise exception 'A listing cannot move to another company' using errcode = '42501';
      end if;
      new.moderation_note := old.moderation_note;
    end if;
    new.published_at := old.published_at;
    new.closed_at := old.closed_at;
  end if;

  if not v_priv then
    if new.status = 'rejected' then
      raise exception 'Only a moderator can reject a listing' using errcode = '42501';
    end if;
    if new.status = 'published' then
      select c.verification_status = 'approved' into v_approved from public.companies c where c.id = new.company_id;
      if not coalesce(v_approved, false) or (tg_op = 'UPDATE' and old.status = 'rejected') then
        new.status := 'pending_review'; -- goes to the moderation queue instead
      end if;
    end if;
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := coalesce(new.published_at, now());
  end if;
  if new.status = 'closed' and (tg_op = 'INSERT' or old.status is distinct from 'closed') then
    new.closed_at := now();
  elsif new.status <> 'closed' then
    new.closed_at := null;
  end if;
  return new;
end;
$$;
create trigger jobs_guard before insert or update on public.jobs
  for each row execute function private.jobs_guard();

-- ---------------------------------------------------------------------------
-- applications: the whole workflow is enforced here
-- ---------------------------------------------------------------------------

create or replace function private.applications_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_job public.jobs%rowtype;
  v_role public.user_role;
  v_susp boolean;
begin
  if tg_op = 'INSERT' then
    if v_uid is not null and new.student_id <> v_uid then
      raise exception 'You can only apply as yourself' using errcode = '42501';
    end if;
    select p.role, p.is_suspended into v_role, v_susp from public.profiles p where p.id = new.student_id;
    if v_role is distinct from 'student' then
      raise exception 'Only student accounts can apply' using errcode = '42501';
    end if;
    if v_susp then raise exception 'This account is suspended' using errcode = '42501'; end if;

    select * into v_job from public.jobs j where j.id = new.job_id;
    if not found or v_job.status <> 'published' then
      raise exception 'This listing is not accepting applications' using errcode = 'P0001';
    end if;
    if v_job.application_deadline is not null and v_job.application_deadline <= now() then
      raise exception 'The application deadline has passed' using errcode = 'P0001';
    end if;
    if new.resume_id is not null and not exists (
         select 1 from public.resumes r where r.id = new.resume_id and r.student_id = new.student_id) then
      raise exception 'That resume does not belong to you' using errcode = '42501';
    end if;
    if (select count(*) from public.applications a
        where a.student_id = new.student_id and a.created_at > now() - interval '1 day') >= 50 then
      raise exception 'Daily application limit reached' using errcode = 'P0001';
    end if;
    new.status := 'applied';
    new.applied_at := now();
    new.status_updated_at := now();
    return new;
  end if;

  -- UPDATE: identity fields never change (resume_id may only become NULL when a resume is deleted)
  if new.job_id is distinct from old.job_id
     or new.student_id is distinct from old.student_id
     or new.applied_at is distinct from old.applied_at
     or new.cover_note is distinct from old.cover_note
     or (new.resume_id is distinct from old.resume_id and new.resume_id is not null) then
    raise exception 'Application details cannot be edited' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if v_uid is null or private.is_admin() then
      null; -- operators may do anything
    elsif v_uid = old.student_id then
      if not (new.status = 'withdrawn'
              and old.status in ('applied', 'under_review', 'shortlisted', 'interview_scheduled')) then
        raise exception 'Students can only withdraw an active application' using errcode = '42501';
      end if;
    elsif private.owns_job(old.job_id) then
      if old.status = 'withdrawn' or new.status in ('applied', 'withdrawn') then
        raise exception 'That status change is not allowed' using errcode = '42501';
      end if;
    else
      raise exception 'Not allowed' using errcode = '42501';
    end if;
    new.status_updated_at := now();
  end if;
  return new;
end;
$$;
create trigger applications_guard before insert or update on public.applications
  for each row execute function private.applications_guard();

create or replace function private.applications_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_title text;
begin
  select c.owner_id, j.title into v_owner, v_title
  from public.jobs j join public.companies c on c.id = j.company_id where j.id = new.job_id;

  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, title, body, link) values
      (v_owner, 'application_received', 'New application', 'A student applied for "' || v_title || '".', '/employer/applicants'),
      (new.student_id, 'application_submitted', 'Application submitted', 'Your application for "' || v_title || '" was sent.', '/student/applications');
  elsif new.status is distinct from old.status then
    if new.status = 'withdrawn' then
      insert into public.notifications (user_id, type, title, body, link)
      values (v_owner, 'application_withdrawn', 'Application withdrawn', 'A candidate withdrew from "' || v_title || '".', '/employer/applicants');
    elsif new.status in ('under_review', 'shortlisted', 'selected', 'rejected') then
      insert into public.notifications (user_id, type, title, body, link)
      values (
        new.student_id,
        'application_' || new.status,
        case new.status
          when 'under_review' then 'Your application is being reviewed'
          when 'shortlisted'  then 'You have been shortlisted'
          when 'selected'     then 'Congratulations, you were selected'
          else 'Update on your application' end,
        'Role: "' || v_title || '".',
        '/student/applications');
    end if;
  end if;
  return null;
end;
$$;
create trigger applications_notify after insert or update on public.applications
  for each row execute function private.applications_notify();

-- ---------------------------------------------------------------------------
-- interviews
-- ---------------------------------------------------------------------------

create or replace function private.interviews_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_status public.application_status;
begin
  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null then new.scheduled_by := (select auth.uid()); end if;
    if new.scheduled_at <= now() then
      raise exception 'Interviews must be scheduled in the future' using errcode = '23514';
    end if;
    select a.status into v_status from public.applications a where a.id = new.application_id;
    if v_status is null or v_status in ('rejected', 'withdrawn', 'selected') then
      raise exception 'This application can no longer be scheduled' using errcode = 'P0001';
    end if;
    if new.mode = 'video' and new.meeting_link is null then
      raise exception 'A meeting link is required for video interviews' using errcode = '23514';
    end if;
    if new.mode = 'onsite' and (new.location is null or btrim(new.location) = '') then
      raise exception 'A location is required for on-site interviews' using errcode = '23514';
    end if;
  else
    if new.application_id is distinct from old.application_id or new.scheduled_by is distinct from old.scheduled_by then
      raise exception 'Interview ownership cannot change' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger interviews_guard before insert or update on public.interviews
  for each row execute function private.interviews_guard();

create or replace function private.interviews_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid;
  v_title text;
begin
  update public.applications set status = 'interview_scheduled'
   where id = new.application_id and status <> 'interview_scheduled'
  returning student_id into v_student;

  select a.student_id, j.title into v_student, v_title
  from public.applications a join public.jobs j on j.id = a.job_id where a.id = new.application_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (v_student, 'interview_scheduled', 'Interview scheduled',
          'For "' || v_title || '" on ' || to_char(new.scheduled_at at time zone 'UTC', 'DD Mon YYYY HH24:MI') || ' UTC.',
          '/student/applications');
  return null;
end;
$$;
create trigger interviews_after_insert after insert on public.interviews
  for each row execute function private.interviews_after_insert();

-- ---------------------------------------------------------------------------
-- resumes, reports, notifications, skills
-- ---------------------------------------------------------------------------

create or replace function private.resumes_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null then new.student_id := (select auth.uid()); end if;
    if new.storage_path not like new.student_id::text || '/%' then
      raise exception 'Resume must be stored in your own folder' using errcode = '42501';
    end if;
    if not exists (select 1 from public.resumes r where r.student_id = new.student_id) then
      new.is_default := true; -- first resume becomes the default
    end if;
  else
    if new.storage_path is distinct from old.storage_path
       or new.student_id is distinct from old.student_id
       or new.file_name is distinct from old.file_name
       or new.size_bytes is distinct from old.size_bytes
       or new.mime_type is distinct from old.mime_type then
      raise exception 'Only the label and default flag can be changed' using errcode = '42501';
    end if;
  end if;
  if new.is_default then
    update public.resumes set is_default = false where student_id = new.student_id and id <> new.id and is_default;
  end if;
  return new;
end;
$$;
create trigger resumes_guard before insert or update on public.resumes
  for each row execute function private.resumes_guard();

create or replace function private.reports_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null then new.reporter_id := (select auth.uid()); end if;
    new.status := 'open'; new.resolved_by := null; new.resolution_note := null;
    if (select count(*) from public.reports r
        where r.reporter_id = new.reporter_id and r.created_at > now() - interval '1 day') >= 10 then
      raise exception 'Daily report limit reached' using errcode = 'P0001';
    end if;
  else
    if new.reporter_id is distinct from old.reporter_id
       or new.job_id is distinct from old.job_id
       or new.company_id is distinct from old.company_id
       or new.details is distinct from old.details then
      raise exception 'Report content cannot be edited' using errcode = '42501';
    end if;
    if new.status is distinct from old.status and new.status in ('resolved', 'dismissed') then
      new.resolved_by := coalesce((select auth.uid()), new.resolved_by);
    end if;
  end if;
  return new;
end;
$$;
create trigger reports_guard before insert or update on public.reports
  for each row execute function private.reports_guard();

create or replace function private.notifications_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and (
       new.user_id is distinct from old.user_id or new.type is distinct from old.type
       or new.title is distinct from old.title or new.body is distinct from old.body
       or new.link is distinct from old.link or new.created_at is distinct from old.created_at) then
    raise exception 'Only the read flag can be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger notifications_guard before update on public.notifications
  for each row execute function private.notifications_guard();

create or replace function private.skills_normalize()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.name := btrim(regexp_replace(new.name, '\s+', ' ', 'g'));
  return new;
end;
$$;
create trigger skills_normalize before insert or update on public.skills
  for each row execute function private.skills_normalize();

-- Generic "no more than N rows per owner" guard (stops a single account from flooding a table).
create or replace function private.enforce_row_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_col text := tg_argv[0];
  v_max int := tg_argv[1]::int;
  v_owner text := to_jsonb(new) ->> tg_argv[0];
  v_count int;
begin
  execute format('select count(*) from %I.%I where %I::text = $1', tg_table_schema, tg_table_name, v_col)
    into v_count using v_owner;
  if v_count >= v_max then
    raise exception 'Limit reached: at most % items are allowed', v_max using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger resumes_limit        before insert on public.resumes        for each row execute function private.enforce_row_limit('student_id', '5');
create trigger student_skills_limit before insert on public.student_skills for each row execute function private.enforce_row_limit('student_id', '30');
create trigger saved_jobs_limit     before insert on public.saved_jobs     for each row execute function private.enforce_row_limit('student_id', '500');
create trigger job_skills_limit     before insert on public.job_skills     for each row execute function private.enforce_row_limit('job_id', '15');

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create trigger profiles_updated_at              before update on public.profiles              for each row execute function public.set_updated_at();
create trigger student_profiles_updated_at      before update on public.student_profiles      for each row execute function public.set_updated_at();
create trigger employer_profiles_updated_at     before update on public.employer_profiles     for each row execute function public.set_updated_at();
create trigger companies_updated_at             before update on public.companies             for each row execute function public.set_updated_at();
create trigger jobs_updated_at                  before update on public.jobs                  for each row execute function public.set_updated_at();
create trigger resumes_updated_at               before update on public.resumes               for each row execute function public.set_updated_at();
create trigger applications_updated_at          before update on public.applications          for each row execute function public.set_updated_at();
create trigger interviews_updated_at            before update on public.interviews            for each row execute function public.set_updated_at();
create trigger company_verifications_updated_at before update on public.company_verifications for each row execute function public.set_updated_at();
create trigger reports_updated_at               before update on public.reports               for each row execute function public.set_updated_at();
