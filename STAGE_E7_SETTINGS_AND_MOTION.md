# Stage E7 — Settings for both accounts, new dashboard options, Apple-style motion (2026-11-15)

## What was added
**Settings** (`/student/settings`, `/employer/settings`, new "Settings" link in each sidebar): tabs Account · Notifications · Preferences · Security · Appearance.
- Account: name + optional phone (writes `profiles`, validated on server).
- Security: change password (email accounts), change email (Supabase confirmation link), sign out on all devices, "delete account" is only a link to Contact (the app has no service-role key, so it cannot delete auth users).
- Notifications + Preferences: stored in new table `user_settings` (one JSON row per user). Student: job types, work style, start date, open-to-work, visible-to-employers, show college. Employer: default type/work style (**really pre-fills "Post a role"**), auto-reply text, email-per-applicant.
- Appearance: the existing appearance controls, now also reachable inside dashboards.
- **Honest limits:** notification emails, the auto-reply and "visible to employers" are *stored* but nothing reads them yet (no email sending, no employer search). The UI says so.

**New dashboard options:** time-aware greeting, quick-action tiles, animated profile-completion ring, application pipeline (student); quick actions + hiring pipeline funnel (employer); sidebar now shows the user chip; longest-match active link (fixes "My jobs" + "Post a role" both lighting up).

**Motion kit** (`src/components/ui/Motion.tsx` + CSS at end of `globals.css`): `Reveal` (fade/rise/un-blur on scroll, 6 variants), `CountUp`, `Parallax`, `Spotlight` (cursor glow), `ScrollStory` (pinned scroll scene used on the landing page "How it works"), hero load-in, sliding sidebar pill, page transitions (`template.tsx` in student/employer/admin), bars/rings that draw themselves, iOS-style switches. Everything respects the Appearance "Motion" choice and the system reduced-motion setting; without JavaScript content is simply visible (`html.js` gate set by the pre-paint script).

## Files
New: `supabase/proposed/20261115000012_user_settings.sql` (+ROLLBACK), `supabase/tests/settings-db.test.mjs`, `tests/settings.test.ts`, `scripts/dev/e2e/settings.mjs`, `src/lib/settings/{schema,queries,actions}.ts`, `src/components/settings/{controls,SettingsPanel}.tsx`, `src/components/ui/Motion.tsx`, `src/components/features/Greeting.tsx`, `src/app/{student,employer}/settings/page.tsx`, `src/app/{student,employer,admin}/template.tsx`.
Changed: `globals.css`, `Misc.tsx` (StatCard/BarChart animated; new `ProgressRing`, `FunnelBars`; `PageHeader` title accepts nodes), `DashboardShell.tsx`, `RoleShells.tsx`, student & employer overview pages, `(site)/page.tsx` (landing), `JobForm.tsx` (`defaults` prop), `employer/jobs/new/page.tsx`, `lib/stage-e/queries.ts` (+`pipeline`), `lib/student/overview.ts` (+`pipeline`, `fullName`), `lib/appearance/settings.ts` (INIT_SCRIPT adds `js` class), tests/appearance fake, `package.json` scripts, `e2e/member.mjs` (waits for count-up).

## Evidence (all "Local stand-in", not real Supabase)
- `tsc` clean, `eslint` clean, `next build` OK.
- `npm test`: db 123, auth 16, stage-e 10, stage-e2 9 + 67, community-db 39, seed 10, community 4, member 4, **settings 5, settings-db 13 (new)**, tools/appearance 10 — all pass.
- Browser: `e2e/settings.mjs` 32/32 (twice), `e2e/member.mjs` 36/36, `e2e/community.mjs` 19/19.
- **Not verified:** migration 012 on real Supabase (NOT applied — apply it yourself, then Preferences save for real); password change / email change / sign-out-everywhere against real Supabase Auth (the stand-in does not implement them; only validation errors were tested); Safari/Firefox look of the scroll story; human review.

## Apply on real Supabase
Run `supabase/proposed/20261115000012_user_settings.sql` in the SQL Editor. Until then the Preferences/Notifications tabs show a yellow notice and saving says "not switched on yet" (Account + Security work without it).

## Next task
Apply migration 012 (and 010/011 for Community), then click through Settings on the real project with a real student and employer account and tell me what looks off.
