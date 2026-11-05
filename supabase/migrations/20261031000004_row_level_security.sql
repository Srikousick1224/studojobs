-- StudoJob migration 004: Row Level Security.
--
-- Rule of thumb: every table has RLS ON and nothing is allowed unless a policy says so.
-- `(select auth.uid())` is wrapped in a select so Postgres evaluates it once per query (faster).

alter table public.profiles              enable row level security;
alter table public.student_profiles      enable row level security;
alter table public.employer_profiles     enable row level security;
alter table public.companies             enable row level security;
alter table public.job_categories        enable row level security;
alter table public.jobs                  enable row level security;
alter table public.skills                enable row level security;
alter table public.student_skills        enable row level security;
alter table public.job_skills            enable row level security;
alter table public.resumes               enable row level security;
alter table public.applications          enable row level security;
alter table public.saved_jobs            enable row level security;
alter table public.interviews            enable row level security;
alter table public.notifications         enable row level security;
alter table public.company_verifications enable row level security;
alter table public.reports               enable row level security;

-- Defence in depth: logged-out visitors can only READ public catalogue tables.
revoke all on all tables in schema public from anon;
grant select on public.jobs, public.companies, public.job_categories, public.skills, public.job_skills to anon;
alter default privileges in schema public revoke all on tables from anon;

-- profiles ------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.is_admin() or private.employer_can_view_student(id));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_update_admin on public.profiles for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- student_profiles ----------------------------------------------------------
create policy student_profiles_select on public.student_profiles for select to authenticated
  using (profile_id = (select auth.uid()) or private.is_admin() or private.employer_can_view_student(profile_id));
create policy student_profiles_insert on public.student_profiles for insert to authenticated
  with check (profile_id = (select auth.uid()) and private.user_role() = 'student');
create policy student_profiles_update on public.student_profiles for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

-- employer_profiles ---------------------------------------------------------
create policy employer_profiles_select on public.employer_profiles for select to authenticated
  using (profile_id = (select auth.uid()) or private.is_admin());
create policy employer_profiles_insert on public.employer_profiles for insert to authenticated
  with check (profile_id = (select auth.uid()) and private.user_role() = 'employer');
create policy employer_profiles_update on public.employer_profiles for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()) and (company_id is null or private.owns_company(company_id)));

-- companies -----------------------------------------------------------------
create policy companies_select on public.companies for select to anon, authenticated
  using (
    verification_status = 'approved'
    or owner_id = (select auth.uid())
    or private.is_admin()
    or private.company_has_public_job(id)
  );
create policy companies_insert on public.companies for insert to authenticated
  with check (owner_id = (select auth.uid()) and private.user_role() = 'employer' and private.is_active_user());
create policy companies_update on public.companies for update to authenticated
  using (owner_id = (select auth.uid()) or private.is_admin())
  with check (owner_id = (select auth.uid()) or private.is_admin());
create policy companies_delete on public.companies for delete to authenticated
  using (owner_id = (select auth.uid()) or private.is_admin());

-- job_categories (reference data; only admins edit) --------------------------
create policy job_categories_select on public.job_categories for select to anon, authenticated using (true);
create policy job_categories_admin on public.job_categories for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- jobs ----------------------------------------------------------------------
create policy jobs_select on public.jobs for select to anon, authenticated
  using (
    (status = 'published' and (application_deadline is null or application_deadline > now()))
    or private.owns_company(company_id)
    or private.is_admin()
    or private.student_has_ties_to_job(id)
  );
create policy jobs_insert on public.jobs for insert to authenticated
  with check (private.owns_company(company_id) and private.user_role() = 'employer' and private.is_active_user());
create policy jobs_update on public.jobs for update to authenticated
  using (private.owns_company(company_id) or private.is_admin())
  with check (private.owns_company(company_id) or private.is_admin());
create policy jobs_delete on public.jobs for delete to authenticated
  using (private.owns_company(company_id) or private.is_admin());

-- skills --------------------------------------------------------------------
create policy skills_select on public.skills for select to anon, authenticated using (true);
create policy skills_insert on public.skills for insert to authenticated
  with check (private.is_active_user());
create policy skills_admin_update on public.skills for update to authenticated
  using (private.is_admin()) with check (private.is_admin());
create policy skills_admin_delete on public.skills for delete to authenticated
  using (private.is_admin());

create policy student_skills_select on public.student_skills for select to authenticated
  using (student_id = (select auth.uid()) or private.is_admin() or private.employer_can_view_student(student_id));
create policy student_skills_insert on public.student_skills for insert to authenticated
  with check (student_id = (select auth.uid()));
create policy student_skills_delete on public.student_skills for delete to authenticated
  using (student_id = (select auth.uid()));

create policy job_skills_select on public.job_skills for select to anon, authenticated
  using (private.job_is_public(job_id) or private.owns_job(job_id) or private.is_admin());
create policy job_skills_insert on public.job_skills for insert to authenticated
  with check (private.owns_job(job_id));
create policy job_skills_delete on public.job_skills for delete to authenticated
  using (private.owns_job(job_id));

-- resumes -------------------------------------------------------------------
create policy resumes_select on public.resumes for select to authenticated
  using (student_id = (select auth.uid()) or private.employer_can_read_resume(id));
create policy resumes_insert on public.resumes for insert to authenticated
  with check (student_id = (select auth.uid()) and private.user_role() = 'student');
create policy resumes_update on public.resumes for update to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy resumes_delete on public.resumes for delete to authenticated
  using (student_id = (select auth.uid()));

-- applications --------------------------------------------------------------
create policy applications_select on public.applications for select to authenticated
  using (student_id = (select auth.uid()) or private.owns_job(job_id) or private.is_admin());
create policy applications_insert on public.applications for insert to authenticated
  with check (student_id = (select auth.uid()));
create policy applications_update on public.applications for update to authenticated
  using (student_id = (select auth.uid()) or private.owns_job(job_id) or private.is_admin())
  with check (student_id = (select auth.uid()) or private.owns_job(job_id) or private.is_admin());

-- saved_jobs ----------------------------------------------------------------
create policy saved_jobs_select on public.saved_jobs for select to authenticated
  using (student_id = (select auth.uid()));
create policy saved_jobs_insert on public.saved_jobs for insert to authenticated
  with check (student_id = (select auth.uid()) and private.job_is_public(job_id));
create policy saved_jobs_delete on public.saved_jobs for delete to authenticated
  using (student_id = (select auth.uid()));

-- interviews ----------------------------------------------------------------
create policy interviews_select on public.interviews for select to authenticated
  using (
    scheduled_by = (select auth.uid())
    or private.student_in_application(application_id)
    or private.owns_application_job(application_id)
    or private.is_admin()
  );
create policy interviews_insert on public.interviews for insert to authenticated
  with check (private.owns_application_job(application_id) and scheduled_by = (select auth.uid()));
create policy interviews_update on public.interviews for update to authenticated
  using (private.owns_application_job(application_id)) with check (private.owns_application_job(application_id));
create policy interviews_delete on public.interviews for delete to authenticated
  using (private.owns_application_job(application_id));

-- notifications (created only by database triggers) --------------------------
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- company_verifications -----------------------------------------------------
create policy verifications_select on public.company_verifications for select to authenticated
  using (private.owns_company(company_id) or private.is_admin());
create policy verifications_insert on public.company_verifications for insert to authenticated
  with check (private.owns_company(company_id) and submitted_by = (select auth.uid()));
create policy verifications_update on public.company_verifications for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- reports -------------------------------------------------------------------
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or private.is_admin());
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and private.is_active_user());
create policy reports_update on public.reports for update to authenticated
  using (private.is_admin()) with check (private.is_admin());
