# StudoJob — Development Plan

Owner: Harish (founder). Written 2026-11-15, after Stage E7. This plan is honest about what is verified: "local stand-in" means my own imitation of Supabase on real Postgres; it is **not** the real Supabase project.

## 1. Where we are

| Area | Status |
|---|---|
| Public site (landing, jobs, internships, companies, community, resources) | Built. Tested on local stand-in. |
| Student dashboard (overview, applications, saved, profile, **settings**) | Built. Tested on local stand-in. |
| Employer dashboard (company, jobs, applicants, **settings**) | Built. Tested on local stand-in. |
| Admin dashboard (moderation, reports) | Built. Tested on local stand-in. |
| Motion system (Apple-style scroll story, reveals, count-ups) | Built (Stage E7). Chromium only. |
| Migrations 001-007 | Applied to the real Supabase project "studojob". |
| Migrations 008-009 (job-moderation hardening), 010-011 (community), 012 (user settings) | **Written, not applied anywhere real.** |
| Real listings on the live site | **0** (no admin exists, so nothing can be approved). |
| Resume upload, email sending, interview scheduling UI, rate limiting, CSP, account export/delete | **Not built.** |

## 2. Rules we keep (from the project instructions)
1. Extend the existing design (violet + mint); never redesign working screens.
2. No live-database change without Harish's explicit approval. New SQL goes in `supabase/proposed/` with a ROLLBACK file and a PGlite test.
3. No secrets in git, chat or zips. No service-role key in the app.
4. Never claim "tested" without saying where (unit / local stand-in / real Supabase / human).
5. Do not create an admin account unless Harish decides to.

## 3. Roadmap

Each phase has an **exit test**. We do not start the next phase until it passes.

### Phase 0 — Land Stage E7 (this week)
- Merge the E7 pull request after CI is green.
- Tag `v0.7.0`.
- **Exit:** `main` builds on GitHub Actions (tsc, lint, `npm test`).

### Phase 1 — First real listing on real Supabase (week 1-2)
1. Decide staging: local Supabase CLI + Docker, or free up a hosted slot (the "Blonde" project must never be touched).
2. Review migration 009 v5 again, then apply 008-012 **to staging only**, in order, with the rollback files ready.
3. Founder decision: how the first admin is created (Harish writes and approves the one-time SQL himself).
4. Run the demo seed on staging; click through student, employer and admin flows by hand.
5. Apply to production after staging passes; publish the first real, human-checked listing.
- **Exit:** one real job visible on the public site, applied to by a real student account, seen by a real employer account.

### Phase 2 — Resumes (week 3)
Private storage bucket, `resumes` table, upload with type/size limits, employer access through short-lived signed links, delete on request.
- **Exit:** a resume uploaded by a student can be opened only by employers of jobs that student applied to (proved with a two-account RLS test on real Supabase).

### Phase 3 — Communication (weeks 4-5)
Email provider (Resend or Supabase SMTP), application-status emails, interview scheduling UI, notification centre. **Wire the Settings page:** digest, per-applicant emails, auto-reply, "visible to employers" (employer candidate search).
- **Exit:** a status change sends one email that respects the user's Settings.

### Phase 4 — Trust and safety (weeks 6-7)
Rate limiting on auth, apply and report endpoints; CSP with nonce; report a company or user (UI); account export + delete (server-side, needs a careful service-role edge function); employer verification checklist; moderation queue SLAs.
- **Exit:** abuse tests (spam applications, repeat reports, injection strings) are blocked and logged.

### Phase 5 — Quality (weeks 8-9)
Accessibility audit (axe + keyboard + screen reader pass), mobile pass on real phones, Lighthouse budget, Playwright smoke tests in CI, error tracking (Sentry), privacy-friendly analytics, sitemap index, Safari/Firefox check of the scroll story.
- **Exit:** Lighthouse ≥ 90 (performance, accessibility, SEO) on landing, jobs and a job page; zero critical axe issues.

### Phase 6 — Launch (week 10)
Vercel production deploy, custom domain, real support address, lawyer-reviewed Privacy and Terms, backups checked, status runbook, pilot with 1-2 colleges.
- **Exit:** 20 real students and 3 real employers complete the full loop.

### Phase 7 — Growth (after launch)
Better recommendations, career guidance and learning content, referral/invite flow, i18n, payments only if a paid plan is chosen, mobile app (React Native or PWA).

## 4. Git workflow
- `main` is always deployable and protected: require pull request + passing CI (**Settings → Branches → Add rule** on GitHub).
- Branch names: `feat/…`, `fix/…`, `docs/…`, `chore/…`, and `stage-eN-…` for stage work.
- Commit messages: Conventional Commits (`feat: add resume upload`, `fix: …`, `docs: …`). One idea per commit.
- Every change goes through a pull request using `.github/pull_request_template.md`.
- Releases: tag `v0.MINOR.0` after each merged stage. Source zips for handoff live in `releases/` (small, optional). Never put `.env.local` in a zip.
- Database changes: `supabase/proposed/NNN_name.sql` + `ROLLBACK_NNN_name.sql` + a PGlite test, reviewed in a PR, applied by Harish.

## 5. Definition of done (every task)
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` pass.
- [ ] New behaviour has a test (unit, SQL/RLS, or browser).
- [ ] Works on a phone-width screen and by keyboard.
- [ ] Respects reduced motion.
- [ ] No secrets, no `console.log` of personal data.
- [ ] Handoff note updated with **what was verified and where**.

## 6. Environments
| Env | Purpose | Data |
|---|---|---|
| Local stand-in (`scripts/dev/up.sh`) | fast development and automated tests | fake, disposable |
| Staging Supabase | real-Supabase proof before production | demo seed only |
| Production Supabase "studojob" + Vercel | public site | real users |

## 7. Risks to watch
1. No admin = nothing can go live (Phase 1 unblocks it).
2. Stand-in is not real Supabase: Storage, realtime and embedded filters need real tests.
3. Public repo: never commit keys; keep `.env.example` as the only env file in git.
4. Stored preferences (Settings) do nothing until Phase 3 — keep the UI honest.
5. `npm audit` advisories never reviewed (Phase 4).

## 8. Next 7 days
1. Review and merge the E7 pull request.
2. Turn on branch protection for `main`.
3. Choose the staging route and the admin-creation method (Phase 1 decisions).
4. Apply migrations to staging; run `settings.mjs`-style flows by hand.
