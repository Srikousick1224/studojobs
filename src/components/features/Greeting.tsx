"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};
function wordFor(h: number) {
  return h < 5 ? "Burning the midnight oil" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 22 ? "Good evening" : "Good night";
}

/** "Good morning, Harish" using the visitor's own clock. The server render says "Welcome back", so there is never a wrong greeting. */
export function Greeting({ name }: { name: string }) {
  const word = useSyncExternalStore(noop, () => wordFor(new Date().getHours()), () => "Welcome back");
  const first = name.trim().split(/\s+/)[0];
  return <>{word}{first ? `, ${first}` : ""}</>;
}
