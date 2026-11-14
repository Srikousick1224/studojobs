"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bookmark, EyeOff, Eye, Flag, Heart, Loader2, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Misc";
import { addCommentAction, deletePostAction, reportPostAction, setPostHiddenAction, toggleBookmarkAction, toggleLikeAction } from "@/lib/community/actions";
import { REPORT_REASONS } from "@/lib/community/schema";
import { cn } from "@/lib/utils";

export function LikeButton({ postId, likes, liked, signedIn }: { postId: string; likes: number; liked: boolean; signedIn: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useState<{ liked: boolean; likes: number } | null>(null);
  const view = optimistic ?? { liked, likes };
  if (!signedIn) {
    return (
      <Link href="/login?next=/community" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-ink-500 hover:bg-ink-100" aria-label="Sign in to like">
        <Heart className="h-4.5 w-4.5" aria-hidden="true" /> {likes}
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={view.liked}
      aria-label={view.liked ? "Unlike this post" : "Like this post"}
      onClick={() => {
        setOptimistic({ liked: !view.liked, likes: view.likes + (view.liked ? -1 : 1) });
        start(async () => {
          const r = await toggleLikeAction({ postId });
          if (!r.ok) setOptimistic(null);
          router.refresh();
        });
      }}
      className={cn("relative z-10 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition", view.liked ? "bg-rose-50 text-rose-600" : "text-ink-500 hover:bg-ink-100")}
    >
      <Heart className={cn("h-4.5 w-4.5", view.liked && "fill-rose-500")} aria-hidden="true" /> {view.likes}
    </button>
  );
}

export function CommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [text, setText] = useState("");
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await addCommentAction({ postId, body: text });
          if (r.ok) { setText(""); router.refresh(); } else setMsg(r.message);
        });
      }}
      className="space-y-3"
    >
      <label htmlFor="comment" className="sr-only">Write a comment</label>
      <textarea id="comment" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Add a helpful comment…" className="min-h-24 w-full rounded-xl bg-white px-3.5 py-3 text-sm ring-1 ring-ink-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
      {msg && <Notice tone="error">{msg}</Notice>}
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-400">{text.length}/1000</span>
        <Button type="submit" disabled={pending || !text.trim()}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />} Comment
        </Button>
      </div>
    </form>
  );
}

export function OwnerTools({ postId, mine, isAdmin, hidden }: { postId: string; mine: boolean; isAdmin: boolean; hidden: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!mine && !isAdmin) return null;
  return (
    <span className="relative z-10 inline-flex items-center gap-1">
      {isAdmin && (
        <button type="button" disabled={pending} onClick={() => start(async () => { await setPostHiddenAction({ postId, hidden: !hidden }); router.refresh(); })} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-500 hover:bg-ink-100">
          {hidden ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />} {hidden ? "Restore" : "Hide"}
        </button>
      )}
      {mine && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Delete this post? This cannot be undone.")) return;
            start(async () => { const r = await deletePostAction({ postId }); if (r.ok) router.push("/community"); router.refresh(); });
          }}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
        </button>
      )}
    </span>
  );
}

export function BookmarkButton({ postId, saved }: { postId: string; saved: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [opt, setOpt] = useState<boolean | null>(null);
  const on = opt ?? saved;
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={on}
      aria-label={on ? "Remove from saved posts" : "Save this post"}
      onClick={() => { setOpt(!on); start(async () => { const r = await toggleBookmarkAction({ postId }); if (!r.ok) setOpt(null); router.refresh(); }); }}
      className={cn("relative z-10 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition", on ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-ink-100")}
    >
      <Bookmark className={cn("h-4.5 w-4.5", on && "fill-brand-500 text-brand-500")} aria-hidden="true" /> <span className="hidden sm:inline">{on ? "Saved" : "Save"}</span>
    </button>
  );
}

export function ReportButton({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <span className="relative z-10">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-500 hover:bg-ink-100">
        <Flag className="h-4 w-4" aria-hidden="true" /> Report
      </button>
      {open && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setMsg(null);
            start(async () => {
              const r = await reportPostAction({ postId, reason, details });
              setMsg({ ok: r.ok, text: r.message });
              if (r.ok) setTimeout(() => setOpen(false), 1800);
            });
          }}
          className="absolute right-0 z-20 mt-1 w-72 space-y-2 rounded-xl bg-white p-3 text-left shadow-lift ring-1 ring-ink-200"
        >
          <label htmlFor={`rr-${postId}`} className="block text-xs font-semibold text-ink-700">Why are you reporting this?</label>
          <select id={`rr-${postId}`} value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 w-full rounded-lg bg-white px-2 text-sm ring-1 ring-ink-200">
            {Object.entries(REPORT_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label htmlFor={`rd-${postId}`} className="sr-only">Details (optional)</label>
          <textarea id={`rd-${postId}`} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} placeholder="Details (optional)" className="min-h-16 w-full rounded-lg px-2 py-1.5 text-sm ring-1 ring-ink-200" />
          {msg && <p role="status" className={cn("text-xs font-medium", msg.ok ? "text-mint-700" : "text-rose-600")}>{msg.text}</p>}
          <Button type="submit" size="sm" disabled={pending}>{pending ? "Sending…" : "Send report"}</Button>
        </form>
      )}
    </span>
  );
}
