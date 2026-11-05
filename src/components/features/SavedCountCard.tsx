"use client";

import { Bookmark } from "lucide-react";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { StatCard } from "@/components/ui/Misc";

export function SavedCountCard() {
  const { ids } = useSavedJobs();
  return <StatCard label="Saved opportunities" value={ids.length} icon={Bookmark} note="Stored in this browser" />;
}
