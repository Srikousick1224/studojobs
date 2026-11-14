import { connection } from "next/server";
import type { Metadata } from "next";
import { Bookmark } from "lucide-react";
import { LiveJobCard } from "@/components/features/LiveJobCard";
import { Button } from "@/components/ui/Button";
import { EmptyState, Notice, PageHeader } from "@/components/ui/Misc";
import { listSavedJobs } from "@/lib/saved/queries";

export const metadata: Metadata = { title: "Saved opportunities" };

export default async function SavedPage() {
  await connection();
  const { jobs, total } = await listSavedJobs();
  const hidden = total - jobs.length;

  return (
    <>
      <PageHeader title="Saved opportunities" text="Opportunities you bookmarked. They are saved to your account, so they follow you to any device." />
      {hidden > 0 && <Notice tone="info">{hidden} saved {hidden === 1 ? "listing is" : "listings are"} no longer open and {hidden === 1 ? "is" : "are"} hidden.</Notice>}
      {jobs.length === 0 ? (
        <EmptyState icon={Bookmark} title="Nothing saved yet" text="Tap the bookmark on any listing to keep it here." action={<Button href="/jobs">Browse opportunities</Button>} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {jobs.map((j) => <LiveJobCard key={j.id} job={j} saveMode="student" saved />)}
        </div>
      )}
    </>
  );
}
