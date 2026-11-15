-- Rollback for 20261115000012_user_settings.sql (deletes all saved preferences).
drop table if exists public.user_settings;
