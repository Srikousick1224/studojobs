-- ROLLBACK for PROPOSED_20261105000009 (E2.1 v5 candidate). NOT APPLIED. Run only if the E2.1 migration was applied and must be undone.
--
-- Restores exactly the pre-E2.1 definitions:
--   * private.jobs_guard()        from migration 20261031000003
--   * private.companies_guard()   from migration 20261031000003
--   * policy skills_insert        from migration 20261031000004
-- Removes: the new triggers, the new functions, public.approve_job, private.job_approvals and jobs.content_version.
--
-- DATA LIMITS
--   * No listing, application, company, skill or user row is deleted or changed by the rollback.
--   * Approval history (private.job_approvals) and version numbers are DELETED. This is the only data lost.
--   * Listings in pending_review stay in pending_review. An admin must act on them (the restored code
--     lets an admin publish directly again).
--   * Listings that were live stay live.
--   * After rollback the earlier bypasses (edit then republish, skill changes, rename after verification,
--     logo change) are open again until E2.1 is re-applied.

-- All-or-nothing: run as one transaction, so a failure part-way cannot leave the schema half restored.
begin;

drop trigger if exists companies_identity_changed on public.companies;
drop function if exists private.companies_identity_changed();

drop trigger if exists job_skills_guard on public.job_skills;
drop function if exists private.job_skills_guard();

drop function if exists public.approve_job(uuid, integer);

-- Restore private.companies_guard() exactly as in migration 20261031000003.
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

-- Restore policy skills_insert exactly as in migration 20261031000004.
drop policy if exists skills_insert on public.skills;
create policy skills_insert on public.skills for insert to authenticated
  with check (private.is_active_user());

-- Restore private.jobs_guard() exactly as in migration 20261031000003.
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

-- Remove the E2.1 tables and columns last (approval history and rejection memory are lost here).
drop table if exists private.company_rejections;
drop table if exists private.job_approvals;
alter table public.jobs drop column if exists content_version;

commit;
