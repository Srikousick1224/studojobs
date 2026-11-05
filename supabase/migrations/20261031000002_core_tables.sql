-- StudoJob migration 002: the 16 core tables, constraints and indexes.
-- Row Level Security is switched on in migration 004.

-- 1. profiles: one row per auth user. `role` can NEVER be changed by the user.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         public.user_role not null default 'student',
  full_name    text not null default '' check (char_length(full_name) <= 100),
  avatar_url   text check (avatar_url is null or avatar_url ~* '^https?://'),
  phone        text check (phone is null or phone ~ '^[0-9+()\- ]{7,20}$'),
  is_suspended boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 2. student_profiles. Education / projects / certifications are small lists owned
--    by the student, so they live as validated JSON arrays instead of 3 extra tables.
create table public.student_profiles (
  profile_id          uuid primary key references public.profiles (id) on delete cascade,
  headline            text check (char_length(headline) <= 120),
  bio                 text check (char_length(bio) <= 1500),
  college             text check (char_length(college) <= 150),
  degree              text check (char_length(degree) <= 150),
  graduation_year     smallint check (graduation_year between 2000 and 2100),
  location            text check (char_length(location) <= 100),
  education           jsonb not null default '[]'::jsonb
                        check (jsonb_typeof(education) = 'array' and jsonb_array_length(education) <= 10),
  projects            jsonb not null default '[]'::jsonb
                        check (jsonb_typeof(projects) = 'array' and jsonb_array_length(projects) <= 20),
  certifications      jsonb not null default '[]'::jsonb
                        check (jsonb_typeof(certifications) = 'array' and jsonb_array_length(certifications) <= 20),
  preferred_locations text[] not null default '{}' check (cardinality(preferred_locations) <= 10),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 4. companies (created before employer_profiles because that table points at it)
create table public.companies (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null unique references public.profiles (id) on delete cascade,
  name                text not null check (char_length(name) between 2 and 120),
  slug                text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  website             text check (website is null or website ~* '^https?://'),
  logo_path           text,
  industry            text check (char_length(industry) <= 80),
  size_range          text check (size_range in ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')),
  location            text check (char_length(location) <= 100),
  about               text check (char_length(about) <= 2000),
  verification_status public.verification_status not null default 'pending',
  verified_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index companies_verification_idx on public.companies (verification_status);

-- 3. employer_profiles
create table public.employer_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  job_title  text check (char_length(job_title) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index employer_profiles_company_idx on public.employer_profiles (company_id);

-- 6. job_categories (reference data)
create table public.job_categories (
  id         smallint generated always as identity primary key,
  name       text not null unique check (char_length(name) between 2 and 60),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

-- 5. jobs (jobs, internships and freelance work share one table, split by `type`)
create table public.jobs (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies (id) on delete cascade,
  category_id          smallint references public.job_categories (id) on delete set null,
  created_by           uuid not null references public.profiles (id) on delete restrict,
  title                text not null check (char_length(title) between 5 and 150),
  summary              text not null check (char_length(summary) between 20 and 600),
  responsibilities     text[] not null default '{}' check (cardinality(responsibilities) <= 20),
  requirements         text[] not null default '{}' check (cardinality(requirements) <= 20),
  perks                text[] not null default '{}' check (cardinality(perks) <= 20),
  type                 public.job_type not null,
  work_mode            public.work_mode not null,
  employment           public.employment_type not null,
  level                public.experience_level not null,
  location             text not null check (char_length(location) between 2 and 100),
  is_paid              boolean not null,
  pay_min              numeric(12, 2),
  pay_max              numeric(12, 2),
  pay_period           public.pay_period,
  pay_currency         char(3) not null default 'INR' check (pay_currency ~ '^[A-Z]{3}$'),
  status               public.job_status not null default 'draft',
  application_deadline timestamptz,
  published_at         timestamptz,
  closed_at            timestamptz,
  moderation_note      text check (char_length(moderation_note) <= 1000),
  search               tsvector generated always as
                         (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, ''))) stored,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- Pay must be clearly disclosed: paid roles state a range, unpaid roles state none.
  constraint jobs_pay_disclosure check (
    (is_paid and pay_min is not null and pay_max is not null and pay_min > 0 and pay_max >= pay_min and pay_period is not null)
    or (not is_paid and pay_min is null and pay_max is null and pay_period is null)
  )
);
create index jobs_company_idx          on public.jobs (company_id);
create index jobs_created_by_idx       on public.jobs (created_by);
create index jobs_category_idx         on public.jobs (category_id);
create index jobs_listing_idx          on public.jobs (status, published_at desc);
create index jobs_type_mode_idx        on public.jobs (type, work_mode) where status = 'published';
create index jobs_search_idx           on public.jobs using gin (search);

-- 10. skills (+ 11. student_skills, 12. job_skills)
create table public.skills (
  id         bigint generated always as identity primary key,
  name       text not null check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now()
);
create unique index skills_name_unique on public.skills (lower(btrim(name)));

create table public.student_skills (
  student_id uuid not null references public.student_profiles (profile_id) on delete cascade,
  skill_id   bigint not null references public.skills (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, skill_id)
);
create index student_skills_skill_idx on public.student_skills (skill_id);

create table public.job_skills (
  job_id   uuid not null references public.jobs (id) on delete cascade,
  skill_id bigint not null references public.skills (id) on delete cascade,
  primary key (job_id, skill_id)
);
create index job_skills_skill_idx on public.job_skills (skill_id);

-- 9. resumes (metadata only; the file itself lives in the private `resumes` storage bucket)
create table public.resumes (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles (id) on delete cascade,
  label        text not null check (char_length(btrim(label)) between 1 and 80),
  storage_path text not null unique,
  file_name    text not null check (char_length(file_name) <= 200),
  mime_type    text not null check (mime_type in (
                 'application/pdf',
                 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes   integer not null check (size_bytes between 1 and 5242880),
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index resumes_student_idx on public.resumes (student_id);
create unique index resumes_one_default_per_student on public.resumes (student_id) where is_default;

-- 7. applications. unique (job_id, student_id) is what prevents duplicate applications.
create table public.applications (
  id                uuid primary key default gen_random_uuid(),
  job_id            uuid not null references public.jobs (id) on delete cascade,
  student_id        uuid not null references public.profiles (id) on delete cascade,
  resume_id         uuid references public.resumes (id) on delete set null,
  cover_note        text check (char_length(cover_note) <= 2000),
  status            public.application_status not null default 'applied',
  applied_at        timestamptz not null default now(),
  status_updated_at timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint applications_one_per_student_per_job unique (job_id, student_id)
);
create index applications_student_idx on public.applications (student_id, status);
create index applications_job_idx     on public.applications (job_id, status);
create index applications_resume_idx  on public.applications (resume_id);

-- 8. saved_jobs
create table public.saved_jobs (
  student_id uuid not null references public.profiles (id) on delete cascade,
  job_id     uuid not null references public.jobs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, job_id)
);
create index saved_jobs_job_idx on public.saved_jobs (job_id);

-- 13. interviews
create table public.interviews (
  id               uuid primary key default gen_random_uuid(),
  application_id   uuid not null references public.applications (id) on delete cascade,
  scheduled_by     uuid not null references public.profiles (id) on delete restrict,
  scheduled_at     timestamptz not null,
  duration_minutes smallint not null default 30 check (duration_minutes between 10 and 240),
  mode             public.interview_mode not null,
  meeting_link     text check (meeting_link is null or meeting_link ~* '^https://'),
  location         text check (char_length(location) <= 200),
  notes            text check (char_length(notes) <= 1000),
  status           public.interview_status not null default 'scheduled',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index interviews_application_idx on public.interviews (application_id);
create index interviews_scheduled_by_idx on public.interviews (scheduled_by);

-- 14. notifications
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null check (char_length(type) <= 40),
  title      text not null check (char_length(title) <= 150),
  body       text check (char_length(body) <= 500),
  link       text check (link is null or link ~ '^/'),
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

-- 15. company_verifications
create table public.company_verifications (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies (id) on delete cascade,
  submitted_by        uuid not null references public.profiles (id) on delete restrict,
  business_email      text not null check (business_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  registration_number text check (char_length(registration_number) <= 60),
  document_path       text,
  notes               text check (char_length(notes) <= 1000),
  status              public.verification_status not null default 'pending',
  reviewed_by         uuid references public.profiles (id) on delete set null,
  reviewed_at         timestamptz,
  review_notes        text check (char_length(review_notes) <= 1000),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index company_verifications_company_idx on public.company_verifications (company_id);
create index company_verifications_status_idx  on public.company_verifications (status);
create index company_verifications_submitter_idx on public.company_verifications (submitted_by);
create index company_verifications_reviewer_idx on public.company_verifications (reviewed_by);

-- 16. reports (scam / abuse reports on listings or companies)
create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid not null references public.profiles (id) on delete cascade,
  job_id          uuid references public.jobs (id) on delete set null,
  company_id      uuid references public.companies (id) on delete set null,
  reason          text not null check (reason in (
                    'asks_for_money', 'fake_company', 'misleading_details',
                    'sensitive_documents', 'abusive_content', 'other')),
  details         text not null check (char_length(btrim(details)) between 20 and 2000),
  status          public.report_status not null default 'open',
  resolved_by     uuid references public.profiles (id) on delete set null,
  resolution_note text check (char_length(resolution_note) <= 1000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint reports_has_target check (job_id is not null or company_id is not null),
  constraint reports_one_per_reporter_job unique (reporter_id, job_id)
);
create index reports_status_idx   on public.reports (status, created_at desc);
create index reports_job_idx      on public.reports (job_id);
create index reports_company_idx  on public.reports (company_id);
create index reports_resolver_idx on public.reports (resolved_by);
