"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/stage-e/result";
import { commentInput, postIdInput, postInput, reportInput } from "./schema";

/**
 * Community server actions. Same rules as the rest of the app: identity comes from the server
 * session (never the browser), input is re-validated with zod, and the write runs AS THE USER so
 * Row Level Security and the guard triggers have the final say.
 */
const fail = (message: string): ActionResult => ({ ok: false, message });
const SIGN_IN = "Please sign in to do that.";

async function member() {
  const v = await getViewer();
  return v && !v.isSuspended && v.onboarded ? v : null;
}
const friendly = (e: { code?: string; message?: string }, fallback: string) =>
  e.code === "P0001" ? (e.message ?? fallback) : e.code === "42P01" || e.code === "PGRST205" ? "Community is not switched on yet." : fallback;

export async function createPostAction(payload: unknown): Promise<ActionResult & { id?: string }> {
  const viewer = await member();
  if (!viewer) return fail(SIGN_IN);
  const parsed = postInput.safeParse(payload);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check your post.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("community_posts")
    .insert({ author_id: viewer.id, ...parsed.data })
    .select("id")
    .single();
  if (error || !data) return fail(friendly(error ?? {}, "We could not publish your post. Please try again."));
  revalidatePath("/community");
  return { ok: true, message: "Your post is live.", id: String(data.id) };
}

export async function toggleLikeAction(payload: unknown): Promise<ActionResult> {
  const viewer = await member();
  if (!viewer) return fail(SIGN_IN);
  const parsed = postIdInput.safeParse(payload);
  if (!parsed.success) return fail("That post could not be found.");
  const supabase = await createClient();
  const { data: existing } = await supabase.from("community_likes").select("post_id").eq("post_id", parsed.data.postId).eq("user_id", viewer.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("community_likes").delete().eq("post_id", parsed.data.postId).eq("user_id", viewer.id)
    : await supabase.from("community_likes").insert({ post_id: parsed.data.postId, user_id: viewer.id });
  if (error) return fail(friendly(error, "Could not update your like."));
  revalidatePath("/community");
  revalidatePath(`/community/${parsed.data.postId}`);
  return { ok: true, message: existing ? "Like removed." : "Liked." };
}

export async function addCommentAction(payload: unknown): Promise<ActionResult> {
  const viewer = await member();
  if (!viewer) return fail(SIGN_IN);
  const parsed = commentInput.safeParse(payload);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check your comment.");
  const supabase = await createClient();
  const { error } = await supabase.from("community_comments").insert({ post_id: parsed.data.postId, author_id: viewer.id, body: parsed.data.body });
  if (error) return fail(friendly(error, "We could not post your comment."));
  revalidatePath(`/community/${parsed.data.postId}`);
  revalidatePath("/community");
  return { ok: true, message: "Comment added." };
}

export async function deletePostAction(payload: unknown): Promise<ActionResult> {
  const viewer = await member();
  if (!viewer) return fail(SIGN_IN);
  const parsed = postIdInput.safeParse(payload);
  if (!parsed.success) return fail("That post could not be found.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("community_posts").delete().eq("id", parsed.data.postId).select("id");
  if (error || !data?.length) return fail("You can only delete your own posts.");
  revalidatePath("/community");
  return { ok: true, message: "Post deleted." };
}

/** Admin-only (RLS enforces it): hide or restore a post without deleting it. */
export async function setPostHiddenAction(payload: unknown): Promise<ActionResult> {
  const viewer = await member();
  if (!viewer || viewer.role !== "admin") return fail("Only moderators can do that.");
  const parsed = postIdInput.safeParse({ postId: (payload as { postId?: unknown })?.postId });
  if (!parsed.success) return fail("That post could not be found.");
  const hidden = (payload as { hidden?: unknown })?.hidden === true;
  const supabase = await createClient();
  const { data, error } = await supabase.from("community_posts").update({ status: hidden ? "hidden" : "published" }).eq("id", parsed.data.postId).select("id");
  if (error || !data?.length) return fail("Could not update the post.");
  revalidatePath("/community");
  revalidatePath(`/community/${parsed.data.postId}`);
  return { ok: true, message: hidden ? "Post hidden." : "Post restored." };
}

export async function toggleBookmarkAction(payload: unknown): Promise<ActionResult> {
  const viewer = await member();
  if (!viewer) return fail(SIGN_IN);
  const parsed = postIdInput.safeParse(payload);
  if (!parsed.success) return fail("That post could not be found.");
  const supabase = await createClient();
  const { data: existing } = await supabase.from("community_bookmarks").select("post_id").eq("post_id", parsed.data.postId).eq("user_id", viewer.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("community_bookmarks").delete().eq("post_id", parsed.data.postId).eq("user_id", viewer.id)
    : await supabase.from("community_bookmarks").insert({ post_id: parsed.data.postId, user_id: viewer.id });
  if (error) return fail(friendly(error, "Could not update your saved posts."));
  revalidatePath("/community");
  return { ok: true, message: existing ? "Removed from saved." : "Saved." };
}

export async function reportPostAction(payload: unknown): Promise<ActionResult> {
  const viewer = await member();
  if (!viewer) return fail(SIGN_IN);
  const parsed = reportInput.safeParse(payload);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please choose a reason.");
  const supabase = await createClient();
  const { error } = await supabase.from("community_reports").insert({ post_id: parsed.data.postId, reporter_id: viewer.id, reason: parsed.data.reason, details: parsed.data.details || null });
  if (error) return fail(error.code === "23505" ? "You have already reported this post." : error.code === "42501" ? "You cannot report this post." : "We could not send your report. Please try again.");
  revalidatePath("/community");
  return { ok: true, message: "Thanks. A moderator will review this post." };
}
