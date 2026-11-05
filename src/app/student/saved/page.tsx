"use client";

import { Bookmark } from "lucide-react";
import { getJobs } from "@/lib/data";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { JobCard } from "@/components/features/JobCard";
import { Button } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/Misc";

export default function SavedPage() {
  const { ids } = useSavedJobs();
  const saved = getJobs().filter((j) => ids.includes(j.id));

  return (
    <>
      <PageHeader title="Saved opportunities" text="Opportunities you bookmarked. They are stored in this browser until accounts launch." />
      {saved.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          text="Tap the bookmark on any listing to keep it here."
          action={<Button href="/jobs">Browse opportunities</Button>}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {saved.map((j) => <JobCard key={j.id} job={j} />)}
        </div>
      )}
    </>
  );
}
