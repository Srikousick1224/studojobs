"use client";

/** Last-resort screen if the root layout itself fails. Plain HTML and inline styles, so it cannot fail the same way. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, textAlign: "center", padding: 24 }}>
        <div>
          <h1>StudoJob is having a problem</h1>
          <p>Please try again in a moment.</p>
          <button onClick={reset} style={{ padding: "10px 18px", fontSize: 16, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
