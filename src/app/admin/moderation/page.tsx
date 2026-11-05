import { connection } from "next/server";
import type { Metadata } from "next";
import { ActionButton } from "@/components/features/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState, Notice, PageHeader } from "@/components/ui/Misc";
import { ShieldCheck } from "lucide-react";
import { adminDecideVerificationAction, adminModerateListingAction, adminResolveReportAction } from "@/lib/stage-e/actions";
import { daysSince, jobTypeLabel, reasonLabel } from "@/lib/stage-e/format";
import { listListingsAwaitingReview, listOpenReports, listPendingVerifications } from "@/lib/stage-e/queries";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Moderation queue" };

export default async function ModerationPage() {
  await connection();
  const [verifications, listings, reports] = await Promise.all([
    listPendingVerifications(),
    listListingsAwaitingReview(),
    listOpenReports(),
  ]);
  const nothingWaiting = !verifications.error && !listings.error && !reports.error &&
    verifications.rows.length === 0 && listings.rows.length === 0 && reports.rows.length === 0;

  return (
    <>
      <PageHeader title="Moderation queue" text="Company verifications, listings and reports that need a human decision." />
      <Notice>Every decision below is checked again on the server for the admin role, and the database rules have the final say.</Notice>
      {(verifications.error || listings.error || reports.error) && (
        <Notice tone="error">{verifications.error ?? listings.error ?? reports.error}</Notice>
      )}
      {nothingWaiting && (
        <EmptyState icon={ShieldCheck} title="Nothing is waiting" text="There are no pending company checks, listings or open reports right now." />
      )}

      <section aria-labelledby="verifications-heading" className="space-y-4">
        <h2 id="verifications-heading" className="text-lg font-bold">Company verification requests</h2>
        {verifications.rows.length === 0 && !verifications.error && <p className="text-sm text-ink-500">No pending requests.</p>}
        {verifications.rows.map((v) => (
          <Card key={v.id} className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1 basis-64">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="sky">Company</Badge>
                <span className="text-xs text-ink-500">{timeAgo(daysSince(v.created_at))}</span>
              </div>
              <p className="mt-2 font-bold">{v.companies?.name ?? "Company unavailable"}</p>
              <p className="mt-0.5 text-sm text-ink-600">
                Business email: {v.business_email}
                {v.registration_number ? ` · Registration: ${v.registration_number}` : ""}
                {v.companies?.location ? ` · ${v.companies.location}` : ""}
              </p>
              {v.notes && <p className="mt-2 text-sm text-ink-600">{v.notes}</p>}
            </div>
            <div className="flex gap-2">
              <ActionButton action={adminDecideVerificationAction} payload={{ verificationId: v.id, decision: "approved" }} label="Approve" variant="mint" />
              <ActionButton action={adminDecideVerificationAction} payload={{ verificationId: v.id, decision: "rejected" }} label="Reject" variant="danger" confirm="Reject this company verification?" />
            </div>
          </Card>
        ))}
      </section>

      <section aria-labelledby="listings-heading" className="space-y-4">
        <h2 id="listings-heading" className="text-lg font-bold">Listings awaiting review</h2>
        {listings.rows.length === 0 && !listings.error && <p className="text-sm text-ink-500">No listings are waiting.</p>}
        {listings.rows.map((j) => (
          <Card key={j.id} className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1 basis-64">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{jobTypeLabel(j.type)}</Badge>
                <span className="text-xs text-ink-500">{timeAgo(daysSince(j.created_at))}</span>
              </div>
              <p className="mt-2 font-bold">{j.title}</p>
              <p className="mt-0.5 text-sm text-ink-600">{j.companies?.name ?? "Company unavailable"} · {j.location}</p>
            </div>
            <div className="flex gap-2">
              <ActionButton action={adminModerateListingAction} payload={{ jobId: j.id, decision: "published" }} label="Publish" variant="mint" />
              <ActionButton action={adminModerateListingAction} payload={{ jobId: j.id, decision: "rejected" }} label="Reject" variant="danger" confirm="Reject this listing?" />
            </div>
          </Card>
        ))}
      </section>

      <section aria-labelledby="reports-heading" className="space-y-4">
        <h2 id="reports-heading" className="text-lg font-bold">Open reports</h2>
        {reports.rows.length === 0 && !reports.error && <p className="text-sm text-ink-500">No open reports.</p>}
        {reports.rows.map((r) => (
          <Card key={r.id} className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1 basis-64">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="rose">Report</Badge>
                <Badge tone="amber">{reasonLabel(r.reason)}</Badge>
                <span className="text-xs text-ink-500">{timeAgo(daysSince(r.created_at))}</span>
              </div>
              <p className="mt-2 font-bold">{r.jobs?.title ?? r.companies?.name ?? "Reported item"}</p>
              <p className="mt-0.5 whitespace-pre-line text-sm text-ink-600">{r.details}</p>
            </div>
            <div className="flex gap-2">
              <ActionButton action={adminResolveReportAction} payload={{ reportId: r.id, decision: "resolved" }} label="Resolve" variant="mint" />
              <ActionButton action={adminResolveReportAction} payload={{ reportId: r.id, decision: "dismissed" }} label="Dismiss" variant="secondary" />
            </div>
          </Card>
        ))}
      </section>
    </>
  );
}
