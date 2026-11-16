import "server-only";
import { z } from "zod";
import { getViewer } from "@/lib/auth/dal";
import { isSupabaseConfigured } from "@/lib/env";
import { readSettings } from "@/lib/settings/schema";
import { createClient } from "@/lib/supabase/server";
import { isVisible } from "./categories";

const row = z.object({
  id: z.uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  link: z.string().nullable(),
  is_read: z.boolean(),
  created_at: z.string(),
});
export type NotificationRow = z.output<typeof row>;

export interface NotificationPage { rows: NotificationRow[]; hidden: number; error: string | null }

/** The signed-in user's latest notifications, filtered by their Settings. RLS limits rows to their own. */
export async function listMyNotifications(): Promise<NotificationPage> {
  const viewer = await getViewer();
  if (!viewer || !isSupabaseConfigured()) return { rows: [], hidden: 0, error: null };
  const supabase = await createClient();
  const [{ data, error }, { data: s }] = await Promise.all([
    supabase.from("notifications").select("id, type, title, body, link, is_read, created_at").order("created_at", { ascending: false }).limit(60),
    supabase.from("user_settings").select("data").eq("user_id", viewer.id).maybeSingle(),
  ]);
  if (error) return { rows: [], hidden: 0, error: "We could not load your notifications. Please refresh the page." };
  const role = viewer.role === "employer" ? "employer" : "student";
  const prefs = readSettings(role, s?.data).notifications;
  const all = (Array.isArray(data) ? data : []).flatMap((r) => { const p = row.safeParse(r); return p.success ? [p.data] : []; });
  const rows = all.filter((n) => isVisible(n.type, prefs));
  return { rows, hidden: all.length - rows.length, error: null };
}

/** Unread count for the sidebar badge (respects Settings). Never throws: a failure just shows no badge. */
export async function getUnreadCount(): Promise<number> {
  try {
    const { rows } = await listMyNotifications();
    return rows.filter((n) => !n.is_read).length;
  } catch {
    return 0;
  }
}

