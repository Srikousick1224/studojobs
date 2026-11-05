import type { Metadata } from "next";
import { connection } from "next/server";
import { CompanyForm } from "@/components/features/CompanyForm";
import { Notice, PageHeader } from "@/components/ui/Misc";
import { VerificationForm } from "@/components/features/VerificationForm";
import { Card } from "@/components/ui/Card";
import { requestCompanyVerificationAction, saveCompanyAction } from "@/lib/stage-e/job-actions";
import { getMyCompany, listMyVerificationRequests } from "@/lib/stage-e/job-queries";
import { daysSince } from "@/lib/stage-e/format";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Company profile" };

export default async function CompanyPage() {
  await connection();
  const company = await getMyCompany();
  const requests = company ? await listMyVerificationRequests() : [];
  const waiting = requests.some((r) => r.status === "pending");
  return (
    <>
      <PageHeader
        title="Company profile"
        text="Your company is shown on every role you post. Each company is verified by an admin before its roles go live straight away."
      />
      {company && company.verification_status !== "approved" && (
        <div className="mb-6 max-w-3xl">
          <Notice tone="warn">
            {company.verification_status === "rejected"
              ? "Verification was not approved. Update your details and contact support."
              : "Verification is pending. Roles you publish are reviewed by an admin before they appear to students."}
          </Notice>
        </div>
      )}
      {company && company.verification_status !== "approved" && (
        <div className="mb-6 max-w-3xl space-y-4">
          {waiting ? (
            <Notice>Your verification request is waiting for an admin. You cannot send another one until it is decided.</Notice>
          ) : (
            <VerificationForm save={requestCompanyVerificationAction} />
          )}
          {requests.length > 0 && (
            <Card>
              <h2 className="text-lg font-bold">Verification history</h2>
              <ul className="mt-3 divide-y divide-ink-100 text-sm">
                {requests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span className="font-semibold capitalize">{r.status}</span>
                    <span className="text-ink-500">{timeAgo(daysSince(r.created_at))}</span>
                    {r.review_notes && <span className="w-full text-ink-600">{r.review_notes}</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
      <div className="max-w-3xl">
        <CompanyForm
          initial={{
            name: company?.name ?? "",
            industry: company?.industry ?? "",
            sizeRange: company?.size_range ?? "",
            location: company?.location ?? "",
            website: company?.website ?? "",
            about: company?.about ?? "",
          }}
          save={saveCompanyAction}
        />
      </div>
    </>
  );
}
