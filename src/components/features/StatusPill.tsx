import type { ApplicationStatus } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

const map: Record<ApplicationStatus, { label: string; tone: "neutral" | "brand" | "mint" | "amber" | "rose" | "sky" }> = {
  applied: { label: "Applied", tone: "neutral" },
  reviewing: { label: "In review", tone: "sky" },
  shortlisted: { label: "Shortlisted", tone: "brand" },
  interview: { label: "Interview", tone: "amber" },
  offer: { label: "Offer", tone: "mint" },
  rejected: { label: "Not selected", tone: "rose" },
};

export function StatusPill({ status }: { status: ApplicationStatus }) {
  const s = map[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
