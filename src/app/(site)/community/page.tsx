import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { MessagesSquare, Search } from "lucide-react";
import { PostCard } from "@/components/community/PostCard";
import { PostComposer } from "@/components/community/PostComposer";
import { Button } from "@/components/ui/Button";
import { EmptyState, Notice, PageHeader } from "@/components/ui/Misc";
import { getViewer } from "@/lib/auth/dal";
import { listPosts, FEED_PAGE } from "@/lib/community/queries";
import { KIND_META, POST_KINDS } from "@/lib/community/schema";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Community" };
type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function Feed({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const params = await searchParams;
  const kind = one(params.kind);
  const page = Math.max(1, parseInt(one(params.page), 10) || 1);
  const q = one(params.q).slice(0, 80);
  const sort = one(params.sort) === "popular" ? "popular" : "new";
  const savedOnly = one(params.view) === "saved";
  const [viewer, { posts, total, state }] = await Promise.all([getViewer(), listPosts({ kind, page, q, sort, savedOnly })]);
  const signedIn = !!viewer && !viewer.isSuspended && viewer.onboarded;
  const pages = Math.max(1, Math.ceil(total / FEED_PAGE));
  const href = (k: string, p = 1, over: Record<string, string> = {}) => {
    const sp = new URLSearchParams();
    const vals: Record<string, string> = { kind: k, q, sort: sort === "popular" ? "popular" : "", view: savedOnly ? "saved" : "", ...over };
    for (const [key, v] of Object.entries(vals)) if (v) sp.set(key, v);
    if (p > 1) sp.set("page", String(p));
    const str = sp.toString();
    return str ? `/community?${str}` : "/community";
  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_340px]">
      <section aria-label="Posts" className="space-y-4">
        <form action="/community" method="GET" role="search" className="flex gap-2">
          <label htmlFor="cq" className="sr-only">Search posts</label>
          <input id="cq" name="q" type="search" defaultValue={q} placeholder="Search posts…" className="h-11 flex-1 rounded-xl bg-white px-3.5 text-sm ring-1 ring-ink-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          {kind && <input type="hidden" name="kind" value={kind} />}
          {sort === "popular" && <input type="hidden" name="sort" value="popular" />}
          <Button type="submit" aria-label="Search"><Search className="h-4 w-4" aria-hidden="true" /></Button>
        </form>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-ink-500">Sort:</span>
          <Link href={href(kind, 1, { sort: "" })} aria-current={sort === "new" ? "true" : undefined} className={cn("rounded-lg px-3 py-1 font-semibold", sort === "new" ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100")}>Newest</Link>
          <Link href={href(kind, 1, { sort: "popular" })} aria-current={sort === "popular" ? "true" : undefined} className={cn("rounded-lg px-3 py-1 font-semibold", sort === "popular" ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100")}>Popular</Link>
          {signedIn && <Link href={href(kind, 1, { view: savedOnly ? "" : "saved" })} aria-current={savedOnly ? "true" : undefined} className={cn("ml-auto rounded-lg px-3 py-1 font-semibold", savedOnly ? "bg-brand-500 text-white" : "text-brand-700 hover:bg-brand-50")}>Saved posts</Link>}
        </div>
        <nav aria-label="Filter posts" className="flex flex-wrap gap-2">
          {["", ...POST_KINDS].map((k) => (
            <Link key={k || "all"} href={href(k)} aria-current={kind === k ? "page" : undefined} className={cn("rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition", kind === k ? "bg-brand-500 text-white ring-brand-500" : "bg-white text-ink-700 ring-ink-200 hover:bg-brand-50")}>
              {k ? KIND_META[k as keyof typeof KIND_META].label : "All"}
            </Link>
          ))}
        </nav>
        {state === "not_configured" && <Notice tone="warn">StudoJob is not connected to Supabase yet, so the community is switched off.</Notice>}
        {state === "not_ready" && <Notice tone="info">The community database tables have not been added yet. Apply <code>supabase/proposed/20261112000010_community.sql</code> to switch this on.</Notice>}
        {state === "error" && <Notice tone="error">We could not load posts right now. Please refresh the page.</Notice>}
        {state === "ok" && posts.length === 0 && (
          <EmptyState icon={MessagesSquare} title={q || savedOnly || kind ? "No matching posts" : "No posts yet"} text={savedOnly ? "Tap Save on a post to keep it here." : q ? "Try a different word." : "Be the first to share a tip, ask a question or celebrate a win."} />
        )}
        {posts.map((p) => <PostCard key={p.id} post={p} signedIn={signedIn} isAdmin={viewer?.role === "admin"} />)}
        {pages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-between pt-2 text-sm">
            {page > 1 ? <Link href={href(kind, page - 1)} className="font-semibold text-brand-600 hover:underline">← Newer</Link> : <span />}
            <span className="text-ink-500">Page {page} of {pages}</span>
            {page < pages ? <Link href={href(kind, page + 1)} className="font-semibold text-brand-600 hover:underline">Older →</Link> : <span />}
          </nav>
        )}
      </section>
      <aside className="space-y-4 lg:sticky lg:top-24">
        {signedIn && state === "ok" ? (
          <PostComposer />
        ) : (
          <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-ink-100">
            <h2 className="text-lg font-bold">Join the conversation</h2>
            <p className="mt-1 text-sm text-ink-600">Sign in to post, like and comment. Reading is open to everyone.</p>
            <div className="mt-4 flex gap-2">
              <Button href="/login?next=/community">Sign in</Button>
              <Button href="/register" variant="secondary">Create account</Button>
            </div>
          </div>
        )}
        <div className="rounded-2xl bg-brand-50 p-5 text-sm text-ink-700 ring-1 ring-brand-100">
          <p className="font-bold text-ink-900">Community rules</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Be kind and respectful.</li>
            <li>No spam, and never ask others for money.</li>
            <li>Do not share personal documents or contact details.</li>
            <li>Report fake job offers on the <Link href="/report" className="font-semibold text-brand-700 underline">report page</Link>.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

export default function CommunityPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader title="Community" text="Ask questions, share tips and celebrate wins with other students and employers." />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-ink-100" aria-label="Loading posts" />}>
        <Feed searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
