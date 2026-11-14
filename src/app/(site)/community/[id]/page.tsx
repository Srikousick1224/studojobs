import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { PostCard } from "@/components/community/PostCard";
import { CommentForm } from "@/components/community/PostActions";
import { Avatar, Notice } from "@/components/ui/Misc";
import { getViewer } from "@/lib/auth/dal";
import { getPost } from "@/lib/community/queries";
import { hueFromName } from "@/lib/stage-e/job-view";
import { daysSince } from "@/lib/stage-e/format";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Community post" };

async function Thread({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const [viewer, { post, comments, state }] = await Promise.all([getViewer(), getPost(id)]);
  if (state === "not_configured" || state === "not_ready") return <Notice tone="info">The community is not switched on yet.</Notice>;
  if (state === "error") return <Notice tone="error">We could not load this post. Please refresh.</Notice>;
  if (!post) notFound();
  const signedIn = !!viewer && !viewer.isSuspended && viewer.onboarded;
  return (
    <div className="space-y-6">
      <PostCard post={post} signedIn={signedIn} isAdmin={viewer?.role === "admin"} full />
      <section aria-label="Comments" className="space-y-4">
        <h2 className="text-lg font-bold">{comments.length} {comments.length === 1 ? "comment" : "comments"}</h2>
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3 rounded-2xl bg-white p-4 ring-1 ring-ink-100">
            <Avatar name={c.authorName} hue={hueFromName(c.authorName)} size={36} square={false} />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{c.authorName} <span className="font-normal text-ink-500">· {timeAgo(daysSince(c.createdAt))}</span></p>
              <p className="mt-0.5 whitespace-pre-line break-words text-sm text-ink-700">{c.body}</p>
            </div>
          </div>
        ))}
        {signedIn ? <CommentForm postId={post.id} /> : <p className="text-sm text-ink-600"><Link href={`/login?next=/community/${post.id}`} className="font-semibold text-brand-600 underline">Sign in</Link> to comment.</p>}
      </section>
    </div>
  );
}

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <Link href="/community" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to community</Link>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-ink-100" />}>
        <Thread params={params} />
      </Suspense>
    </div>
  );
}
