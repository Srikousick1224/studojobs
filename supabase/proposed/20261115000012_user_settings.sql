-- StudoJob PROPOSED migration 012: per-user settings (notification, privacy and hiring/job preferences).
-- NOT applied to any live database. Review it, then run it in the Supabase SQL Editor yourself.
-- Rollback: supabase/proposed/ROLLBACK_20261115000012_user_settings.sql
--
-- One row per user, one small JSON object. The app validates the shape with zod before writing;
-- the checks below only keep the row small and well-formed. A user can read/write ONLY their own row.

create table public.user_settings (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb
               check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 8192),
  updated_at timestamptz not null default now()
);

create trigger user_settings_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;
revoke all on public.user_settings from anon;

create policy user_settings_select on public.user_settings for select to authenticated
  using (user_id = (select auth.uid()));
create policy user_settings_insert on public.user_settings for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy user_settings_update on public.user_settings for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- No delete policy: the row disappears with the account (on delete cascade).
