/**
 * Small in-memory rate limiter (fixed window) for Server Actions and Route Handlers.
 *
 * Honest limits: the counters live in the memory of ONE server instance. On Vercel several instances can run
 * at once, so this blunts bursts and accidental loops but is not a hard guarantee. Strict, shared limits need
 * a shared store (Postgres function or Upstash Redis) — see docs/DEVELOPMENT_PLAN.md, Phase 4.
 * Database triggers already cap reports (10/day) and rows per student, so the worst abuse is stopped there too.
 */
interface Bucket { count: number; resetAt: number }
const store = new Map<string, Bucket>();
const MAX_KEYS = 5000;

export interface RateResult { ok: boolean; retryAfterSec: number }

export function rateLimit(key: string, max: number, windowMs: number, now: number = Date.now()): RateResult {
  if (store.size > MAX_KEYS) {
    for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
    if (store.size > MAX_KEYS) store.clear(); // last resort: never grow without bound
  }
  const b = store.get(key);
  if (!b || b.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (b.count >= max) return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  b.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

/** Friendly sentence for a refused request. */
export function tooManyMessage(r: RateResult): string {
  const mins = Math.ceil(r.retryAfterSec / 60);
  return mins > 1 ? `You are doing that too often. Please try again in about ${mins} minutes.` : "You are doing that too often. Please wait a moment and try again.";
}

/** Test helper. */
export function _resetRateLimits() { store.clear(); }
