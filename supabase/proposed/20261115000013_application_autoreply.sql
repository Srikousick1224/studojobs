-- StudoJob PROPOSED migration 013: employer auto-reply (needs migration 012 first).
-- NOT applied to any live database. Rollback: supabase/proposed/ROLLBACK_20261115000013_application_autoreply.sql
--
-- When a student applies, and the company owner switched "Send an auto-reply" on in Settings,
-- the student receives the owner's message as an in-app notification (type 'employer_message').
-- It runs as the database (security definer) because students may not read other people's settings.
-- The text is the owner's own, already limited to 500 characters; control characters are removed here too.

create or replace function private.applications_autoreply()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_company text;
  v_title text;
  v_on boolean;
  v_text text;
begin
  select c.owner_id, c.name, j.title into v_owner, v_company, v_title
  from public.jobs j join public.companies c on c.id = j.company_id where j.id = new.job_id;
  if v_owner is null then return null; end if;

  select coalesce((s.data #>> '{prefs,autoReply}')::boolean, false), s.data #>> '{prefs,autoReplyText}'
    into v_on, v_text
  from public.user_settings s where s.user_id = v_owner;

  v_text := left(btrim(regexp_replace(coalesce(v_text, ''), '[[:cntrl:]]', ' ', 'g')), 500);
  if coalesce(v_on, false) and v_text <> '' then
    insert into public.notifications (user_id, type, title, body, link)
    values (new.student_id, 'employer_message', left('Message from ' || v_company, 150), v_text, '/student/applications');
  end if;
  return null;
exception when others then
  return null; -- an auto-reply problem must never block an application
end;
$$;

create trigger applications_autoreply after insert on public.applications
  for each row execute function private.applications_autoreply();
