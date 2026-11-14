drop table if exists public.community_reports, public.community_bookmarks cascade;
drop function if exists private.community_report_after_insert();
drop type if exists public.community_report_reason;
-- (the guard function keeps the 011 version; re-run 010's create or replace to restore the original)
