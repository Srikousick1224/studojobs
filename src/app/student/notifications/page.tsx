import { connection } from "next/server";
import type { Metadata } from "next";
import { NotificationList } from "@/components/features/NotificationList";
import { PageHeader } from "@/components/ui/Misc";
import { listMyNotifications } from "@/lib/notifications/queries";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await connection();
  const { rows, hidden, error } = await listMyNotifications();
  return (
    <>
      <PageHeader title="Notifications" text="Updates about your applications and interviews. Choose what shows here in Settings." />
      {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : <NotificationList rows={rows} hidden={hidden} settingsHref="/student/settings" />}
    </>
  );
}
