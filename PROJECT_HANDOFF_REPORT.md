# STUDOJOB — PROJECT HANDOFF REPORT
Date: 2026-11-14 · Founder: Harish (calls the assistant "master"; wants friendly teaching, honest answers, **every message's grammar corrected with short issue-by-issue notes**, and **low token use**) · Supersedes the 2026-10-31 report.

> Rule for the next chat: do not claim anything is done unless section 7 marks it **verified**, and always say *which kind* of verification (see "Evidence levels").

## Evidence levels (use these exact words)
- **Unit** — pure TypeScript/zod tests (`tsx --test`).
- **PGlite** — SQL/RLS tests on an in-memory Postgres (`supabase/tests/*.mjs`).
- **Local stand-in** — a *real Postgres 16* with the real migrations + a hand-written PostgREST/GoTrue imitation (`scripts/dev/*`) + Playwright browser tests. Realistic, but **not** real Supabase.
- **Real Supabase** — the live project. Only read-only checks were done by the assistant.
- **Human-verified** — Harish clicked through it himself.

## 1. Vision and objectives
StudoJob is a career ecosystem for students, fresh graduates and beginner-friendly employers: internships, entry-level and graduate jobs, freelance work, application tracking, community, career resources, and a trusted environment (verified employers, scam reporting, unpaid roles clearly labelled). Long-term: a global platform that can compete with established career sites, with its own visual identity. Authoritative objectives/modules/security rules = the Project description + Project instructions.

## 2. Stack and architecture (as built)
- **Next.js 16.4.3** App Router, Turbopack, `cacheComponents: true`, `partialPrefetching: true`; React 19.3; TypeScript; Tailwind CSS 4; lucide-react; zod.
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`): Auth (email + Google), Postgres with RLS everywhere, Storage buckets. **No service-role key anywhere in the app.**
- Rendering rule that matters: pages that need per-user/live data wrap a `Results`/`Body` component in `<Suspense>` and call `await connection()` first. `src/lib/supabase/server.ts` also awaits `connection()` before creating a client (supabase-js reads the clock). `requireRole()` does the same, so a build made without env vars can never bake a "redirect to /login" into a page.
- `src/proxy.ts` (Next 16's replacement for middleware) refreshes the session with `getClaims()` and gates `/student`, `/employer`, `/admin` by role.
- `getViewer()` (`src/lib/auth/dal.ts`, React `cache`) = `auth.getUser()` + `profiles` row. Server actions return `ActionResult` (`src/lib/stage-e/result.ts`) and always re-derive identity from the session, never from form fields; RLS/guard triggers make the final call.
- Appearance system (Settings page): settings in `localStorage`, a pre-paint `INIT_SCRIPT`, `data-*` attributes + CSS tokens (`--h` hue), `FxLayer` effects. Stays in the browser; not sent to the server.
- Security headers in `next.config.ts` (nosniff, DENY framing, referrer policy, permissions policy, HSTS, no `X-Powered-By`). **No Content-Security-Policy yet** (the inline appearance script needs a per-request nonce).
- Hosting plan: Vercel + Supabase. Free-plan limits: no branching, 2 projects per org (the second slot is used by an unrelated project named "Blonde" — **never touch it**), auto-pause.

## 3. Features completed (and how verified)
All "Local stand-in" results below were run on 2026-11-13/14 against the production build (`next build` + `next start`).
| Feature | Implemented | Verified how |
|---|---|---|
| Auth: register/login/Google/forgot/reset/onboarding/suspended pages, role gating | Yes (Stage D) | PGlite + unit (auth 16); earlier human test of Google login |
| Public jobs & internships list/detail with search, filters, pagination | Yes (Stage E) | Unit + PGlite; list pages in browser E2E |
| Apply, my applications, withdraw; employer company/jobs/applicants; admin moderation screens | Yes (Stage E/E2) | Unit + PGlite (stage-e 10, stage-e2 9 + 67 DB checks). **Not human-tested**; admin cannot be tested live (0 admins) |
| **Saved jobs stored in the database** (`saved_jobs`), Save button with guest/student/hidden modes, `/student/saved` | Yes (this session) | Local stand-in browser E2E (save, reload persistence, saved page, remove, dashboard count; employer sees no button; visitor is sent to sign in) |
| **Student dashboard with real data** (applications, interviews, saved, skills-matched or latest recommendations, profile checklist) | Yes | Local stand-in browser E2E |
| **Student profile save** (name, headline, about, college, degree, grad year, location, skills incl. new skills) | Yes | Unit (zod) + local stand-in browser E2E incl. database rows |
| **Companies list and company page from real data** (verified badge, open roles, safe website link) | Yes | Local stand-in browser E2E |
| **Report a listing** (reasons, validation, duplicate handling, sign-in required) | Yes | Unit + local stand-in browser E2E + PGlite guard tests |
| **Admin overview with real counts + 8-week applications chart** | Yes | Local stand-in browser E2E (numbers equal database counts) |
| Community (posts, kinds, search, sort, saved view, like, comment, bookmark, report, delete, admin hide) | Yes, **needs migrations 010/011 applied** to appear live ("not ready" state until then) | PGlite 39 checks + unit 4 + local stand-in browser E2E **19/19, 3 runs in a row** |
| Settings: accent colours incl. custom hue, button styles, backgrounds, effects, quick looks, backup/share | Yes | Unit (appearance 10). Visual look **not human-reviewed** |
| Demo listings (14 companies, 54 listings: 26 jobs / 24 internships / 4 freelance) as **opt-in SQL**, never loaded automatically | Yes | PGlite 10 checks + used by local E2E. **Not run on real Supabase** |
| Trust pages: About, Safety tips, Help (FAQ), Contact (no invented email; reads `NEXT_PUBLIC_SUPPORT_EMAIL`), Privacy and Terms (**drafts, flagged as needing a lawyer**) | Yes | Build + HTTP 200 smoke test |
| SEO: `robots.txt`, `sitemap.xml` (static pages + up to 10 pages of jobs + companies), JobPosting JSON-LD on job pages | Yes | Sitemap returned 38 URLs with seed data on local stand-in. JSON-LD **not validated** with Google's tool |
| Error pages: `error.tsx`, `global-error.tsx`, custom not-found | Yes | Build only; error screens not triggered on purpose |
| CI workflow `.github/workflows/ci.yml` (typecheck, lint, tests) | Written | **Never run on GitHub** |

Cleaned up this session: removed dead sample-data components (`JobExplorer, ApplicantTable, ApplyPanel, PostJobForm, JobCard, SavedCountCard, useSavedJobs`), the misleading "Preview data" banner, and the stale footer line that called listings fictional.

## 4. Files created or modified this session (all under `studojob-app/`)
- **Saved jobs:** `src/lib/saved/{queries,actions}.ts`, `src/components/features/SaveButton.tsx` (rewritten), `LiveJobCard.tsx` (props `saveMode`, `saved`), `src/app/student/saved/page.tsx`, `src/app/(site)/jobs/page.tsx`, `jobs/[id]/page.tsx`, `src/app/(site)/page.tsx` (pass save state).
- **Student:** `src/lib/student/{overview,profile,profile-schema,profile-actions}.ts`, `src/app/student/page.tsx`, `src/app/student/profile/page.tsx`, `src/components/features/ProfileForm.tsx`.
- **Companies:** `src/lib/stage-e/job-queries.ts` (added `listPublicJobsByIds`, `listPublicCompanies`, `getPublicCompany`), `src/app/(site)/companies/{page,[slug]/page}.tsx`.
- **Report:** `src/lib/report/{schema,actions}.ts`, `src/components/features/ReportForm.tsx`, `src/app/(site)/report/page.tsx`.
- **Admin:** `src/lib/admin/overview.ts`, `src/app/admin/page.tsx`.
- **Auth hardening:** `src/lib/auth/dal.ts` (`requireRole` awaits `connection()`).
- **Polish:** `src/components/layout/{LegalPage,SiteFooter,DashboardShell}.tsx`, `src/components/ui/Misc.tsx` (removed `SampleDataNotice`), pages `about, safety, help, contact, privacy, terms`, `src/app/{robots,sitemap}.ts`, `error.tsx`, `global-error.tsx`, `next.config.ts`, `.github/workflows/ci.yml`.
- **Community (earlier this session):** `supabase/proposed/2026111200001{0,1}_*.sql` (+ROLLBACK files), `src/lib/community/*`, `src/components/community/*`, `src/app/(site)/community/*`.
- **Demo seed:** `scripts/gen-demo-seed.mjs`, `supabase/seed/demo_listings{,_cleanup}.sql`.
- **Tests:** `tests/member.test.ts` (new), `supabase/tests/{community-db,seed}.test.mjs`, `tests/community.test.ts`, `package.json` gained `test`, `test:member`, `test:community*`, `test:seed`.
- **Local test infrastructure (dev only, never deployed):** `scripts/dev/{supabase-shim.sql,local-db.mjs,local-supabase.mjs,mint-session.mjs,run-local.sh,up.sh}`, `scripts/dev/e2e/{helpers,community,member}.mjs`, devDependency `pg`.

## 5. Database schema and backend status
**Live Supabase project** `studojob` (ref `wudtjvgwscwivaqieywn`, ap-south-1). Read-only check on 2026-11-14:
- Applied migrations: 001 types_and_helpers, 002 core_tables, 003 functions_and_triggers, 004 row_level_security, 005 storage, 006 reference_data, 007 social_onboarding. **Nothing newer.**
- Data: 2 auth users, **0 admins**, 1 company, **0 jobs**, 0 applications, 0 saved jobs, 0 reports, **no community tables**.
- Tables used by the app: `profiles, student_profiles, employer_profiles, companies, company_verifications, jobs, job_categories, job_skills, skills, student_skills, applications, interviews, saved_jobs, resumes, notifications, reports`. Storage buckets: `company-logos` (public), `resumes` (private, pdf/docx 5 MB), `verification-docs` (private).
- Enums: `application_status` = applied, under_review, shortlisted, interview_scheduled, selected, rejected, withdrawn; `job_status` = draft, pending_review, published, paused, closed, rejected; `verification_status` = pending, approved, rejected.
- **Proposed, NOT applied anywhere live:** `supabase/proposed/…010_community.sql`, `…011_community_extras.sql` (with rollbacks). Also in Project docs only: `PROPOSED_20261105000008_jobs_guard_rereview.sql` and `PROPOSED_20261105000009_job_moderation_hardening_v5.sql` (`approve_job`, `private.job_approvals`, `content_version`) with a ROLLBACK — reviewed and tested earlier on PGlite only; **the app's moderation screens may assume them — re-check before applying**.
- **Local stand-in database** (real Postgres 16, throw-away) = migrations 001–007 + proposed 010/011 + demo seed + test users (`student@test.local`, `student2@test.local`, `employer@test.local`, `admin@test.local`; password `Password123!`; the admin exists **only locally**).
- Supabase advisor note: "leaked password protection" is a dashboard setting (Auth → Passwords), not SQL.

## 6. How to run things
- All suites: `npm test` (db 123, auth 16, stage-e 10, stage-e2 9 + 67, community-db 39, seed 10, community 4, member 4, tools/appearance 10). Plus `npx tsc --noEmit` and `npm run lint` (both clean on 2026-11-14).
- Local browser stack (needs Postgres 16 binaries, Playwright, Linux; **not Windows-friendly as is**): `bash scripts/dev/up.sh`, then `NODE_PATH=$(npm root -g) node scripts/dev/e2e/community.mjs` and `…/member.mjs`. Use `bash scripts/dev/run-local.sh` to rebuild only the app (it kills the old `next-server` first — a stale server once produced misleading errors).
- Founder (Windows, PowerShell, Node 20+): `npm install`, `npm run dev`, http://localhost:3000, with his own `.env.local` (never share or commit it).

## 7. What works / what does not
**Verified on the local stand-in (not real Supabase):** everything marked in section 3 as such, plus no server-log errors and no browser console errors during those runs.
**Not verified anywhere real:** anything against the live project (no jobs exist, so live pages show honest empty states); Google/email flows were human-tested earlier only for login; emails; storage uploads; the admin screens end-to-end; Vercel deployment; mobile layout and accessibility by a human or automated audit; CI on GitHub.
**Stand-in limits to remember:** it is my own imitation of PostgREST — it does not implement embedded-resource filters, Storage, realtime, or JWKS. Code that depends on those must be tested on real Supabase.
**Does not exist yet:** resume upload (profile page says so honestly), employer resume viewing in practice, interview scheduling UI polish, notifications UI, email sending, payments, rate limiting, analytics, account export/delete, strict CSP, i18n.

## 8. Bugs, risks and unfinished tasks
1. **Blocker:** 0 admins and 0 jobs live. Employers' listings stay `pending_review` and companies stay unverified until someone is admin. Founder decision needed (see section 10).
2. Unknown job id / company slug: the not-found page shows but HTTP status is **200** because content streams inside `<Suspense>` (Next adds `noindex`). Acceptable for now; revisit for SEO.
3. Saving a skill lets any signed-in user create a row in `skills` (policy `skills_insert`). Limited to 20 per student and 40 chars; consider moderation or a trigger later.
4. `listPublicCompanies` shows every company RLS allows (verified or not, labelled). `openRoles` counts published jobs from the first 2000 rows only.
5. Sitemap covers at most 10 pages of jobs; move to a sitemap index beyond that.
6. Privacy and Terms are drafts; Contact has no real support address.
7. Report form is for job listings; reporting a company or a user directly has no UI yet (reports table supports `company_id`).
8. `npm audit` advisories were never reviewed. No Content-Security-Policy.
9. CI file untested; dev scripts are Linux-only.
10. Hydration/console-error checks exist only inside the local E2E scripts.

## 9. Important decisions and standing instructions
- Do **not** redesign; extend the existing implementation and visual identity ("Studo": violet + mint, Plus Jakarta Sans/Inter).
- **No live database changes** by the assistant: new SQL goes in `supabase/proposed/` or `supabase/seed/`; the founder applies it. Supabase MCP is used **read-only**.
- **Do not create an admin account or run SQL to make one** unless the founder explicitly decides.
- No fake data presented as real: demo listings are opt-in SQL for staging/testing only, with `demo-*` slugs and `@demo.studojob.invalid` users.
- Never print, request, or commit secrets / `.env.local`; never put `.env.local` in a zip; no service-role key in the app.
- Label test evidence precisely (levels above). Do not claim "tested" for stand-in-only results without saying so.
- Never touch the "Blonde" Supabase project.
- Style: friendly, simple explanations, honest, correct the grammar of each user message briefly, keep replies short.

## 10. Exact next task
**Goal: get the first real, public listing onto the live site and prove it on real Supabase.** In a new chat in this Project:
1. Ask Harish to upload the latest zip (cloud copy is temporary) and to choose **one** way to unblock moderation: (a) he runs a one-time SQL to make his own account admin, which he writes/approves himself, or (b) he approves keeping the founder-only path and uses a staging project. Do not decide for him.
2. Review `claude/PROPOSED_20261105000009_job_moderation_hardening_v5.sql` (+ rollback) against the current admin/moderation code; copy it into `supabase/proposed/`; re-run it on the local real-Postgres stand-in including a two-session concurrency test.
3. With Harish's explicit approval, apply 008/009 (if still wanted) and community 010/011 to **a staging Supabase project** (delete/pause "Blonde" or use the local CLI), run the demo seed there, and execute `member.mjs`/`community.mjs`-style flows by hand with him.
4. Then build **resume upload** (private storage + `resumes` table + employer signed-link access) and verify it on real Supabase.
5. After that: rate limiting, email notifications, CSP with nonce, account export/delete, mobile + accessibility audit, move Privacy/Terms to lawyer-reviewed text.
