# StudoJob — Phase 2 Progress (Milestone: Stage D + Google/GitHub sign-in implemented; migration 007 APPLIED to the live database 2026-11-03; real Google/GitHub sign-in manual tests NOT yet completed)

Date: 2026-10-31 · Founder: Harish · Status: **Stages A, B, C written. Stage D (authentication) NOT started.**

> Rule for the next chat: do not claim anything is done unless this file lists it as verified, and always say
> *where* it was verified (local stand-in or real Supabase). Right now **nothing has been verified against a real Supabase project.**

## How to read the evidence labels

| Label | Meaning |
|---|---|
| **Implemented** | The code/SQL exists in this ZIP. Says nothing about whether it works. |
| **Locally tested** | Run today on a clean extract, using Node + an in-memory Postgres (PGlite) with small stand-ins for Supabase `auth` and `storage`. |
| **Real Supabase** | Run against a real hosted Supabase project. **Nothing is in this category yet.** |
| **Re-checked today** | I (Claude) re-ran the command in this session on a clean copy of the ZIP you uploaded. |
| **Earlier record** | Taken from the notes the previous session saved in the Project (`claude/phase2-progress.md`). I could not re-observe it today. |

---

## 1. Status at a glance

| Stage | Status | Evidence |
|---|---|---|
| A. Inspect | Done | Earlier record + re-checked today (see 2) |
| B. Supabase integration code | Written; builds | Re-checked: build passes. **Not run against a live project** |
| C. Database (6 migrations) | Written; 101 local checks pass | Re-checked: `npm run test:db` = 101 passed, 0 failed. **Not applied to a real project** |
| D. Authentication | **Implemented; locally tested** | 13 unit tests + 53 browser checks vs a local FAKE Supabase; build/lint/test:db pass. Real project + real email **not tested** (see §12) |
| E–J | Not started | — |

## 2. Stage A — Inspection results

Earlier record (previous session):
- The workspace structure matched the Phase 1 handoff report **plus** Supabase packages, clients, a `proxy.ts` and six SQL migrations. The Phase 1 report said no Supabase code existed, so its sections 2, 6 and 8 are outdated; this file replaces them.
- The Supabase code and SQL were reviewed line by line and tested before being relied on.
- Baseline `tsc`, lint and build were clean.
- Next.js 16: `middleware.ts` is now `proxy.ts`; Cache Components is enabled, so `searchParams` must be read inside `<Suspense>`.

Re-checked today (clean extract of your ZIP, 83 files):
- No real secrets in the ZIP (scanned for JWT-looking strings and `sb_secret_`/service-role values: none). `.env.example` holds blank placeholders only.
- `package.json` + `package-lock.json` are consistent: `npm ci` installed 394 packages with no errors.

## 3. Stage B — Supabase integration (implementation details)

Files (all in `src/`): see section 5 for the full list.

- `lib/env.ts` reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also accepted). Validates with zod; rejects placeholder values, non-Supabase hostnames, and keys that are not `sb_publishable_…`/`eyJ…`. If invalid, the app behaves as "not configured".
- `lib/supabase/client.ts` — browser client (publishable key only).
- `lib/supabase/server.ts` — server client using the request cookies; acts as the logged-in user so RLS applies. `import "server-only"`.
- `lib/supabase/session.ts` — used by the proxy: refreshes the session and calls `auth.getClaims()` (verifies the JWT signature) to get the user id.
- `proxy.ts` — runs on every request except static assets; redirects logged-out visitors from `/student`, `/employer`, `/admin` (and sub-paths) to `/login?next=…`. **Fail-closed:** if Supabase is not configured, `userId` is null, so dashboards stay locked.
- `lib/safe-redirect.ts` — `safeNextPath()` blocks open redirects (`//evil.com`, `https://…`, backslashes). **Written but not used by anything yet** (Stage D will use it).
- Design choice: the service-role/secret key is deliberately unused anywhere in the app.

## 4. Stage C — Database migrations (implementation details)

Apply in numeric order (SQL Editor, one file at a time):

| File | Contents |
|---|---|
| `…000001_types_and_helpers.sql` | 12 enums (roles, job type/status, application status, etc.), `set_updated_at`, `slugify` |
| `…000002_core_tables.sql` | 16 tables (see below), constraints, indexes |
| `…000003_functions_and_triggers.sql` | `private` schema: 14 helper functions + guard/notify triggers (all `security definer` with `set search_path = ''`), `on_auth_user_created` signup trigger |
| `…000004_row_level_security.sql` | RLS enabled on every table, 52 policies, grants (anon revoked then given read on public job data only) |
| `…000005_storage.sql` | 3 buckets + 9 `storage.objects` policies |
| `…000006_reference_data.sql` | Job categories and skill names only. **No fake companies or jobs.** |

Tables (16): profiles, student_profiles, employer_profiles, companies, jobs, job_categories, applications, saved_jobs, resumes, skills, student_skills, job_skills, interviews, notifications, company_verifications, reports.

Buckets: `resumes` (private, 5 MB, PDF/DOCX), `verification-docs` (private, 5 MB, PDF/PNG/JPEG), `company-logos` (public, 2 MB, PNG/JPEG/WebP; SVG deliberately blocked). Folder convention: first folder = owner id.

Statuses: application = applied, under_review, shortlisted, interview_scheduled, selected, rejected, withdrawn. Job = draft, pending_review, published, paused, closed, rejected.

Design decisions: education/projects/certifications/preferred locations are JSON/array columns on `student_profiles`, not extra tables. `resources` and `audit_log` tables are NOT created.

## 5. Files created or modified

**Created in Phase 2**
- `src/proxy.ts`
- `src/lib/env.ts`, `src/lib/safe-redirect.ts`
- `src/lib/supabase/client.ts`, `server.ts`, `session.ts`
- `supabase/migrations/20261031000001…000006_*.sql` (6 files)
- `supabase/tests/db.test.mjs`
- `PHASE2_PROGRESS.md` (this file)

**Modified in Phase 2**
- `package.json` (new deps: `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `server-only`; dev: `@electric-sql/pglite`, `tsx`; script `test:db`), `package-lock.json`
- `.env.example` (Supabase placeholders), `README.md`, `ARCHITECTURE.md` (section 8; corrected in this milestone: env-var table and test count)

**Phase 1 files (unchanged as far as I can tell)** — all of `src/app/**`, `src/components/**`, `src/hooks/useSavedJobs.ts`, `src/lib/{data,types,utils,backend,sample-people}.ts`, config files. I had no Phase 1 ZIP to diff against, so "unchanged" is an assumption, not a verified fact.

**Not yet used:** `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/safe-redirect.ts` are not imported by any page or component. They are type-checked by the build but have never been executed. `tsx` (dev dependency) is not referenced by any script.

## 6. Test results — all 101 database checks (re-run today, 0 failures)

Command: `npm run test:db`. Result: **101 passed, 0 failed.**

| Group | Checks | What was attacked / confirmed |
|---|---|---|
| Applying migrations | 10 | All 6 files apply cleanly; 16 tables; RLS on every table; reference data loads; no fake companies/jobs |
| Signup and role safety | 9 | Signup with `role=admin` becomes a student; no self-promotion to admin; anonymous cannot read profiles; cannot insert a fake admin |
| Companies and verification | 9 | Student cannot create a company; no pre-approved or self-verified companies; no ownership theft; unverified companies invisible to the public |
| Job posting and moderation | 16 | Unverified employer's "publish" goes to review; pay-disclosure rule; past deadline rejected; admin approves verification; renaming resets approval; public sees only published jobs |
| Applications (incl. resumes, interviews) | 43 | No anonymous/employer/impersonated applications; duplicates blocked; only published, in-deadline jobs; resume type/size/ownership; employer sees resumes and profiles only for their own applicants; rivals see nothing; status-change limits; interview rules; withdrawal rules |
| Saved jobs, notifications, reports | 14 | No saving for others; no forged or foreign notifications; report flow, duplicate and anonymous reports blocked; reported employer cannot read reports; admin resolves; admin can reject listings; test file has no SQL typos |
| **Total** | **101** | |

Today's other checks (clean extract, `npm ci` first):
- `npm run lint`: 0 problems.
- `npm run build`: success, 38 pages generated, "Proxy (Middleware)" registered.
- `npx tsc --noEmit` alone: 1 error (`Cannot find name 'LayoutProps'` in `src/app/layout.tsx`). This type is generated by Next.js during the build, and the build's own TypeScript step passes. Treated as a tooling quirk, not a code bug, but I did not investigate further.
- Server smoke test **without any Supabase env vars**: `/`, `/jobs`, `/jobs/j-101`, `/login`, `/register` return 200; `/student`, `/employer/jobs/new`, `/admin`, `/admin/moderation` (and `/student/saved`) return 307 to `/login?next=…`.

## 7. Security verification (three separate levels — not equivalent)

"Real Supabase" is **"No" in every row**. Nothing below has been run on your Supabase project.

| Control | Implemented | Locally tested (stand-in) | Real Supabase |
|---|---|---|---|
| RLS enabled on all 16 public tables | Yes | Yes | **No** |
| Signup can never create an admin | Yes (trigger) | Yes | **No** |
| Role/suspension changes admin-only; no self-promotion | Yes | Yes | **No** |
| Anonymous users see only published jobs, verified companies, categories, skills | Yes | Yes | **No** |
| Company self-verification blocked; rename resets approval | Yes | Yes | **No** |
| Unverified employer publish → `pending_review` | Yes | Yes | **No** |
| Pay disclosure (paid needs range, unpaid has none) | Yes | Yes | **No** |
| One application per student/job; only published, in-deadline jobs | Yes | Yes | **No** |
| Employer sees applicant profile/resume only after that student applied to their job | Yes | Yes | **No** |
| Resume folder ownership (student writes only own folder) | Yes (storage policy) | Yes, **against a hand-written `storage.foldername` stand-in** | **No** |
| Resume type/size rule on the `resumes` table | Yes | Yes | **No** |
| Bucket size and MIME limits (Storage API enforces them) | Yes (bucket config) | **No — PGlite has no Storage API** | **No** |
| Public logo bucket; SVG blocked | Yes (bucket config) | **No** | **No** |
| `verification-docs` bucket policies | Yes | **Not covered by any of the 101 checks** (I found no test for it) | **No** |
| Notifications only created by triggers | Yes | Yes | **No** |
| Reports flow (dedupe, reporter cannot dismiss, subject cannot read) | Yes | Yes | **No** |
| `on_auth_user_created` trigger on the real `auth.users` | Yes | Tested on a **simplified stand-in `auth.users`** | **No** |
| Grants: anon limited to read on public job data | Yes | Yes (stand-in roles `anon`/`authenticated`) | **No** |
| Supabase advisors (security/performance lint) | — | — | **Not run** |
| Proxy redirects logged-out users from dashboards | Yes | **Partly:** smoke-tested only with Supabase NOT configured (fail-closed path) | **No** |
| Proxy with a real logged-in session; `getClaims()` with real keys | Yes | **No** | **No** |
| Env validation (`env.ts`) | Yes | Exercised only indirectly by the smoke test; **no unit test** | **No** |
| `safeNextPath` open-redirect guard | Yes | **No test; not used yet** | **No** |
| Server-side role checks in dashboards | **No (Stage D)** | — | — |
| Rate limiting / abuse protection | **No** (only DB-side per-user row limits, e.g. max 5 resumes and 30 skills per student, via `enforce_row_limit` triggers; **none of the 101 checks tests these limits**) | — | — |
| Security headers, CSRF review, audit log | **No** | — | — |

## 8. What was tested using temporary stand-ins

`supabase/tests/db.test.mjs` builds, inside PGlite: roles `anon`/`authenticated`/`service_role`; a minimal `auth.users` table (id, email, raw_user_meta_data) and an `auth.uid()` that reads a session setting; a minimal `storage.buckets`/`storage.objects`; and a hand-written `storage.foldername()`. Everything in `public` and `private` is the **real** migration code, but the Supabase parts around it are imitations. Differences that could matter on the real service: real `auth.users` has many more columns and its own triggers; real `storage.objects` has more columns and ownership/grants; real roles have default grants on `public`; hosted Postgres runs your SQL as a specific role (`postgres`) with its own privileges.

## 9. What still requires verification against real Supabase

Do these after you create the project (README steps), in this order:
1. All six migrations run with **no errors** in the SQL Editor (especially 003: creating the trigger on `auth.users`, and 005: inserting buckets and `storage.objects` policies).
2. Table Editor shows 16 tables, each with RLS enabled; Storage shows the 3 buckets with the right limits/public flags.
3. Supabase **Advisors** (Security and Performance) show no serious warnings; read each one.
4. Sign up two normal users and an employer (Stage D needed, or via the Auth dashboard "Add user"): confirm a `profiles` row appears with the right role, and that a `role: admin` signup becomes a student.
5. With each real user's session: re-try the key attacks (self-promote, read another student's resume, apply twice, read others' applications, apply to an unpublished job).
6. Upload a real PDF; confirm a 6 MB file and an `.exe`/SVG are rejected by Storage itself.
7. Confirm the `private` schema is not reachable through the Data API (Settings → API → exposed schemas should NOT list `private`).
8. Confirm real email delivery (confirm signup, reset password) and the redirect URL allow-list (needed for Stage D).
9. Run the proxy with real keys: logged-in user reaches the dashboard; logged-out is redirected; token refresh works.

## 10. Known bugs and limitations

1. **No login exists**, so dashboards cannot be opened at all yet (by design until Stage D).
2. **Stage D features are absent:** register/login/logout actions, `/auth/callback`, `/forgot-password` (404 today), `/reset-password`, email verification handling, server-side role checks, logged-in header state. `/auth/callback` also returns 404 today.
3. **Dashboards are locked by the proxy only.** A logged-in *student* could open `/admin` or `/employer` pages once login exists unless Stage D adds role checks. (Data would still be protected by RLS, but the pages must also be blocked.)
4. **The footer still links to "Admin console"** (`/admin`). Remove it in Stage D.
5. All page content is still **fictional sample data** (`lib/data.ts`, `lib/sample-people.ts`). `BACKEND_READY` is still `false`.
6. `/jobs/nope` returns HTTP 200 with not-found content instead of 404 (seen in Cache Components mode; confirmed again today).
7. Standalone `npx tsc --noEmit` fails on `LayoutProps` (see section 6). Use `npm run build` as the type check.
8. Frontend status values are still the old set (applied/reviewing/shortlisted/interview/offer/rejected) in `src/lib/types.ts`, `StatusPill`, `ApplicantTable`, student applications page. The database uses the new set (applied/under_review/shortlisted/interview_scheduled/selected/rejected/withdrawn). They must be reconciled when pages are wired to data.
9. `ARCHITECTURE.md` sections 1–7 are the early sketch; section 8 and the SQL are the source of truth.
10. Not built: `resources` and `audit_log` tables, file upload UI, rate limiting (Upstash), email (Resend), sitemap pages (`/about`, `/privacy`, `/terms`, `/forgot-password`, several employer/admin/student sub-pages).
11. Never done: browser/mobile visual testing, accessibility audit, `npm audit` review, unit/e2e tests (only the DB test exists).
12. Unused: `tsx` dev dependency; `client.ts`, `server.ts`, `safe-redirect.ts` (until Stage D).
13. `next dev` rewrites `AGENTS.md` and may re-add its block. This is normal; keep the file.

## 11. Stage D — implementation requirements (NOT started)

**Before coding:** read the auth/proxy/server-actions/cookies guides in `node_modules/next/dist/docs/` (this Next.js 16 differs from older versions). Check Supabase docs for `@supabase/ssr` with `getClaims`, PKCE email links and `verifyOtp`.

**Prerequisites (founder):** Supabase project created; `.env.local` filled; six migrations applied with no errors; Auth → URL Configuration: Site URL `http://localhost:3000`, Redirect URLs `http://localhost:3000/**`; "Confirm email" ON. Supabase's built-in email sender is rate-limited and for testing only; a custom SMTP provider (e.g., Resend) is needed before launch.

| # | Requirement | Details / acceptance test |
|---|---|---|
| 1 | Student registration | Server Action; zod-validated name, email, password (min 8–12, check strength); calls `auth.signUp` with `options.data = { role: "student", full_name }` and `emailRedirectTo` = `${SITE_URL}/auth/callback`. Never accept `admin` from the form. Test: new student gets a `profiles` + `student_profiles` row. |
| 2 | Employer registration | Same, role `employer`; extra fields (company name, work email). Warn that free-mail addresses go to manual review. Test: `employer_profiles` row exists; company created in `pending` state. |
| 3 | Login / logout | Login Server Action (`signInWithPassword`); generic error message ("Invalid email or password") so accounts cannot be enumerated; unconfirmed email shows a clear "verify your email" message; logout via POST Server Action (`signOut`). Redirect to `safeNextPath(next, roleHome)`. Test: wrong `next=//evil.com` falls back to the home dashboard. |
| 4 | Email verification | `/auth/callback` Route Handler exchanging the code / verifying the token hash; success → sign-in and role dashboard; failure → friendly error page; "resend verification email" action. Test with a real inbox. |
| 5 | Password reset | `/forgot-password` (always shows the same success message), `/reset-password` (works only inside a valid recovery session), `updateUser({ password })`, then sign out other sessions. |
| 6 | Server-side role verification | A `getCurrentUser()` helper: `getClaims()`/`getUser()` plus a `profiles` read for role and the `is_suspended` flag. Each dashboard `layout.tsx` calls it and `redirect()`s: logged-out → `/login`, wrong role → own dashboard (or 403 page), suspended → blocked page. Never trust role from the form, URL or `user_metadata`. Admin only via the SQL step in the README. |
| 7 | Protected dashboards | `/student/**`, `/employer/**`, `/admin/**` need correct role. Replace the footer "Admin console" link. Keep `proxy.ts` as the first layer, not the only one. Convert the client-only dashboard layouts so the server check can run (a server layout wrapping the existing client shell). |
| 8 | Secure session management | Cookies handled by `@supabase/ssr` (HttpOnly, Secure in production, SameSite=Lax); proxy refreshes tokens; no tokens in localStorage or URLs; handle expired sessions gracefully; sign-out clears cookies. |
| 9 | UI | Header shows logged-in state (name, dashboard link, logout) and Login/Register when logged out; forms show field-level errors and loading state; accessible labels; `BACKEND_READY`-style notice removed from auth forms only. |
| 10 | Protection against abuse | At minimum: generic errors, no user enumeration, input length limits. Add rate limiting (Upstash) as its own later task and say so honestly. |

**Stage D test plan (must be run and reported honestly):** register student → confirm email → login → lands on `/student`; student opens `/admin` and `/employer` → blocked; employer → `/employer`; logged-out → redirected; wrong password; reset flow; logout then back button; `next` open-redirect attempts; admin created via SQL can open `/admin`; suspended user blocked. Then repeat the section 9 database checks with the real users. Also add automated tests for the auth helpers where possible.

**Out of scope for Stage D:** profile editing, applications, job posting, uploads, admin actions (later stages).

## 12. Exact next steps

1. (You) Extract the ZIP, run `npm install` and `npm run dev`, confirm the public site opens. (See the instructions in the chat reply.)
2. (You) Create the Supabase project, fill `.env.local`, run the six migrations, set Auth URL settings. Do not paste keys in chat.
3. (Next chat) Run the section 9 verification items that do not need login (migrations applied, tables, buckets, advisors) and report results honestly; fix any migration problems found on the real project first.
4. (Next chat) Start Stage D in this order: server `getCurrentUser()` + role-guarded layouts → register → `/auth/callback` → login/logout → forgot/reset password → header state → tests.

## 13. Important decisions and standing instructions (carried forward)

- Extend the existing implementation; do not redesign. Keep the "Studo" visual identity.
- No fake auth, no fabricated real companies/jobs. Sample companies are fictional (Tidal Finance is intentionally "unverified").
- No public admin registration. Do not trust frontend role checks; enforce server-side and with RLS.
- Secrets never in code, git, or chat. Service-role key is not used by this app.
- Founder is on Windows (VS Code + PowerShell, Node 20+). Give Windows commands. Explain simply, keep replies short (low token use), and check/correct the founder's grammar briefly.
- After each milestone report: done, files changed, working, tests run, credentials still needed, bugs, next.

---

## 14. Update log — real Supabase project (2026-10-31, after the ZIP milestone)

**Done (observed through the Supabase integration, read-only except project creation):**
- Integration is authorized. Organizations visible: 1 (`kishore`, free plan). Founder confirmed this is his intended organization.
- No existing StudoJob project existed (project list was empty before creation).
- Project **created** with the integration: name `studojob`, ID/ref `wudtjvgwscwivaqieywn`, region `ap-south-1` (Mumbai), PostgreSQL 17, status `ACTIVE_HEALTHY`, API URL `https://wudtjvgwscwivaqieywn.supabase.co`. The database password was handled by Supabase and never shown in chat. Plan: free. No charge accepted.
- Inspection of the new project: **0 public tables, 0 policies, 0 storage buckets, 0 auth users, no `private` schema, 0 migrations recorded.** It is a clean, empty project, so there are no conflicts and no existing data.
- Compatibility facts read from the real project: `storage.foldername(name text) -> text[]` exists; roles anon/authenticated/service_role exist; `auth.users` and `storage.objects` have the columns the migrations use; `gen_random_uuid()` is available and the migrations need no extension; default privileges on `public` grant to anon/authenticated (migration 004 revokes anon explicitly). Supabase security advisors: **0 findings on the empty project** (this proves nothing about the StudoJob schema yet).

**NOT done / still unverified on real Supabase:** all six migrations (not applied), every security rule in section 7, Storage limits, the signup trigger on the real `auth.users`, Auth settings (Site URL, Redirect URLs, "Confirm email" — the integration cannot read them; founder sets them in the dashboard), whether the `private` schema is hidden from the Data API (default exposure not checked), and the local app connection (`.env.local` is on the founder's computer; not yet configured).

**Next:** founder approves the migration plan -> apply 001-006 in order -> verify tables, FKs, indexes, policies, buckets, advisors -> run real attack tests -> then Stage D.

---

## 15. Update log — migrations applied and verified on REAL Supabase (2026-11-01)

Project: `studojob`, ID `wudtjvgwscwivaqieywn`, Mumbai. Founder approved the plan; all six migrations were applied **one at a time with the Supabase integration, each returned success, no errors**. Recorded migration history (names): types_and_helpers, core_tables, functions_and_triggers, row_level_security, storage, reference_data. Note: the SQL sent to Supabase had the explanatory comments removed (logic unchanged); the files in `supabase/migrations/` remain the readable source of truth. The recorded versions are Supabase timestamps, not the local file numbers.

**Verified on the real project (observed):**
- 16 public tables; RLS enabled on all 16 (none without); 52 public policies + 9 storage policies; 28 foreign keys; 54 check constraints; 52 indexes; 12 enums; 28 triggers on public tables; 31 functions in `private`.
- Trigger `on_auth_user_created` exists on the real `auth.users` and is enabled.
- Buckets: `resumes` (private, 5 MB, 2 types), `verification-docs` (private, 5 MB, 3 types), `company-logos` (public, 2 MB, 3 types).
- Reference data: 14 job categories, 33 skills; 0 companies and 0 jobs (no fake data).
- `anon` can only SELECT on jobs, companies, job_categories, skills, job_skills.
- Supabase **security advisors: 0 findings**. Performance advisors: 26 INFO "unused index" (expected on an empty DB; not removed) and 2 WARN "multiple permissive policies" (`job_categories` SELECT; `profiles` UPDATE for authenticated). Both WARNs are minor performance notes, not security problems; no change made.
- **116 real attack/behaviour checks passed, 0 failed** (run as the real `anon` and `authenticated` database roles with simulated JWT claims, inside one transaction that was rolled back; afterwards the project was confirmed clean). Covered: signup cannot create admin; no self-promotion or self-suspension changes; anon cannot read profiles or insert; company self-verification blocked and forced to pending; unverified publish forced to `pending_review`; verified publish instant; pay disclosure; past deadline; employer cannot approve own verification, admin can; rival employers cannot edit or see each other's companies, jobs, applications, resumes, interviews; apply rules (anon, employer, impersonation, duplicate, non-published, forced status, cover note locked, cannot attach another's resume); status-change limits and notifications; no forged notifications; resume folder, size, type and 5-per-student limit; interview rules; withdraw rules; saved jobs; reports flow and admin resolution; admin visibility; and storage-policy checks for the resumes, verification-docs and company-logos buckets (own-folder upload, applicant-only employer read, rival blocked, admin read, anon logo read).

**Still NOT verified on real Supabase (do not claim):**
- Storage API limits (5 MB / 2 MB size and MIME types): the checks above inserted rows directly into `storage.objects`, which bypasses the Storage API, so file-size and file-type enforcement is untested.
- Real file upload/download through the Storage API and signed URLs.
- Real signup through Supabase Auth (the trigger was exercised by inserting test rows into `auth.users`, not by the Auth API).
- Auth dashboard settings (Site URL, Redirect URLs, "Confirm email"): not readable by the integration; founder must set and confirm them.
- Whether the Data API exposes the `private` schema (not readable by the integration). The 31 `private` functions are executable by `anon`/`authenticated` at database level (Postgres default); they are only reachable through the API if `private` is exposed. Founder checks Settings -> API / Data API: exposed schemas must NOT include `private`.
- The local Next.js app connection (`.env.local` on the founder's computer), the proxy with a real session, `getClaims()` with real keys, email delivery.
- The `slug`, notification wording, and `jobs` deadline `now()` rules were exercised only as far as the 116 checks go.
- Default privileges for tables created in the future by the `supabase_admin` role still grant to `anon`; tables created through the SQL editor/migrations (owner `postgres`) are covered by migration 004. Any new table must get RLS and explicit grants.

**Next:** founder configures Auth settings and `.env.local` (README), checks the `private` exposure, then Stage D.


---

## 12. Stage D — what was built (2026-11-02)

**Evidence labels:** *Re-checked* = run in this session. *Fake Supabase* = run in a real Chromium browser against a small local imitation of Supabase Auth + `profiles` (kept outside the project, not shipped). *Real Supabase* = **nothing in Stage D has been run against your real project yet.**

### Flow
- **Register** (`/register`): Server Action `registerAction` → zod validation (name 2–100, email, password 8–72 with letter+number, confirm match, account type must be `student` or `employer`; `admin` is rejected) → `auth.signUp` with `data: {full_name, role}` and `emailRedirectTo = SITE_URL/auth/callback?next=/auth/verified`. The existing DB trigger creates `profiles` + `student_profiles`/`employer_profiles` (not duplicated; no migration added). Always shows the same "Check your inbox" panel (no account enumeration).
- **Verify**: email link → `/auth/callback` (Route Handler) → `exchangeCodeForSession(code)` (PKCE) or `verifyOtp(token_hash)` → `/auth/verified`. Expired/invalid/other-browser links → `/auth/error` with a resend form (or "request new reset link").
- **Login** (`/login`): `signInWithPassword`; generic "Invalid email or password."; unverified → clear message + resend; role read from `profiles` (not from the browser); suspended → refused; redirect via `postLoginPath()` (honours `?next=` only if same-site and inside the user's own area).
- **Logout**: `logoutAction` (`signOut({scope:"local"})`) from header and both dashboard shells.
- **Forgot/reset**: `/forgot-password` (same message for any email) → email → `/auth/callback?next=/reset-password` → `/reset-password` (form only if the link created a session) → `updateUser` → `signOut({scope:"others"})` → role dashboard.
- **Protection (3 layers):** `proxy.ts` (logged-out → `/login?next=`; wrong role → own dashboard; suspended → `/auth/suspended`; runs on every navigation) → `requireRole()` in each dashboard layout via `RoleLayout` (reads role from `profiles`, requires verified email) → RLS in the database.
- **Header** shows Dashboard/Log out when signed in (inside `<Suspense>`, as Cache Components requires). Footer "Admin console" link removed. Logged-in users visiting `/login`/`/register` go to their dashboard.
- **Cookies:** HttpOnly, SameSite=Lax, Secure in production (`src/lib/supabase/cookies.ts`). Consequence: a *browser-side* Supabase client cannot read the session; later features needing it (e.g. uploads) must use Server Actions or signed upload URLs.

### Files created
`src/lib/auth/{schemas,roles,state,dal,actions}.ts`, `src/lib/supabase/cookies.ts`, `src/app/auth/callback/route.ts`, `src/app/(auth)/{forgot-password,reset-password}/page.tsx`, `src/app/(auth)/auth/{verified,error,suspended}/page.tsx`, `src/components/features/{SubmitButton,ResendVerification,ForgotPasswordForm,ResetPasswordForm,RedirectIfSignedIn}.tsx`, `src/components/ui/PasswordField.tsx`, `src/components/layout/{RoleShells,RoleLayout,AuthNav}.tsx`, `tests/auth.test.ts`.
### Files modified
`src/proxy.ts`, `src/lib/supabase/{server,session}.ts`, `src/lib/env.ts` (+`getSiteUrl`), `src/components/features/AuthForm.tsx` (now real), `src/components/layout/{DashboardShell,SiteHeader,SiteFooter}.tsx`, `src/components/ui/{Field,Misc}.tsx` (export `FieldWrap`; `Notice` error tone), `src/app/{student,employer,admin}/layout.tsx`, `src/app/(site)/layout.tsx`, `src/app/(auth)/{login,register}/page.tsx`, `package.json` (`test:auth`), `README.md`.
### Fixed on the way
- `proxy.ts` used to drop refreshed session cookies when it redirected (could log a user out by accident). Redirects now copy them.
- Resend form was nested inside the login `<form>` (found by the browser test); moved outside.

### Test results
| Check | Result | Where |
|---|---|---|
| `npm run build` | passes (44 pages, Proxy registered) | Re-checked |
| `npm run lint` | 0 problems | Re-checked |
| `npm run test:db` | 101 passed, 0 failed | Re-checked |
| `npm run test:auth` | 13 passed, 0 failed (schemas, admin rejected, open-redirect, role-aware `next`) | Re-checked |
| Browser flow, 53 checks | 53 passed: register/verify/login/logout for student + employer, admin & suspended handling, role isolation (all cross-role URLs), `next` handling, HttpOnly cookies, forgot/reset, bad/expired/other-browser links, tampered `accountType=admin` | Fake Supabase only |

### Not verified / remaining issues
1. **Everything above that touches Supabase is unverified on the real project** (real GoTrue responses, real email delivery, PKCE across your real redirect allow-list, trigger on real `auth.users`).
2. No rate limiting beyond Supabase's own limits; no CAPTCHA. Built-in Supabase email is for testing only (needs custom SMTP before launch).
3. Link must be opened in the **same browser** that requested it (PKCE). Other browsers get the friendly error page.
4. `/reset-password` works for any signed-in session, not only a recovery session (acts as "change password"). Acceptable now; revisit with re-authentication.
5. Email content/templates are Supabase defaults (not branded).
6. Dashboards still show sample data; `BACKEND_READY` is still false; status-name mismatch (§10.8) still open; `/jobs/nope` still returns 200.
7. No accessibility audit or mobile-device testing beyond one 390px screenshot.
8. Nothing was applied to the live database; no migration was added.


---

## 16. Stage D addendum — Google and GitHub sign-in (2026-11-02)

**Evidence labels as in §12.** *Fake Supabase* = real Chromium vs a local imitation of Supabase Auth with a fake Google/GitHub consent step. **The real Google/GitHub consent screens and the real Supabase project have NOT been exercised.**

### Problem solved: social users have no role
The existing signup trigger made every new user a student and created a `student_profiles` row, and the DB could not tell "chose Student" from "never chose". So a **new migration** was needed (no applied migration was edited).

### Migration `supabase/migrations/20261102000007_social_onboarding.sql` — APPLIED to the live database on 2026-11-03 (see section 17)
1. `profiles.onboarded_at timestamptz` (nullable); all existing rows back-filled to `created_at` (existing users keep their roles, never see onboarding).
2. `private.handle_new_user()` replaced in place (same trigger, not duplicated): signup carrying `role=student|employer` (our email form) behaves as before and is marked onboarded; any other signup (Google/GitHub) gets only a `profiles` row (student, not onboarded) and no sub-row. `full_name` falls back to the provider's `name`/`user_name`.
3. `private.profiles_guard()` replaced: still blocks id/suspension changes and self-promotion. New: a non-admin may change role **once**, only to student or employer (never admin), in the same update that first sets `onboarded_at`; afterwards role and `onboarded_at` are frozen.
4. `public.complete_onboarding(p_role text)`: SECURITY INVOKER (RLS + guard still apply), `student|employer` only, once only, never for admin/suspended, creates the matching sub-row (idempotent). Execute granted to `authenticated` only.
Tests: `npm run test:db` = **123 passed** (101 old + 22 new: social signup, both choices, repeat/duplicate refusal, `admin` refused, direct self-promotion refused, reset of `onboarded_at` refused, admin/suspended refused, anonymous refused, back-fill on a pre-existing database).

### App behaviour
- **Buttons** `Continue with Google/GitHub` (`SocialButtons.tsx`, inline brand SVGs) on `/login` and `/register`: browser client `signInWithOAuth({ redirectTo: ${origin}/auth/callback })`; spinner + lock against repeat clicks; unlocked on Back-button return; errors shown. Wanted page is kept in a 10-minute `sj_next` cookie (re-validated on the server) so the redirect URL has no query string.
- **Callback** `/auth/callback`: no `?next=` = OAuth, `?next=` = email flows. Exchanges the code (PKCE) → `getUser()` → refuses and signs out accounts with no verified email (e.g. GitHub) or a suspended profile → not onboarded → `/onboarding` → otherwise `postLoginPath(sj_next, role)`. Provider errors (`access_denied`, expired, `identity_already_exists`…) → `/login?error=<fixed code>` with fixed messages only (URL text is never printed).
- **Onboarding** `/onboarding` + `completeOnboardingAction`: user identity from `getUser()`; role only via the database function; `admin` rejected by zod and by the DB; double submit keeps the existing role. Name editable, saved under RLS.
- **Gates:** `proxy.ts`, `requireRole()`, header (`Finish setup` link), `/login`, `/register`, `/auth/verified` all use `viewerHome()` (suspended → onboarding → dashboard). Role always from `profiles`.
- **Legacy safety:** `fetchProfile()` falls back (everyone treated as onboarded) if the column does not exist yet, so existing email logins keep working before migration 007 is applied. **Remove this fallback once 007 is live.**
- **Account linking:** the app contains no manual linking and never links by email itself. Whether Google/GitHub sign-in with an email that already has a password account is linked is **Supabase's own server-side setting/behaviour (automatic linking of provider-verified emails)** — not verified on the real project; check Auth settings. Same user id ⇒ same profile ⇒ role preserved. If not linked, Supabase returns an "already exists" error → friendly message.
- README admin SQL now also sets `onboarded_at`.

### Files created
`supabase/migrations/20261102000007_social_onboarding.sql`, `src/lib/auth/{profile,messages}.ts`, `src/components/features/{SocialButtons,AccountTypePicker,OnboardingForm}.tsx`, `src/components/ui/BrandIcons.tsx`, `src/app/(auth)/onboarding/page.tsx`.
### Files modified
`src/app/auth/callback/route.ts`, `src/proxy.ts`, `src/lib/auth/{actions,dal,roles,schemas}.ts`, `src/components/features/{AuthForm,RedirectIfSignedIn}.tsx`, `src/components/layout/AuthNav.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/auth/verified/page.tsx`, `supabase/tests/db.test.mjs`, `tests/auth.test.ts`, `README.md`.

### Results (re-checked this session)
`npm run build` passes (45 pages) · `npm run lint` 0 problems · `npm run test:db` 123/123 · `npm run test:auth` 16/16 · browser vs fake Supabase: **58/58 social checks + the earlier 53/53 email checks still pass**.

### Not verified / open
1. Real Google and GitHub sign-in, the real redirect allow-list, and migration 007 on the real project: **not done** (needs approval, then manual tests in README/§ final report).
2. Automatic identity-linking behaviour of the real project (see above).
3. GitHub users with a private/unverified email are refused by design.
4. A social user who gives up at onboarding keeps a student-role profile with `onboarded_at` null; they cannot open any dashboard until they choose.
5. Unused-account cleanup, rate limiting and branded emails: still open.


## 17. Current state — Stage D packaging (2026-11-03) — THIS SECTION SUPERSEDES OLDER "NOT APPLIED" TEXT ABOVE

### Live database (project `studojob`, ref `wudtjvgwscwivaqieywn`)
- **Migration 007 is APPLIED** (recorded as `20261103032643_social_onboarding`; the file is `20261102000007_social_onboarding.sql`, identical to the audited SQL, sha256 `ee474fcd1668e93b57cf09063da3ff4402e3386a419baafaf5c144c77fed6b82`). Migrations 001-006 untouched. History now has 7 entries.
- Verified on the real database (structure and permissions only): `profiles.onboarded_at` exists; still exactly 3 triggers (no duplicates); `handle_new_user` and `profiles_guard` replaced; `complete_onboarding(text)` exists as SECURITY INVOKER, executable by `authenticated`, NOT by `anon`/PUBLIC; the same 3 profiles RLS policies; 0 users, 0 profiles, 0 admins. Full audit: see `MIGRATION_007_AUDIT.md` in the Claude Project.
- **Not yet proven on the real database:** the onboarding behaviour itself (no users exist yet). It is covered by the local in-memory tests only.

### Google / GitHub sign-in
- **Implemented** (`SocialButtons`, `/auth/callback`, `/onboarding`, `completeOnboardingAction`, proxy/layout role checks). Provider names `google` / `github`, server-side PKCE code exchange, `next` path validated, buttons locked after first click, cancelled/expired/invalid callbacks go to `/login?error=...`.
- Founder reports both providers are enabled in Supabase and the local redirect URL is configured. **Real Google sign-in: NOT tested yet. Real GitHub sign-in: NOT tested yet.** Manual test order: Google (new user -> onboarding -> Student -> logout -> login again), then GitHub (Employer), dashboard protection, email/password account, cancel and invalid-callback cases.
- Open: how the real project links a Google/GitHub sign-in to an existing email/password account with the same email (code requires a confirmed email; roles are never changed by linking). Verify manually.
- Cleanup to do later: remove the "legacy" fallback in `src/lib/auth/profile.ts` now that 007 is live.

### Automated test results (run 2026-11-03 on the packaged source)
See the table in the final report of this session; commands: `npm run build`, `npm run lint`, `npm run test:db`, `npm run test:auth`. There is no `npm run test` script. The earlier 58 + 53 browser checks used a local fake Supabase that is NOT shipped in this ZIP and were NOT re-run for this export.

### Local setup (Windows 11 PowerShell)
```powershell
Expand-Archive .\studojob-app-stageD-latest.zip -DestinationPath .
cd .\studojob-app
npm install
Copy-Item .env.example .env.local   # then fill in the values below in an editor
npm run dev                         # http://localhost:3000
```
Environment variable names (values stay in `.env.local`, never commit or share): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`. No service-role/secret key is used by the app. Google/GitHub client secrets live only in the Supabase dashboard.

### Next
Finish the manual Google and GitHub tests, record the results here, then (only with founder approval) Stage E.

## 18. Stage E2 — real job creation, discovery and application (2026-11-04)

**Evidence labels:** *Checked (local)* = run in this session against the code and an in-memory Postgres (PGlite) with the real migrations applied. *Not checked* = needs the live Supabase project and real accounts. **Nothing in Stage E2 has been run against the live project.** No migration was added, no live database was changed, no admin account was created.

### Implemented
- **Company profile** (`/employer/company`): create once, then edit. Database generates the slug. Verification starts as `pending`.
- **Create / edit / save draft / publish a job** (`/employer/jobs/new`, `/employer/jobs/[id]/edit`): form validates with `src/lib/stage-e/job-schema.ts`, server re-validates. Publishing from an unverified company routes the job to `pending_review` (existing `jobs_guard` rule).
- **My jobs** (`/employer/jobs`): own listings only, with status, applicant count, Edit, Pause, Resume, Close.
- **Public job discovery** (`/jobs`): real published, unexpired jobs only. Search (full-text, existing `search` column), type, work mode, level, category, location, paid-only, pagination (12 per page). Filters are plain GET links, so they work without JavaScript.
- **Job detail** (`/jobs/[id]`): real job, real company, similar jobs in the same category. Drafts, paused, rejected, closed and expired jobs return 404.
- **Student application**: Apply form (optional resume you already have, optional note up to 2000 characters). Duplicates are refused by the unique (job, student) constraint. Withdrawal stays in My applications.
- **Employer applicants**: existing Stage E screen, plus a "View resume" button that opens a 5-minute signed link (storage RLS decides access).

### Files
New: `src/lib/stage-e/job-schema.ts`, `job-view.ts`, `job-queries.ts` (server-only), `job-actions.ts` ("use server"), `src/components/features/LiveJobCard.tsx`, `JobForm.tsx`, `CompanyForm.tsx`, `ApplyForm.tsx`, `ResumeLinkButton.tsx`, `src/app/employer/company/page.tsx`, `src/app/employer/jobs/page.tsx`, `src/app/employer/jobs/[id]/edit/page.tsx`, `tests/stage-e2.test.ts`, `supabase/tests/stage-e2-db.test.mjs`.
Changed: `src/app/(site)/jobs/page.tsx`, `src/app/(site)/jobs/[id]/page.tsx` (real data), `src/app/employer/jobs/new/page.tsx`, `src/app/employer/applicants/page.tsx` (resume button), `src/app/(site)/layout.tsx` (header wrapped in `Suspense` so dynamic pages can build), `src/components/layout/RoleShells.tsx` (Company and My jobs links), `src/lib/stage-e/queries.ts` (resume id), `src/lib/stage-e/schemas.ts`, `src/lib/stage-e/result.ts`, `package.json` (new test scripts).
No longer used by any page (kept, not deleted): `PostJobForm.tsx`, `ApplyPanel.tsx`, `ApplicantTable.tsx`.

### Tests
| Command | Result |
|---|---|
| `npm run lint` | Pass |
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |
| `npm run test:db` (Stage D schema tests) | 123 passed, 0 failed |
| `npm run test:auth` | 16 passed, 0 failed |
| `npm run test:stage-e` | 10 passed, 0 failed |
| `npm run test:stage-e2` (unit: validation, mapping) | 6 passed, 0 failed |
| `npm run test:stage-e2-db` (SIMULATED workflow, PGlite) | 57 passed, 0 failed |
| Production server, no Supabase configured | `/jobs` and `/jobs/[id]` return 200 with the "not connected" message; employer pages redirect logged-out visitors to `/login` |

**Limits of the simulated test:** PGlite is one connection, so true concurrency is not simulated. The duplicate-application check therefore proves the unique constraint refuses a second insert, not the timing of two real requests. Storage (resume files) is not simulated. Nothing here proves live Supabase behaviour.

### Security review (simulated tests + code reading)
- RLS on `jobs`: logged-out visitors and students see only published, unexpired jobs. Verified.
- RLS on `applications`: a student sees only their own; an employer sees only applications to their own jobs; a student cannot change another student's application; an employer cannot change another employer's applicant. Verified.
- Role and ownership: the company, job and application owner are set from the signed-in user, not from the form. Verified.
- Status rules: students may only withdraw; employers may not set `applied`, `withdrawn`, or `interview_scheduled`. Verified.
- Server actions call `requireRole` before any write. Invalid input is refused by zod and again by the database.
- Resume access: `getResumeLinkAction` depends on storage RLS (`resumes_files_select`). **Not verified** in simulation or live.

### Known gaps and decisions needing your approval (no schema change made)
1. **Edits to a live listing are not re-reviewed.** The owner can change a published job's title or pay without a new review (test "KNOWN GAP documented"). Proposed fix (needs approval, adds a trigger change): when a non-admin changes content fields of a `published` job, set `status` to `pending_review`.
2. **Re-applying after withdrawal is blocked** by the unique constraint. Changing this needs a rule decision and a schema change.
3. **Job skills are not written from the form** (`job_skills` table exists; the skill upsert needs care with the case-insensitive unique index). Skills are not shown on job pages.
4. **No resume upload UI** yet. Students can apply without a resume.
5. **Application deadlines** are stored as 23:59:59 India time (+05:30).
6. Old sample components (`PostJobForm`, `ApplyPanel`, `ApplicantTable`) are unused but not deleted.
7. Home page, companies pages, internships page, student overview, saved jobs, student profile, admin overview and report form still use sample data.

### Manual verification still required
See `stageE2-restart-report.md` in the Project for the step-by-step Windows guide (two separate accounts are needed: one employer, one student, plus the admin for moderation).
