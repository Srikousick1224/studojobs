import { Badge } from "@/components/ui/Badge";
import { STATUS_LABEL, STATUS_TONE, type ApplicationStatus } from "@/lib/stage-e/status";

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
