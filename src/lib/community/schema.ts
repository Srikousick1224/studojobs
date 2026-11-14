import { z } from "zod";

export const POST_KINDS = ["discussion", "question", "tip", "win", "resource"] as const;
export type PostKind = (typeof POST_KINDS)[number];

export const KIND_META: Record<PostKind, { label: string; hint: string; tone: "brand" | "sky" | "mint" | "amber" | "neutral" }> = {
  discussion: { label: "Discussion", hint: "Start a conversation", tone: "neutral" },
  question: { label: "Question", hint: "Ask the community for help", tone: "sky" },
  tip: { label: "Tip", hint: "Share something that worked for you", tone: "brand" },
  win: { label: "Win", hint: "Celebrate an offer, interview or milestone", tone: "mint" },
  resource: { label: "Resource", hint: "Share a useful course, tool or guide", tone: "amber" },
};

export const isPostKind = (v: unknown): v is PostKind => typeof v === "string" && (POST_KINDS as readonly string[]).includes(v);

/** Shared by client (instant feedback) and server (the real check). Mirrors the database CHECKs. */
export const postInput = z.object({
  kind: z.enum(POST_KINDS),
  title: z.string().trim().min(5, "Title needs at least 5 characters.").max(120, "Title can be at most 120 characters."),
  body: z.string().trim().min(10, "Write at least 10 characters.").max(3000, "Posts can be at most 3000 characters."),
});
export const commentInput = z.object({
  postId: z.uuid(),
  body: z.string().trim().min(1, "Write a comment first.").max(1000, "Comments can be at most 1000 characters."),
});
export const REPORT_REASONS = { spam: "Spam or advertising", scam: "Scam or asks for money", abusive: "Abusive or hateful", personal_info: "Shares personal information", other: "Something else" } as const;
export type ReportReason = keyof typeof REPORT_REASONS;
export const reportInput = z.object({ postId: z.uuid(), reason: z.enum(["spam", "scam", "abusive", "personal_info", "other"]), details: z.string().trim().max(500, "Details can be at most 500 characters.").optional() });
export const postIdInput = z.object({ postId: z.uuid() });

export interface PostView {
  id: string;
  kind: PostKind;
  title: string;
  body: string;
  authorName: string;
  authorRole: "student" | "employer" | "admin";
  createdAt: string;
  likes: number;
  comments: number;
  likedByMe: boolean;
  saved: boolean;
  mine: boolean;
  hidden: boolean;
}
export interface CommentView {
  id: string;
  body: string;
  authorName: string;
  authorRole: "student" | "employer" | "admin";
  createdAt: string;
  mine: boolean;
}
