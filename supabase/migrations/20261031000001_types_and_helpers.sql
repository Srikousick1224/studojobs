-- StudoJob migration 001: enum types and tiny helper functions.
-- Safe to read top to bottom: nothing here touches data.

create type public.user_role           as enum ('student', 'employer', 'admin');
create type public.job_type            as enum ('job', 'internship', 'freelance');
create type public.work_mode           as enum ('remote', 'hybrid', 'onsite');
create type public.employment_type     as enum ('full_time', 'part_time', 'contract');
create type public.experience_level    as enum ('internship', 'entry', 'graduate', 'junior');
create type public.pay_period          as enum ('month', 'year', 'project');
create type public.job_status          as enum ('draft', 'pending_review', 'published', 'paused', 'closed', 'rejected');
create type public.application_status  as enum ('applied', 'under_review', 'shortlisted', 'interview_scheduled', 'selected', 'rejected', 'withdrawn');
create type public.verification_status as enum ('pending', 'approved', 'rejected');
create type public.report_status       as enum ('open', 'investigating', 'resolved', 'dismissed');
create type public.interview_mode      as enum ('video', 'phone', 'onsite');
create type public.interview_status    as enum ('scheduled', 'completed', 'cancelled');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.slugify(txt text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(lower(coalesce(txt, '')), '[^a-z0-9]+', '-', 'g'), '-');
$$;
