# StudoJob — Architecture & Plan

## 1. Application Architecture

```
Browser (Next.js App Router, React, TS, Tailwind)
   │  Server Components + Server Actions + Route Handlers
   ▼
Next.js on Vercel ───────► Supabase
   │                         ├─ Auth (email/password, OAuth, magic link)
   │                         ├─ Postgres (+ Row Level Security)
   │                         ├─ Storage (resumes, logos; private buckets)
   │                         └─ Edge Functions / pg_cron (alerts, expiry)
   ├─► Resend (transactional email)
   ├─► Upstash Redis (rate limiting)
   ├─► Sentry (error tracking), Vercel Analytics
   └─► Razorpay/Stripe (Phase 5, paid featured listings only)
```

Key decisions
- **Next.js App Router**: server rendering gives SEO for job pages (critical for a job board) and keeps secrets on the server.
- **Supabase**: Postgres + Auth + Storage in one place. **Row Level Security (RLS)** enforces who can read what in the database itself, so a UI bug cannot leak a resume.
- **Roles** (`student`, `employer`, `admin`) live in a `profiles.role` column, checked by RLS and by Next.js middleware.
- **Feature folders + shared UI kit**: `components/ui` (primitives) and `components/features/*` (job card, filters, etc.).
- **Data layer**: Phase 1 uses a typed repository (`lib/data`) over clearly labelled sample data. Phase 2 swaps it for Supabase queries without touching components.

## 2. Sitemap

Public: `/` · `/jobs` · `/jobs/[id]` · `/internships` · `/companies` · `/companies/[slug]` · `/resources` · `/about` · `/privacy` · `/terms` · `/report`
Auth: `/login` · `/register` · `/forgot-password`
Student: `/student` (overview) · `/student/applications` · `/student/saved` · `/student/profile` · `/student/resume` · `/student/recommendations`
Employer: `/employer` · `/employer/jobs` · `/employer/jobs/new` · `/employer/applicants` · `/employer/company` · `/employer/analytics`
Admin: `/admin` · `/admin/moderation` · `/admin/employers` · `/admin/reports` · `/admin/users` · `/admin/analytics`

## 3. User Journeys

**Student**: land → search/filter → open job → register → complete profile + resume → apply → track status → get interview invite → (optional) prep resources.
**Employer**: register → verify email + business domain → submit company for review → admin approves → post job → review applicants → shortlist → schedule interview → view analytics.
**Admin**: review verification queue → approve/reject employers → moderate new listings → handle scam reports → suspend users → monitor analytics.

## 4. Database Schema (Postgres)

- `profiles` (id → auth.users, role, full_name, avatar_url, created_at)
- `student_profiles` (profile_id, headline, bio, college, degree, grad_year, location, resume_path)
- `skills` (id, name) · `student_skills` (student_id, skill_id, level)
- `education` / `experience` (student_id, …)
- `companies` (id, owner_id, name, slug, website, logo_path, industry, size, verification_status)
- `jobs` (id, company_id, title, type[job|internship|freelance], work_mode[remote|hybrid|onsite], employment[full|part], location, stipend_min/max, is_paid, description, status[draft|pending|live|closed|rejected], expires_at)
- `job_skills` (job_id, skill_id)
- `applications` (id, job_id, student_id, status[applied|reviewing|shortlisted|interview|offer|rejected], cover_note, applied_at) — unique (job_id, student_id)
- `saved_jobs` (student_id, job_id)
- `interviews` (application_id, scheduled_at, mode, link)
- `reports` (id, job_id, reporter_id, reason, status)
- `resources` (id, title, category, url, body)
- `audit_log` (actor_id, action, entity, entity_id, at)

Relationships: company 1—N jobs; job 1—N applications; student 1—N applications; job N—N skills.

## 5. Design System — "Studo"

- **Identity**: warm ink + electric violet + mint accent. Calm, trustworthy, youthful; not LinkedIn blue.
- **Type**: Plus Jakarta Sans (headings) + Inter (body).
- **Tokens**: radius 12/16/24, soft layered shadows, 8px spacing grid, visible focus rings (WCAG AA contrast).
- **Components**: Button, Badge, Card, Input, Select, Tabs, Modal, Avatar, StatCard, JobCard, FilterPanel, EmptyState, DashboardShell.
- **Motion**: short (150–250ms) transitions; respects `prefers-reduced-motion`.

## 6. Roadmap

1. **Phase 1 — Frontend** (this step): design system, all public + dashboard pages, responsive.
2. **Phase 2 — Backend**: Supabase schema + RLS, auth, real CRUD.
3. **Phase 3 — Core flows**: apply, resume upload, employer posting, applicant pipeline.
4. **Phase 4 — Trust & safety**: employer verification, moderation, reporting, rate limits.
5. **Phase 5 — Growth**: recommendations, email alerts, analytics, payments, SEO.
6. **Phase 6 — Launch**: testing, accessibility audit, monitoring, Vercel production.

## 7. Services & Credentials (needed from Phase 2)

| Service | Purpose | Env variable |
|---|---|---|
| Supabase | DB, auth, storage | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy `..._ANON_KEY` also accepted), `NEXT_PUBLIC_SITE_URL`. The service-role key is intentionally NOT used (see section 8). |
| Resend | Email | `RESEND_API_KEY` |
| Upstash Redis | Rate limiting | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Sentry | Errors | `SENTRY_DSN` |
| Razorpay/Stripe | Payments (later) | server-only keys |

Never commit `.env.local`. The service-role key must never reach the browser.

---

## 8. Phase 2 progress and decisions (updated 2026-10-31)

**The SQL files in `supabase/migrations/` are the source of truth for the schema.** Section 4 above was the early sketch.
Differences from the sketch:
- 16 tables as required by the Phase 2 brief: profiles, student_profiles, employer_profiles, companies, jobs, job_categories, applications, saved_jobs, resumes, skills, student_skills, job_skills, interviews, notifications, company_verifications, reports.
- Student education, projects, certifications and preferred locations are validated JSON/array columns on `student_profiles` (small lists owned by one student) instead of extra tables.
- Application statuses: applied, under_review, shortlisted, interview_scheduled, selected, rejected, withdrawn. Job statuses: draft, pending_review, published, paused, closed, rejected.
- `resources` and `audit_log` from the sketch are NOT created yet.

**Security model (three layers):** `src/proxy.ts` (logged-out users cannot reach dashboards) -> server-side role checks in each dashboard (Stage D, not built) -> Postgres Row Level Security plus triggers (built and tested). The app uses only the publishable key; the service-role key is deliberately unused.

**Rules enforced inside the database (tested):** role/suspension changes are admin-only and signup can never create an admin; companies cannot verify themselves and renaming an approved company resets it to pending; unverified employers' "publish" becomes `pending_review`; paid roles must state a pay range and unpaid roles none; one application per student per job; applications only to published, in-deadline jobs; students may only withdraw; interviews must be in the future and need a link/location; employers see applicants' profiles and resumes only after that student applied to their job; resume type (PDF/DOCX) and 5 MB limit; notifications can only be created by triggers.

**Request flow:** `proxy.ts` refreshes the session and verifies the JWT (`getClaims`) -> Server Components/Actions use `lib/supabase/server.ts` (acts as the logged-in user, so RLS applies) -> Client Components use `lib/supabase/client.ts`.

**Next.js 16 notes:** `middleware.ts` is now `proxy.ts`; Cache Components is on, so `searchParams` must be read inside `<Suspense>`.

**Update 2026-11-01:** the six migrations were applied to the real Supabase project `studojob` and 116 behaviour/security checks passed there (rolled back afterwards); see `PHASE2_PROGRESS.md` section 15 for exactly what is and is not verified. The paragraph below describes the earlier local-only milestone.

**Verification status (earlier milestone: Phase 2, Stage C complete, Stage D paused):** migrations + RLS rules were run on an in-memory Postgres with stand-ins for Supabase's `auth` and `storage` (`npm run test:db`, 101 checks, all passing). NOT yet verified: applying the migrations to a real Supabase project, real email delivery, the Supabase clients against a live project, Supabase advisors, and everything in Stage D onward. "Implemented", "locally tested" and "verified on real Supabase" are different things; see `PHASE2_PROGRESS.md` section 7 for the control-by-control table.

**Stage D design notes (not built):** the planned auth flow adds `/auth/callback`, `/forgot-password`, `/reset-password`, server actions for register/login/logout, and a server-side role check in every dashboard layout. Full requirements: `PHASE2_PROGRESS.md` section 11.
