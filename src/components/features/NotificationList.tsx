"use client";

import { Bell, CalendarClock, CheckCheck, FileCheck2, Mail, Send, Sparkles, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { Reveal } from "@/components/ui/Motion";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/notifications/actions";
import type { NotificationRow } from "@/lib/notifications/queries";
import { cn } from "@/lib/utils";

function iconFor(type: string) {
  if (type === "application_received") return UserPlus;
  if (type === "application_submitted") return Send;
  if (type.startsWith("application_")) return FileCheck2;
  if (type.startsWith("interview_")) return CalendarClock;
  if (type === "employer_message") return Mail;
  return Sparkles;
}

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function NotificationList({ rows, hidden, settingsHref }: { rows: NotificationRow[]; hidden: number; settingsHref: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const unread = rows.filter((n) => !n.is_read).length;

  if (rows.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyState icon={Bell} title="You are all caught up" text="Updates about your applications and interviews will show up here." />
        {hidden > 0 && <p className="text-center text-sm text-ink-500">{hidden} hidden by your <Link href={settingsHref} className="font-semibold text-brand-700 underline">notification settings</Link>.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500" aria-live="polite">{unread > 0 ? `${unread} unread` : "Everything is read"}</p>
        <Button type="button" variant="secondary" size="sm" disabled={pending || unread === 0}
          onClick={() => start(async () => { await markAllNotificationsReadAction(); router.refresh(); })}>
          <CheckCheck className="h-4 w-4" aria-hidden="true" /> Mark all as read
        </Button>
      </div>
      <ul className="space-y-2.5">
        {rows.map((n, i) => {
          const Icon = iconFor(n.type);
          const open = () => start(async () => {
            if (!n.is_read) await markNotificationReadAction({ id: n.id });
            if (n.link) router.push(n.link); else router.refresh();
          });
          return (
            <Reveal as="li" key={n.id} variant="up" delay={Math.min(i, 6) * 50}>
              <button type="button" onClick={open} disabled={pending}
                className={cn("hover-lift flex w-full items-start gap-4 rounded-2xl p-4 text-left ring-1 transition", n.is_read ? "bg-white ring-ink-100" : "bg-brand-50/60 ring-brand-200")}>
                <span className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", n.is_read ? "bg-ink-100 text-ink-500" : "bg-brand-500 text-white")}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-ink-900">{n.title}</span>
                    {!n.is_read && <><span className="pulse-dot h-2 w-2 rounded-full bg-mint-500" aria-hidden="true" /><span className="sr-only">Unread</span></>}
                  </span>
                  {n.body && <span className="mt-0.5 block text-sm text-ink-600">{n.body}</span>}
                  <span className="mt-1 block text-xs text-ink-400">{ago(n.created_at)}</span>
                </span>
              </button>
            </Reveal>
          );
        })}
      </ul>
      {hidden > 0 && <p className="text-sm text-ink-500">{hidden} more hidden by your <Link href={settingsHref} className="font-semibold text-brand-700 underline">notification settings</Link>.</p>}
    </div>
  );
}
