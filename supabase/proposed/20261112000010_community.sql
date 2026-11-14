-- StudoJob PROPOSED migration 010: Community (posts, likes, comments).
-- NOT applied to any live database. Review it, then run it in the Supabase SQL Editor yourself.
-- Rollback: supabase/proposed/ROLLBACK_20261112000010_community.sql
--
-- Design: authors are shown by a name snapshot (author_name) taken by a trigger, so logged-out
-- visitors can read the community WITHOUT any access to the profiles table.

create type public.post_kind as enum ('discussion', 'question', 'tip', 'win', 'resource');
create type public.post_status as enum ('published', 'hidden');

create table public.community_posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles (id) on delete cascade,
  author_name text not null default 'Member',
  author_role public.user_role not null default 'student',
  kind        public.post_kind not null default 'discussion',
  title       text not null check (char_length(btrim(title)) between 5 and 120),
  body        text not null check (char_length(btrim(body)) between 10 and 3000),
  status      public.post_status not null default 'published',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index community_posts_feed_idx on public.community_posts (status, created_at desc);
create index community_posts_author_idx on public.community_posts (author_id);

create table public.community_likes (
  post_id    uuid not null references public.community_posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index community_likes_user_idx on public.community_likes (user_id);

create table public.community_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.community_posts (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  author_name text not null default 'Member',
  author_role public.user_role not null default 'student',
  body        text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at  timestamptz not null default now()
);
create index community_comments_post_idx on public.community_comments (post_id, created_at);
create index community_comments_author_idx on public.community_comments (author_id);

-- Guards ---------------------------------------------------------------------------------------
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
    if v_uid is not null and not private.is_admin() then
      -- authors may edit wording only; moderation fields are frozen
      new.author_id := old.author_id; new.author_name := old.author_name;
      new.author_role := old.author_role; new.status := old.status; new.created_at := old.created_at;
    end if;
  end if;
  return new;
end; $$;
create trigger community_posts_guard before insert or update on public.community_posts
  for each row execute function private.community_post_guard();

create or replace function private.community_comment_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is not null then
    new.author_id := v_uid;
    select left(coalesce(nullif(btrim(p.full_name), ''), 'Member'), 60), p.role
      into new.author_name, new.author_role from public.profiles p where p.id = v_uid;
    if (select count(*) from public.community_comments x
        where x.author_id = v_uid and x.created_at > now() - interval '1 hour') >= 30 then
      raise exception 'You are commenting too fast. Please wait a little.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end; $$;
create trigger community_comments_guard before insert on public.community_comments
  for each row execute function private.community_comment_guard();

-- Row Level Security ----------------------------------------------------------------------------
alter table public.community_posts    enable row level security;
alter table public.community_likes    enable row level security;
alter table public.community_comments enable row level security;

grant select on public.community_posts, public.community_comments, public.community_likes to anon;

create policy cposts_select on public.community_posts for select to anon, authenticated
  using (status = 'published' or author_id = (select auth.uid()) or private.is_admin());
create policy cposts_insert on public.community_posts for insert to authenticated
  with check (author_id = (select auth.uid()) and private.is_active_user());
create policy cposts_update_own on public.community_posts for update to authenticated
  using (author_id = (select auth.uid()) and private.is_active_user())
  with check (author_id = (select auth.uid()));
create policy cposts_update_admin on public.community_posts for update to authenticated
  using (private.is_admin()) with check (private.is_admin());
create policy cposts_delete on public.community_posts for delete to authenticated
  using (author_id = (select auth.uid()) or private.is_admin());

create policy clikes_select on public.community_likes for select to anon, authenticated using (true);
create policy clikes_insert on public.community_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_active_user()
    and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published'));
create policy clikes_delete on public.community_likes for delete to authenticated
  using (user_id = (select auth.uid()));

create policy ccomments_select on public.community_comments for select to anon, authenticated
  using (exists (select 1 from public.community_posts p where p.id = post_id
                 and (p.status = 'published' or private.is_admin())));
create policy ccomments_insert on public.community_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and private.is_active_user()
    and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published'));
create policy ccomments_delete on public.community_comments for delete to authenticated
  using (author_id = (select auth.uid()) or private.is_admin());
