"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/stage-e/result";

const fail = (message: string): ActionResult => ({ ok: false, message });

/** Only the read flag can change (the database guard enforces it); RLS limits this to the person's own rows. */
export async function markNotificationReadAction(payload: unknown): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid() }).safeParse(payload);
  if (!parsed.success) return fail("Invalid notification.");
  const viewer = await getViewer();
  if (!viewer) return fail("Please sign in again.");
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", parsed.data.id).eq("user_id", viewer.id);
  if (error) return fail("We could not update that notification.");
  revalidatePath("/", "layout");
  return { ok: true, message: "Marked as read." };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("Please sign in again.");
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", viewer.id).eq("is_read", false);
  if (error) return fail("We could not update your notifications.");
  revalidatePath("/", "layout");
  return { ok: true, message: "All caught up." };
}
