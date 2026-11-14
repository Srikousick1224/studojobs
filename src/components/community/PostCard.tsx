import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { hueFromName } from "@/lib/stage-e/job-view";
import { KIND_META, type PostView } from "@/lib/community/schema";
import { daysSince } from "@/lib/stage-e/format";
import { timeAgo } from "@/lib/utils";
import { BookmarkButton, LikeButton, OwnerTools, ReportButton } from "./PostActions";

const ROLE = { student: "Student", employer: "Employer", admin: "Moderator" } as const;

export function PostCard({ post, signedIn, isAdmin, full }: { post: PostView; signedIn: boolean; isAdmin: boolean; full?: boolean }) {
  const meta = KIND_META[post.kind];
  return (
    <article className="relative rounded-2xl bg-white p-5 shadow-soft ring-1 ring-ink-100">
      <div className="flex items-center gap-3">
        <Avatar name={post.authorName} hue={hueFromName(post.authorName)} size={40} square={false} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-900">{post.authorName}</p>
          <p className="text-xs text-ink-500">{ROLE[post.authorRole]} · {timeAgo(daysSince(post.createdAt))}</p>
        </div>
        {post.hidden && <Badge tone="rose">Hidden</Badge>}
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>
      <h3 className="mt-3 text-lg font-bold leading-snug">
        {full ? post.title : <Link href={`/community/${post.id}`} className="hover:text-brand-600">{post.title}</Link>}
      </h3>
      <p className={`mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-700 ${full ? "" : "line-clamp-4"}`}>{post.body}</p>
      <div className="mt-4 flex items-center gap-1 border-t border-ink-100 pt-3">
        <LikeButton postId={post.id} likes={post.likes} liked={post.likedByMe} signedIn={signedIn} />
        <Link href={`/community/${post.id}`} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-ink-500 hover:bg-ink-100">
          <MessageCircle className="h-4.5 w-4.5" aria-hidden="true" /> {post.comments}
        </Link>
        {signedIn && <BookmarkButton postId={post.id} saved={post.saved} />}
        <span className="ml-auto flex items-center">{signedIn && !post.mine && <ReportButton postId={post.id} />}<OwnerTools postId={post.id} mine={post.mine} isAdmin={isAdmin} hidden={post.hidden} /></span>
      </div>
    </article>
  );
}
