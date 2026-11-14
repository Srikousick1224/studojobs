"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Only the digest (a reference id) is shown to people; the full error stays in the server logs.
    console.error("Page error", error.digest ?? "");
  }, [error]);
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <h1 className="text-3xl font-extrabold">Something went wrong</h1>
      <p className="max-w-md text-ink-500">We could not load this page. Your data is safe. Please try again.</p>
      {error.digest && <p className="text-xs text-ink-400">Reference: {error.digest}</p>}
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button href="/" variant="secondary">Home</Button>
      </div>
    </main>
  );
}
