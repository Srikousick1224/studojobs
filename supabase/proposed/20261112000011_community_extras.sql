-- StudoJob PROPOSED migration 011: community bookmarks + post reports (needs 010 first). NOT applied anywhere.
-- Rollback: ROLLBACK_20261112000011_community_extras.sql

create table public.community_bookmarks (
  post_id    uuid not null references public.community_posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index community_bookmarks_user_idx on public.community_bookmarks (user_id, created_at desc);

create type public.community_report_reason as enum ('spam', 'scam', 'abusive', 'personal_info', 'other');
create table public.community_reports (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.community_posts (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason      public.community_report_reason not null,
  details     text check (details is null or char_length(details) <= 500),
  status      public.report_status not null default 'open',
  created_at  timestamptz not null default now(),
  unique (post_id, reporter_id)
);
create index community_reports_post_idx on public.community_reports (post_id);
create index community_reports_reporter_idx on public.community_reports (reporter_id);

alter table public.community_bookmarks enable row level security;
alter table public.community_reports   enable row level security;

create policy cbook_select on public.community_bookmarks for select to authenticated using (user_id = (select auth.uid()));
create policy cbook_insert on public.community_bookmarks for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_active_user()
    and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published'));
create policy cbook_delete on public.community_bookmarks for delete to authenticated using (user_id = (select auth.uid()));

create policy creports_select on public.community_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or private.is_admin());
create policy creports_insert on public.community_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and private.is_active_user()
    and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published' and p.author_id <> (select auth.uid())));
create policy creports_update_admin on public.community_reports for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- 3 different people reporting a post hides it until a moderator looks (admins can restore it).
create or replace function private.community_report_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.community_reports r where r.post_id = new.post_id and r.status = 'open') >= 3 then
    update public.community_posts set status = 'hidden' where id = new.post_id;
  end if;
  return new;
end; $$;
create trigger community_reports_after_insert after insert on public.community_reports
  for each row execute function private.community_report_after_insert();

-- The post guard froze `status` for non-admins; allow the nested auto-hide trigger (depth > 1) through.
create or replace function private.community_post_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    if v_uid is not null then
      new.author_id := v_uid;
      select left(coalesce(nullif(btrim(p.full_name), ''), 'Member'), 60), p.role
        into new.author_name, new.author_role from public.profiles p where p.id = v_uid;
      new.status := 'published';
      if (select count(*) from public.community_posts x
          where x.author_id = v_uid and x.created_at > now() - interval '1 day') >= 5 then
        raise exception 'Daily post limit reached (5 per day). Please try again tomorrow.' using errcode = 'P0001';
      end if;
    end if;
  else
    new.updated_at := now();
    if v_uid is not null and not private.is_admin() and pg_trigger_depth() = 1 then
      new.author_id := old.author_id; new.author_name := old.author_name;
      new.author_role := old.author_role; new.status := old.status; new.created_at := old.created_at;
    end if;
  end if;
  return new;
end; $$;
