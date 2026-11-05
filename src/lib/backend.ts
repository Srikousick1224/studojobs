/**
 * Phase 1 has no backend. Forms validate input for real, then tell the
 * user honestly that saving needs Phase 2 (Supabase). Flip this to true
 * once Supabase auth + tables exist and wire the submit handlers.
 */
export const BACKEND_READY = false;

export const BACKEND_NOTICE =
  "Your details look good. Saving is switched off in this preview because the Supabase backend is built in Phase 2.";
