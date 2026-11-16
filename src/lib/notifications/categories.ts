import type { StudentSettings } from "@/lib/settings/schema";

/** Which Settings switch controls which kind of notification. Types not listed here are always shown. */
export type NotifyKey = keyof Omit<StudentSettings["notifications"], "digest">;

export function categoryOf(type: string): NotifyKey | null {
  if (type.startsWith("application_")) return "applicationUpdates";
  if (type.startsWith("interview_")) return "interviewReminders";
  if (type.startsWith("community_")) return "community";
  if (type.startsWith("product_")) return "product";
  return null;
}

/** True when the person's Settings allow this notification to show. */
export function isVisible(type: string, prefs: Pick<StudentSettings["notifications"], NotifyKey>): boolean {
  const k = categoryOf(type);
  return k ? prefs[k] : true;
}
