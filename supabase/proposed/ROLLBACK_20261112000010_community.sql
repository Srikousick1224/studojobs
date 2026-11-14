drop table if exists public.community_comments, public.community_likes, public.community_posts cascade;
drop function if exists private.community_post_guard(), private.community_comment_guard();
drop type if exists public.post_kind, public.post_status;
