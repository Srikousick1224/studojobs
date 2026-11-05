import type { Metadata } from "next";
import { connection } from "next/server";
import { JobForm } from "@/components/features/JobForm";
import { Button } from "@/components/ui/Button";
import { Notice, PageHeader } from "@/components/ui/Misc";
import { saveJobAction } from "@/lib/stage-e/job-actions";
import { getMyCompany, listCategories } from "@/lib/stage-e/job-queries";

export const metadata: Metadata = { title: "Post a role" };

export default async function NewJobPage() {
  await connection();
  const [company, categories] = await Promise.all([getMyCompany(), listCategories()]);
  return (
    <>
      <PageHeader title="Post a role" text="Save a draft to finish later, or publish. Every listing is reviewed before it goes live." />
      {!company ? (
        <div className="max-w-3xl space-y-4">
          <Notice tone="warn">Create your company profile before posting a role.</Notice>
          <Button href="/employer/company">Set up company</Button>
        </div>
      ) : (
        <div className="max-w-3xl">
          <JobForm categories={categories} save={saveJobAction} />
        </div>
      )}
    </>
  );
}
