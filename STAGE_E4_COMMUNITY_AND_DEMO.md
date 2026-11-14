# Stage E4 — Community + demo listings (added 2026-11-12)

> **Update 2026-11-14:** this file is historical. The current ground truth is `PROJECT_HANDOFF_REPORT.md`.

## Status (honest labels)
| Item | Implemented | Tested locally (PGlite/unit/build) | Real Supabase | Browser-tested by a human |
|---|---|---|---|---|
| Community pages `/community`, `/community/[id]` | Yes | Build, lint, page returns 200 in "not configured" state | **No** | **No** |
| Post, like, comment, delete, admin hide (server actions) | Yes | Input validation unit tests (4) | **No** | **No** |
| Community DB (`supabase/proposed/20261112000010_community.sql`) | Yes | 26 RLS/trigger checks pass | **NOT APPLIED** | **No** |
| Demo seed (14 companies, 44 listings) | Yes | 9 checks pass | **NOT RUN** | **No** |

Existing suites still pass: test:db 123, test:auth 16, test:stage-e 10, test:stage-e2 9, test:tools 9; build and lint clean.

## Update: Community extras (migration 011)
Added: search, Newest/Popular sort, Save (bookmark) posts + "Saved posts" view, and Report post (reasons, 1 report per person, cannot report own post; 3 different reporters auto-hide a post until an admin restores it).
Files: `supabase/proposed/20261112000011_community_extras.sql` (+ ROLLBACK), `src/lib/community/*`, `src/components/community/PostActions.tsx`, `PostCard.tsx`, `src/app/(site)/community/page.tsx`.
Evidence: community DB checks now 39/39 (local PGlite); build + lint clean; page 200 in "not configured" state. Real Supabase / signed-in browser: **not tested**. Apply 010 first, then 011.
Known limits: "Popular" ranks only the newest 100 posts (likes + 2x comments); there is no admin screen listing reports yet (admins can read the `community_reports` table).

## Update: Stage E5 — more listings + Settings/animations
- Demo seed now 14 companies / 54 listings: 26 jobs, 24 internships, 4 freelance (regenerate with `node scripts/gen-demo-seed.mjs`). Still NOT run on any real database.
- `/settings` (title "Settings"): Quick looks (5 presets), Theme, Accent incl. Custom colour slider, Button style (solid/gradient/outline/glow), Background (aurora/grid/dots/plain), Effects (off/subtle/lively), size, corners, font, animations, contrast, Backup/share (copy/paste settings JSON). Saved in the browser only (localStorage), not in the database.
- Effects: animated background, shine + breathing on primary buttons, cards rise and lift, scroll progress bar, pointer spotlight (`FxLayer.tsx`, CSS in `globals.css`). All off with Effects=Off, Animations=Reduce, or the OS reduced-motion setting.
- Verified: appearance tests 10/10; build, lint clean; headless-browser check (preset applied, custom hue written, persisted across navigation, 0 console errors). NOT verified: other browsers, phones, performance on low-end devices.
- Defaults changed: new visitors get Effects=lively + Background=aurora.

## How to switch on (your decision — nothing was applied for you)
1. Community: run `supabase/proposed/20261112000010_community.sql` in the Supabase SQL Editor. Undo: `ROLLBACK_20261112000010_community.sql`.
2. Demo jobs (staging/testing only): run `supabase/seed/demo_listings.sql`. Remove: `demo_listings_cleanup.sql`. Companies are slugged `demo-*`, owned by password-less placeholder users, and labelled fictional.
3. Regenerate the seed after editing data: `node scripts/gen-demo-seed.mjs`.

## Decisions
- Earlier rule "no fake jobs, no live DB changes" kept: demo data is opt-in SQL, not shipped in the app.
- Community author names are a server-stamped snapshot so logged-out visitors never need access to `profiles`.
- Limits: 5 posts/day, 30 comments/hour per user (DB triggers).
- Header now has a "Community" link.

## Next task
Apply migrations 010 then 011 to a Supabase branch/staging, then manually test: sign in → post → like → comment → delete; admin hide (needs an admin account).
