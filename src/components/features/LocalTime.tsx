"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};
const fmt = (iso: string, tz?: string) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz, ...(tz ? { timeZoneName: "short" } : {}) }).format(new Date(iso));

/** Shows a time in the visitor's own time zone. The server render uses UTC (clearly labelled) so there is no hydration mismatch. */
export function LocalTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(noop, () => fmt(iso), () => fmt(iso, "UTC"));
  return <time dateTime={iso}>{text}</time>;
}
