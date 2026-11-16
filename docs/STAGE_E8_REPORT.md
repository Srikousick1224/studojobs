# Stage E8 report — implementing the development plan

Date: 2026-11-15 / 2026-11-16 · Branch: `stage-e8-plan-implementation` (stacked on Stage E7)

**Read this first (honest status).** Everything below was verified on three levels only:
**U** = unit tests, **P** = PGlite (Postgres compiled to WebAssembly, SQL only), **S** = my local stand-in (my own imitation of Supabase Auth + REST + Storage on real Postgres 16, driven by a real Chromium browser).
**Nothing was run on the real Supabase project or on a real phone, and no screen reader was used.** No migration was applied to any real database. No admin account was created. No secret is in the repository.

## 1. What was built

| Plan phase | Built | Where it is tested |
|---|---|---|
| 1 Staging prep | `docs/STAGING_RUNBOOK.md`; migration 009 v5 (+rollback) copied into `supabase/proposed/`; app made compatible with 009 (admin Publish uses `approve_job()` with the reviewed version; falls back to the old update before 009; students' unknown skills no longer break the whole profile save) | P: `npm run test:migration-009` (26 checks: applies after 001-007, behaves, rolls back exactly, re-applies, 010-013 apply on top). S: `moderation009.mjs` (11 checks) |
| 2 Resumes | Resume manager on the student profile: upload PDF/DOCX (max 5 MB, max 5 files, magic-byte check, private bucket, random file names), make default, delete, view through a 5-minute signed link | U: file checks, rate limit. S: `e8.mjs` (upload, fake PDF refused, default switching, signed link returns the file, anonymous download refused, delete) |
| 3 Communication | Notification centre (student and employer) with unread badge, mark read / mark all read; interview scheduling by employers (video/phone/in person, safe links only) with Join-meeting link for students; migration 013 auto-reply when a student applies (employer setting) | P: `settings-db` (20 checks incl. 013). S: `e8.mjs` |
| 4 Trust and safety | Content-Security-Policy; per-person rate limits (resume upload, interviews, reports, applications, password and email change); "Report this company"; "Download my data" (JSON) in Settings > Security | U: `trust-and-safety.test.ts`. S: `e8.mjs` |
| 5 Quality | Automatic WCAG 2.0/2.1 A+AA scan with axe-core of 33 pages across light, dark and phone width: `scripts/dev/e2e/a11y.mjs`. Two real issues fixed (search button accessible name; faded text on the landing-page story) | S: 98 page checks, 0 violations (final run) |

## 2. Test results (final run, this branch)

| Suite | Result | Level |
|---|---|---|
| `npx tsc --noEmit` (after `npx next typegen`) / `npx eslint .` | 0 errors / 0 warnings | static |
| `npm test` (all unit + PGlite suites incl. new ones) | all passed | U / P |
| `migration-009.test.mjs` | 26 passed, 0 failed | P |
| `settings-db.test.mjs` | 20 passed, 0 failed | P |
| `e2e/member.mjs` | 36 passed, 0 failed | S |
| `e2e/settings.mjs` | 32 passed, 0 failed | S |
| `e2e/community.mjs` | 19 passed, 0 failed (8 repeat runs in a row) | S |
| `e2e/e8.mjs` | 37 passed, 0 failed | S |
| `e2e/moderation009.mjs` (database with 009) | 11 passed, 0 failed | S |
| `e2e/a11y.mjs` | 98 passed, 0 failed | S |
| `npm audit --omit=dev` | 0 vulnerabilities | — |
| `npm audit` (with dev tools) | 8 moderate, all inside the lint toolchain (not shipped). Do **not** run `npm audit fix --force`: it would downgrade `eslint-config-next`. | — |

Test fixes made along the way (tests, not product): the settings pill offset changed from 192 px to 240 px because a Notifications item was added to the sidebar; the community "comment is shown" check now waits for the temporary comment to be replaced by the saved one (it failed about 1 run in 3 before; 8 of 8 pass now).

## 3. Files

**New:** `docs/STAGING_RUNBOOK.md`, `docs/STAGE_E8_REPORT.md`; `src/lib/security/rate-limit.ts`; `src/lib/student/{resume-file,resume-actions}.ts`; `src/components/features/{ResumeManager,InterviewPanel,LocalTime,NotificationList}.tsx`; `src/lib/notifications/{categories,queries,actions}.ts`; `src/lib/stage-e/interview-{schema,actions,queries}.ts`; `src/app/{student,employer}/notifications/page.tsx`; `src/app/api/account/export/route.ts`; `src/lib/account/export-shape.ts`; `supabase/proposed/20261105000009_*.sql` + rollback, `20261115000013_*.sql` + rollback; tests `tests/{resume-and-limits,trust-and-safety}.test.ts`, `supabase/tests/migration-009.test.mjs`; e2e `scripts/dev/e2e/{e8,moderation009,a11y}.mjs`.

**Changed (main ones):** `next.config.ts` (CSP, 6 MB action body limit); `src/lib/report/*` + `ReportForm.tsx` + report page + company page (company reports); `src/lib/stage-e/{actions,queries,schemas}.ts` + admin moderation page + `ActionButton.tsx` (approve_job); `src/lib/student/profile-*.ts` + `ProfileForm.tsx` + profile page (resumes, skills message); `RoleShells/DashboardShell/RoleLayout` (Notifications nav and badge); `SettingsPanel.tsx` (Download my data); `Button.tsx` (external and download links); `Motion.tsx` + `globals.css` (story contrast); `CommandPalette.tsx` (accessible name); `scripts/dev/local-supabase.mjs` (Storage imitation), `local-db.mjs`, `up.sh` (`WITH_009=1`).

## 4. Known limits and bugs (not hidden)

1. **Nothing proven on real Supabase.** The stand-in's Storage is my imitation; a real two-account resume test (owner yes, other employer no, other student no) must be done on staging (runbook step 9).
2. **CSP still allows `'unsafe-inline'` scripts.** A nonce would switch off page caching. Set `CSP_REPORT_ONLY=1` to roll it out in "report only" mode first. The Supabase address comes from `NEXT_PUBLIC_SUPABASE_URL` at build time.
3. **Rate limits live in server memory**, per instance. On Vercel with many instances a determined script can exceed them. A shared store (for example Upstash) is the fix.
4. **Migration 009 consequences** (runbook section 2): admin Publish path changes; students cannot create new catalogue skills (decision G); already-live listings have no approval record (decision H). The admin moderation queue still shows only title/type/location, so an admin cannot see the full listing text before approving: a real gap in the review screen.
5. **"Download my data" is a JSON file**, rate limited to 5 per hour. Account **deletion is still "contact us"**.
6. **Emails are not sent** (interview invites, auto-replies and notifications are in-app only). Needs an email provider account (founder decision).
7. **Accessibility:** only automatic checks ran. Automatic tools find roughly a third of real problems: a keyboard-only pass and a screen-reader pass by a human are still required. Lighthouse and real-phone checks were not done.
8. Interview times are stored in UTC and shown in the viewer's own time zone; only Chromium was tested.
9. Migration 008 file is not in the repo (kept in the Project documents); 009 supersedes it (read, not tested in both orders).

## 5. How to run the tests yourself
```
npm ci && npx next typegen
npm test                                  # unit + PGlite suites
bash scripts/dev/up.sh                    # local stand-in stack (needs Postgres 16 at /usr/lib/postgresql/16)
for f in member settings community e8 a11y; do node scripts/dev/e2e/$f.mjs; done
WITH_009=1 bash scripts/dev/up.sh && node scripts/dev/e2e/moderation009.mjs
```

## 6. Exact next task (for the next chat)
**Run `docs/STAGING_RUNBOOK.md` on a staging Supabase project with Harish.** First get his four decisions: how the first admin is made (A), student-created skills after 009 (G), already-live listings (H), and where staging lives (S). Then apply 009-013 to staging only, click through the three roles, and run the two-account resume test on real Storage. Do not apply anything to production before that passes.
