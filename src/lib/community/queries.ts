import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/dal";
import { isSupabaseConfigured } from "@/lib/env";
import { POST_KINDS, type CommentView, type PostKind, type PostView } from "./schema";

export type FeedState = "ok" | "not_configured" | "not_ready" | "error";
export const FEED_PAGE = 15;

const role = z.enum(["student", "employer", "admin"]);
const countEmbed = z.array(z.object({ count: z.number() })).default([]);
const postRow = z.object({
  id: z.uuid(),
  kind: z.enum(POST_KINDS),
  title: z.string(),
  body: z.string(),
  author_id: z.uuid(),
  author_name: z.string(),
  author_role: role,
  status: z.enum(["published", "hidden"]),
  created_at: z.string(),
  community_likes: countEmbed,
  community_comments: countEmbed,
});
const commentRow = z.object({ id: z.uuid(), body: z.string(), author_id: z.uuid(), author_name: z.string(), author_role: role, created_at: z.string() });

/** Postgres "relation does not exist" (42P01) / PostgREST "not in schema cache" (PGRST205): the migration is not applied yet. */
const missingTable = (e: { code?: string } | null) => !!e && (e.code === "42P01" || e.code === "PGRST205");

function toPost(r: z.output<typeof postRow>, viewerId: string | null, liked: Set<string>, saved: Set<string> = new Set()): PostView {
  return {
    id: r.id, kind: r.kind, title: r.title, body: r.body, authorName: r.author_name, authorRole: r.author_role,
    createdAt: r.created_at, likes: r.community_likes[0]?.count ?? 0, comments: r.community_comments[0]?.count ?? 0,
    likedByMe: liked.has(r.id), saved: saved.has(r.id), mine: viewerId === r.author_id, hidden: r.status === "hidden",
  };
}

async function likedSet(viewerId: string | null, ids: string[]): Promise<Set<string>> {
  if (!viewerId || ids.length === 0) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("community_likes").select("post_id").eq("user_id", viewerId).in("post_id", ids);
  return new Set((data ?? []).map((d) => String(d.post_id)));
}

async function savedSet(viewerId: string | null, ids: string[]): Promise<Set<string>> {
  if (!viewerId || ids.length === 0) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("community_bookmarks").select("post_id").eq("user_id", viewerId).in("post_id", ids);
  return new Set((data ?? []).map((d) => String(d.post_id)));
}

export type FeedSort = "new" | "popular";
const POPULAR_WINDOW = 100;
const escapeLike = (s: string) => s.replace(/[\\%_,()]/g, " ").trim();

export async function listPosts(opts: { kind?: string; page?: number; q?: string; sort?: FeedSort; savedOnly?: boolean }): Promise<{ posts: PostView[]; total: number; state: FeedState }> {
  if (!isSupabaseConfigured()) return { posts: [], total: 0, state: "not_configured" };
  const viewer = await getViewer();
  const supabase = await createClient();
  const page = Math.max(1, opts.page ?? 1);
  const popular = opts.sort === "popular";
  let q = supabase
    .from("community_posts")
    .select("id,kind,title,body,author_id,author_name,author_role,status,created_at,community_likes(count),community_comments(count)", { count: "exact" })
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (opts.kind && (POST_KINDS as readonly string[]).includes(opts.kind)) q = q.eq("kind", opts.kind as PostKind);
  const term = escapeLike(opts.q ?? "").slice(0, 80);
  if (term) q = q.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
  if (opts.savedOnly) {
    if (!viewer) return { posts: [], total: 0, state: "ok" };
    const { data: bm } = await supabase.from("community_bookmarks").select("post_id").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(200);
    const ids = (bm ?? []).map((b) => String(b.post_id));
    if (ids.length === 0) return { posts: [], total: 0, state: "ok" };
    q = q.in("id", ids);
  }
  // "Popular" has no SQL column to sort by, so rank the newest POPULAR_WINDOW posts by likes + 2 x comments here.
  q = popular ? q.range(0, POPULAR_WINDOW - 1) : q.range((page - 1) * FEED_PAGE, page * FEED_PAGE - 1);
  const { data, error, count } = await q;
  if (missingTable(error)) return { posts: [], total: 0, state: "not_ready" };
  if (error || !Array.isArray(data)) return { posts: [], total: 0, state: "error" };
  let rows = data.flatMap((r) => { const p = postRow.safeParse(r); return p.success ? [p.data] : []; });
  let total = count ?? rows.length;
  if (popular) {
    const score = (r: (typeof rows)[number]) => (r.community_likes[0]?.count ?? 0) + 2 * (r.community_comments[0]?.count ?? 0);
    rows = rows.sort((x, y) => score(y) - score(x) || y.created_at.localeCompare(x.created_at));
    total = rows.length;
    rows = rows.slice((page - 1) * FEED_PAGE, page * FEED_PAGE);
  }
  const ids = rows.map((r) => r.id);
  const [liked, saved] = await Promise.all([likedSet(viewer?.id ?? null, ids), savedSet(viewer?.id ?? null, ids)]);
  return { posts: rows.map((r) => toPost(r, viewer?.id ?? null, liked, saved)), total, state: "ok" };
}

export async function getPost(id: string): Promise<{ post: PostView | null; comments: CommentView[]; state: FeedState }> {
  if (!z.uuid().safeParse(id).success) return { post: null, comments: [], state: "ok" };
  if (!isSupabaseConfigured()) return { post: null, comments: [], state: "not_configured" };
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("community_posts")
    .select("id,kind,title,body,author_id,author_name,author_role,status,created_at,community_likes(count),community_comments(count)")
    .eq("id", id)
    .maybeSingle();
  if (missingTable(error)) return { post: null, comments: [], state: "not_ready" };
  const parsed = postRow.safeParse(data);
  if (error || !parsed.success) return { post: null, comments: [], state: error ? "error" : "ok" };
  const [liked, saved] = await Promise.all([likedSet(viewer?.id ?? null, [id]), savedSet(viewer?.id ?? null, [id])]);
  const { data: cData } = await supabase
    .from("community_comments")
    .select("id,body,author_id,author_name,author_role,created_at")
    .eq("post_id", id)
    .order("created_at", { ascending: true })
    .limit(200);
  const comments = (cData ?? []).flatMap((r) => {
    const p = commentRow.safeParse(r);
    return p.success
      ? [{ id: p.data.id, body: p.data.body, authorName: p.data.author_name, authorRole: p.data.author_role, createdAt: p.data.created_at, mine: viewer?.id === p.data.author_id }]
      : [];
  });
  return { post: toPost(parsed.data, viewer?.id ?? null, liked, saved), comments, state: "ok" };
}
