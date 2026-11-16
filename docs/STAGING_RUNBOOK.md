# StudoJob staging runbook (Phase 1)

**Purpose:** try the unapplied database migrations on a *separate test database* before the real one.
**Nothing in this file has been run against any real Supabase project.** Every command below is for you (Harish) to run, or to approve one by one.

## 0. Hard rules
1. Never touch the project named **"Blonde"**.
2. Never paste a password, key or token into chat, git or a zip. Keep them in a password manager or an untracked `.env.local`.
3. Do not use production keys on staging.
4. This runbook does **not** create an admin account. That is your decision (section 3).

## 1. What is waiting to be applied

| # | File (in `supabase/proposed/`) | What it does | Tested where | Rollback file |
|---|---|---|---|---|
| 009 | `20261105000009_job_moderation_hardening_v5.sql` | Edited live listings go back to review; admins approve through `approve_job()`; only admins create catalogue skills | PGlite: applies after 001-007, behaves, rolls back exactly (`npm run test:migration-009`, 26 checks) | `ROLLBACK_20261105000009_...` |
| 010 | `20261112000010_community.sql` | Community tables | PGlite (`npm run test:community-db`) | yes |
| 011 | `20261112000011_community_extras.sql` | Community extras | PGlite | yes |
| 012 | `20261115000012_user_settings.sql` | Saved Settings | PGlite (`npm run test:settings-db`) | yes |
| 013 | `20261115000013_application_autoreply.sql` | Employer auto-reply message when a student applies | PGlite (`npm run test:settings-db`) | yes |

**About migration 008** (`jobs_guard_rereview`): it is kept only in the Project documents. Migration 009 replaces the same function and already contains 008's rule (a live listing edited by its owner goes back to review). **Skip 008.** (This comes from reading both files, not from a test of applying 008 first.)

Apply order: **009, then 010, 011, 012, 013.** The PGlite test proves 010-013 apply on top of 009.

## 2. Things you must know before applying 009

These are real consequences, found by reading the app code against the SQL:

1. **Admin "Publish" changes.** After 009 an admin can no longer publish with a plain status update. The app now calls `approve_job()` and sends the version the admin saw. Before 009 the app falls back to the old update, so the screen works on both. *Tested: unit-level and PGlite SQL. The screen itself was not clicked on a database that has 009.*
2. **Students typing a brand-new skill.** After 009 only admins can create catalogue skills. The profile now still saves and tells the student which skills were not added. **Founder decision G:** do you want students to be able to suggest skills (needs a small "suggested skills" table), or is an admin-only list fine?
3. **Decision H: listings already live.** 009 does not backfill approvals. A live listing stays live, but the next time its owner edits it, pauses/resumes it, or its company changes name/website/logo, it goes to review. This only causes *more* review, never less. Today there are **0 real listings**, so it costs nothing now. Decide before you have real ones.
4. **Residual risks (accepted for this milestone):** anyone holding the service-role key or a direct database connection can approve listings; a verified company's first publish from draft skips the queue (existing business rule); changing a company's "about" text does not take listings offline.

## 3. Founder decisions needed (I will not decide these)
| # | Decision | Options |
|---|---|---|
| A | How is the first admin made? | (a) you run one SQL line yourself on staging, then production; (b) keep a founder-only path. *I will not write or run this for you.* |
| G | Student-created skills after 009 | admin-only list, or a suggest-a-skill table |
| H | Listings live before 009 | accept "fail-safe" (default) or backfill approvals |
| S | Where is staging? | a second hosted Supabase project (Free plan allows 2 projects per organisation; check your slot), or the local Supabase CLI with Docker |

## 4. Steps (staging only)
1. **Pick staging** (decision S). Hosted: create `studojob-staging` in the same region. Local: `supabase init`, `supabase start`.
2. **Link the CLI to staging only:** `supabase link --project-ref <STAGING_REF>`. Read the ref aloud before every push.
3. **Apply migrations 001-007** from `supabase/migrations/` (`supabase db push`). Check the migration list in the dashboard.
4. **Create synthetic users** through the app's sign-up page: one student, one employer. Make a second employer with an *unverified* company. (No real people's data.)
5. **Make the staging admin** (decision A) with a statement *you* write and read first. Staging only.
6. **Copy** `20261105000009_...sql` and `20261112...` / `20261115...` files into `supabase/migrations/` **only on the staging branch of your work**, then `supabase db push`.
7. **Read-only checks** (safe to run on staging):
   ```sql
   -- 009 present?
   select count(*) from pg_proc where proname = 'approve_job';                       -- expect 1
   select column_name from information_schema.columns
     where table_name = 'jobs' and column_name = 'content_version';                  -- expect 1 row
   -- RLS on for the tables this release uses
   select tablename, rowsecurity from pg_tables
     where schemaname = 'public' and tablename in ('resumes','interviews','notifications','reports','user_settings');
   -- the private resume bucket
   select id, public, file_size_limit from storage.buckets where id = 'resumes';     -- expect public = false
   ```
8. **Click through by hand** (the app pointed at staging via `.env.local`):
   - Student: sign up, complete profile, upload a PDF resume, open it, apply to a job, see the applied status.
   - Employer: create company, request verification, post a job, see the applicant, schedule an interview.
   - Admin: approve the company, publish the job (this exercises `approve_job`), resolve a report.
   - Student: see the interview and the notifications; download "my data" from Settings.
9. **Real two-account resume test:** student A uploads a resume and applies to employer X's job. Check employer X can open it, employer Y cannot, student B cannot. (Never proven on real Supabase yet. Storage on the local stand-in is *my imitation*.)
10. **Run Supabase's security advisor** on staging and write down its output.
11. **Rollback rehearsal:** run `ROLLBACK_20261105000009_...sql`, check listings still exist, apply 009 again.
12. **Only after all of the above passes** and you approve, repeat for production with the same order. Production history currently has migrations 001-007.

## 5. Stop conditions
Stop and do not continue to production if: any click-through step fails; the advisor reports a missing RLS policy; a rollback loses anything besides approval history; the resume test lets the wrong account open a file.

## 6. Exit test for Phase 1
One real job visible on the public site, applied to by a real student account, and seen by a real employer account.
