-- PROPOSED MIGRATION 20261105000009 (E2.1, v5 CANDIDATE: v4 plus audit fixes). NOT APPLIED. Requires founder approval and a staging run first.
-- v5 changes vs v4: created_at is server-owned; a moderator's rejection is remembered per company (private.company_rejections)
-- and blocks the verified-company fast path; suspended accounts cannot edit listings or skills; the verified check
-- takes a share lock on INSERT.
-- Supersedes the earlier v2 and v3 drafts (neither was ever applied).
--
-- OBJECTS CHANGED (in order):
--   1. public.jobs                            ADD COLUMN content_version
--   2. private.job_approvals                  NEW TABLE: one row per approved content version (no client access)
--   3. private.jobs_guard()                   REPLACED: versioning, approval checks, operator rules
--   4. private.job_skills_guard()             NEW FUNCTION + NEW TRIGGER job_skills_guard on public.job_skills
--   5. private.companies_guard()              REPLACED: logo_path added to the identity fields
--   6. private.companies_identity_changed()   NEW FUNCTION + NEW TRIGGER companies_identity_changed on public.companies
--   7. public.approve_job(uuid, integer)      NEW FUNCTION: the only route for an admin to publish after review
--   8. public.skills, policy skills_insert    REPLACED: only admins may create catalogue skills
--
-- Not changed: every other table, every other RLS policy, applications_guard, the unique constraints,
-- the existing triggers (jobs_updated_at, job_skills_limit, companies_updated_at, and so on).

-- 1. Content version on each listing -----------------------------------------
-- Goes up by one on every material change. Clients cannot set it: the guard below overwrites it.
alter table public.jobs
  add column if not exists content_version integer not null default 1 check (content_version >= 1);

-- 2. Approval records ----------------------------------------------------------
-- One row = "moderators (or the verified-company rule) approved exactly this content version".
-- Lives in the private schema, which the API does not expose. RLS is on with NO policies and every
-- client grant is revoked, so no client role can read, insert, update or delete a row.
-- Only SECURITY DEFINER functions owned by the migration owner write here.
create table if not exists private.job_approvals (
  job_id          uuid        not null references public.jobs (id) on delete cascade deferrable initially deferred,
  content_version integer     not null check (content_version >= 1),
  approved_by     uuid        references public.profiles (id) on delete set null,
  approval_source text        not null check (approval_source in ('admin_review', 'verified_first_publish')),
  approved_at     timestamptz not null default now(),
  primary key (job_id, content_version)
);
alter table private.job_approvals enable row level security;
revoke all on private.job_approvals from public, anon, authenticated;

-- 2b. Company rejection memory (v5) -------------------------------------------
-- An admin rejection is remembered per company. Deleting the rejected listing and creating it again must not
-- skip review through the verified-company fast path. No client access: RLS on, no policies, grants revoked.
create table if not exists private.company_rejections (
  company_id  uuid        primary key references public.companies (id) on delete cascade,
  rejected_at timestamptz not null default now()
);
alter table private.company_rejections enable row level security;
revoke all on private.company_rejections from public, anon, authenticated;
-- Backfill: companies that already have a rejected listing lose the fast path (see the audit note).
insert into private.company_rejections (company_id)
select distinct j.company_id from public.jobs j where j.status = 'rejected'
on conflict (company_id) do nothing;

-- 3. Guard trigger on public.jobs (replaces the migration 003 version) ---------
create or replace function private.jobs_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_priv     boolean := (select auth.uid()) is null or private.is_admin();
  v_touch    boolean := coalesce(current_setting('studojob.content_touch', true), '') = 'on';
  v_material boolean := false;
  v_bump     boolean := false;
  v_approved boolean := false;
  v_verified boolean := false;
begin
  -- v5: a suspended account cannot create or change listings (the RLS update policy does not check this).
  if not v_priv and coalesce((select p.is_suspended from public.profiles p where p.id = (select auth.uid())), false) then
    raise exception 'Your account is suspended' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null then new.created_by := (select auth.uid()); end if;
    new.published_at := null;
    new.closed_at := null;
    new.content_version := 1;
    new.created_at := now();  -- v5: the daily-listing count relies on this being server-owned
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
    -- Clients can never set the version. Only the rules below change it.
    new.content_version := old.content_version;
    new.created_at := old.created_at;  -- v5: cannot be re-dated (would reset the daily listing limit)

    v_material := new.title is distinct from old.title or new.summary is distinct from old.summary
      or new.responsibilities is distinct from old.responsibilities or new.requirements is distinct from old.requirements
      or new.perks is distinct from old.perks or new.location is distinct from old.location
      or new.type is distinct from old.type or new.work_mode is distinct from old.work_mode
      or new.employment is distinct from old.employment or new.level is distinct from old.level
      or new.is_paid is distinct from old.is_paid or new.pay_min is distinct from old.pay_min
      or new.pay_max is distinct from old.pay_max or new.pay_period is distinct from old.pay_period
      or new.pay_currency is distinct from old.pay_currency or new.category_id is distinct from old.category_id
      or new.application_deadline is distinct from old.application_deadline;

    -- A version bump makes every earlier approval stop matching.
    --   * any material change, by anyone (skills count through v_touch, set by job_skills_guard);
    --   * an operator moving a listing off 'published' (reject, close, pause, back to review), so an
    --     employer cannot bring it back by resuming unchanged content.
    -- An employer's pause or close does NOT bump: resuming unchanged content stays allowed.
    v_bump := v_material or v_touch
      or (v_priv and new.status is distinct from old.status and new.status is distinct from 'published');
    if v_bump then
      new.content_version := old.content_version + 1;
    end if;

    -- A live listing whose content changed is no longer approved, so it leaves search until re-approved.
    if (v_material or v_touch) and old.status = 'published' then
      new.status := 'pending_review';
    end if;
  end if;

  if not v_priv and new.status = 'rejected' then
    raise exception 'Only a moderator can reject a listing' using errcode = '42501';
  end if;
  -- v5: remember the rejection for the company, so re-creating the listing cannot skip review.
  if v_priv and new.status = 'rejected' and (tg_op = 'INSERT' or old.status is distinct from 'rejected') then
    insert into private.company_rejections (company_id) values (new.company_id)
    on conflict (company_id) do update set rejected_at = now();
  end if;

  -- Going live: a new row that is published, or a status change into 'published'.
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    select exists (
      select 1 from private.job_approvals a
      where a.job_id = new.id and a.content_version = new.content_version
    ) into v_approved;

    if v_approved then
      null;  -- this exact content version was approved: resume or republish needs no new review
    elsif v_priv then
      raise exception 'Publish this listing with approve_job() so the reviewed version is checked' using errcode = '42501';
    else
      -- v5: on INSERT take a share lock, so an admin's verification change waits for this insert to commit and
      -- the identity trigger then sees the new listing. On UPDATE the listing row lock already serialises the two.
      if tg_op = 'INSERT' then
        select c.verification_status = 'approved' into v_verified from public.companies c where c.id = new.company_id for share;
      else
        select c.verification_status = 'approved' into v_verified from public.companies c where c.id = new.company_id;
      end if;
      if coalesce(v_verified, false)
         and (tg_op = 'INSERT' or (old.published_at is null and old.status = 'draft'))
         and not exists (select 1 from private.company_rejections r where r.company_id = new.company_id) then
        -- Existing business rule: a verified company's first go-live from draft needs no admin queue.
        -- A listing an admin has held or rejected (pending_review, rejected) never takes this path.
        -- It is recorded as an approval so later pauses and resumes can use it.
        insert into private.job_approvals (job_id, content_version, approved_by, approval_source)
        values (new.id, new.content_version, null, 'verified_first_publish')
        on conflict (job_id, content_version) do nothing;
      else
        new.status := 'pending_review';  -- employer: goes to the moderation queue
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

-- 4. Skill changes are content changes ---------------------------------------
create or replace function private.job_skills_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_job uuid := case when tg_op = 'DELETE' then old.job_id else new.job_id end;
begin
  -- A listing deleted in the same statement cascades here. Nothing is left to review.
  if not exists (select 1 from public.jobs j where j.id = v_job) then
    return null;
  end if;
  if (select auth.uid()) is not null and not (private.owns_job(v_job) or private.is_admin()) then
    raise exception 'You can only change skills on your own listings' using errcode = '42501';
  end if;
  if (select auth.uid()) is not null and coalesce((select p.is_suspended from public.profiles p where p.id = (select auth.uid())), false) then
    raise exception 'Your account is suspended' using errcode = '42501';
  end if;
  -- Fail-closed flag: it can only make jobs_guard bump the version and send a live listing to review.
  -- It cannot grant approval, because approval is a row in private.job_approvals, not a flag.
  perform set_config('studojob.content_touch', 'on', true);
  update public.jobs j set updated_at = now() where j.id = v_job;
  perform set_config('studojob.content_touch', 'off', true);
  return null;
end;
$$;

create trigger job_skills_guard after insert or delete on public.job_skills
  for each row execute function private.job_skills_guard();

revoke all on function private.job_skills_guard() from public;

-- 5. Company guard (replaces the migration 003 version): logo_path is now an identity field ----
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
      -- Changing the identity of an approved company (name, website or logo) requires a fresh verification.
      if old.verification_status = 'approved'
         and (new.name is distinct from old.name
              or new.website is distinct from old.website
              or new.logo_path is distinct from old.logo_path) then
        new.verification_status := 'pending';
        new.verified_at := null;
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- 6. Identity or verification change takes live listings to review -------------
create or replace function private.companies_identity_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.name is distinct from old.name
     or new.website is distinct from old.website
     or new.logo_path is distinct from old.logo_path
     or (old.verification_status = 'approved' and new.verification_status is distinct from 'approved') then
    -- Students see the company name and the "verified" badge on every listing. Every listing of this
    -- company gets a version bump (via the same flag as skill changes), so earlier approvals stop matching.
    -- A live listing is then sent to review by jobs_guard. A paused listing keeps its status and needs
    -- review before it can go live.
    perform set_config('studojob.content_touch', 'on', true);
    update public.jobs j set updated_at = now() where j.company_id = new.id;
    perform set_config('studojob.content_touch', 'off', true);
  end if;
  return null;
end;
$$;

create trigger companies_identity_changed after update on public.companies
  for each row execute function private.companies_identity_changed();

revoke all on function private.companies_identity_changed() from public;

-- 7. The only way an admin publishes a listing that needed review --------------
create or replace function public.approve_job(p_job uuid, p_reviewed_version integer)
returns public.jobs
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_job public.jobs%rowtype;
begin
  if not (v_uid is null or private.is_admin()) then
    raise exception 'Only a moderator can approve a listing' using errcode = '42501';
  end if;
  -- FOR UPDATE: a concurrent employer edit waits for this transaction. It cannot land between the
  -- version check and the approval.
  select * into v_job from public.jobs j where j.id = p_job for update;
  if not found then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;
  if v_job.status <> 'pending_review' then
    raise exception 'Only a listing waiting for review can be approved' using errcode = 'P0001';
  end if;
  if v_job.content_version <> p_reviewed_version then
    raise exception 'This listing changed after you opened it. Reload it and review the latest version.' using errcode = '40001';
  end if;
  insert into private.job_approvals (job_id, content_version, approved_by, approval_source)
  values (p_job, v_job.content_version, v_uid, 'admin_review');
  update public.jobs j set status = 'published' where j.id = p_job;
  select * into v_job from public.jobs j where j.id = p_job;
  return v_job;
end;
$$;

revoke all on function public.approve_job(uuid, integer) from public, anon;
grant execute on function public.approve_job(uuid, integer) to authenticated, service_role;

-- 8. Catalogue skills: only admins create them (employers and students select existing ones) ----
drop policy if exists skills_insert on public.skills;
create policy skills_insert on public.skills for insert to authenticated
  with check (private.is_admin());
