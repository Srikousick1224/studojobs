"use client";

import { useMemo, useState } from "react";
import { UsersRound } from "lucide-react";
import type { ApplicationStatus } from "@/lib/types";
import { applicants } from "@/lib/sample-people";
import { getJob } from "@/lib/data";
import { timeAgo } from "@/lib/utils";
import { Avatar, EmptyState, Notice } from "@/components/ui/Misc";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "./StatusPill";

export function ApplicantTable() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ApplicationStatus | "all">("all");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return applicants.filter((a) => {
      if (status !== "all" && a.status !== status) return false;
      return !term || [a.name, a.college, ...a.skills].join(" ").toLowerCase().includes(term);
    });
  }, [q, status]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-ink-100 sm:grid-cols-2">
        <Input id="aq" label="Search by name, college or skill" type="search" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select id="astatus" label="Status" value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus | "all")}>
          <option value="all">All statuses</option>
          <option value="applied">Applied</option>
          <option value="reviewing">In review</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="interview">Interview</option>
          <option value="rejected">Not selected</option>
        </Select>
      </div>
      <Notice>Filtering and search work on the sample data. Shortlisting and interview scheduling are enabled in Phase 3.</Notice>

      {rows.length === 0 ? (
        <EmptyState icon={UsersRound} title="No applicants match" text="Try a different search or status." />
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ink-100">
              <Avatar name={a.name} size={44} square={false} hue={a.name.length * 17} />
              <div className="min-w-0 flex-1 basis-48">
                <p className="font-bold">{a.name}</p>
                <p className="text-sm text-ink-500">{a.college} · applied {timeAgo(a.appliedDaysAgo).toLowerCase()}</p>
                <p className="mt-1 text-xs text-ink-500">For: {getJob(a.jobId)?.title}</p>
              </div>
              <ul className="hidden flex-wrap gap-1.5 md:flex" aria-label="Skills">
                {a.skills.map((s) => <li key={s} className="rounded-md bg-ink-50 px-2 py-1 text-xs font-medium text-ink-600">{s}</li>)}
              </ul>
              <StatusPill status={a.status} />
              <Button size="sm" variant="secondary" disabled title="Available in Phase 3">Shortlist</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
