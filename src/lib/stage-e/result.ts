/** Shape returned by every Stage E server action. Shared by server and client code (no "use server" here). */
export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

/** Result of asking the server for a short-lived resume link. */
export type ResumeLinkResult = { ok: true; url: string } | { ok: false; message: string };
