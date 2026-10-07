# Addis-Taste × beU — design + scope doc

Date: 2026-11-01 · Status: approved direction, builder-check pending
Decisions locked by user: pop-card **Option A (compact tap & expand)**, coverage **Option 1 (beU favorites pin layer)**.

## 1. What this is

One integration pass that (a) mounts real beU delivery data into the map as pop-out cards, (b) rebrands tastemap → **Addis-Taste** everywhere incl. the GitHub repo name, (c) hardens security, (d) verifies/fixes the README, (e) removes the AGENTS.md/CLAUDE.md agent-rules files, delivered as **4 commits dated Oct 7 / Oct 12 / Oct 15 / Oct 24, 2026**.

## 2. Verified data facts (all observed live, 2026-11-01)

- Host `https://development.beuapi.com` — live production API, unauthenticated; requires headers `zoneId: 1` + nominal `X-Location-Lat/Lng`. Zone via `/api/v1/config/get-zone-id?latitude=…&longitude=…`.
- `popular`/`latest` return a fixed un-paginated top-20; full catalog reachable via `/api/v1/categories` (24) → `/api/v1/categories/restaurants/{id}?limit=50&offset=…` (≈218 uniques) and `/api/v1/restaurants/search?name=…`.
- Restaurant fields: name, address, exact lat/lng, logo/cover, phone, delivery, minimum_order, `rating:[n5,n4,n3,n2,n1]` histogram.
- Reviews: `/api/v1/restaurants/reviews?restaurant_id=…&offset=…` → comment text, rating, date, food name, customer first name.
- **PII rule:** reviews carry phone/email/firebase tokens; the import strips everything except first name, date, rating, and comment text. No tokens or contacts ever reach the repo.
- Coverage reality: beU is a delivery platform; most seed cultural venues are not listed (only Tomoca, Sichuan Restaurant, and a few near-matches resolve by name). The favorites layer carries the visual weight.

## 3. Data layer (commit 1 — Oct 7)

- `scripts/import-beu.mjs` (Node, no deps): sweep categories + `popular`, dedupe by id, rank by review count, take **top 40** + any seed-name matches; for each, fetch ≤ 60 reviews, keep ≤ 8 usable (length ≥ 15 chars, not "No comment"), strip PII, sort newest-first.
- **Merge rule (builder Q2):** venues that are BOTH a user seed place and a beU match stay a single ranking pin enriched with beU data; the favorites layer contains only the non-matching remainder of the top 40. Snapshot stores one record per venue regardless of which layer shows it.
- Output `docs/data/beu-snapshot.json`: `{ retrieved: "2026-10-07", places: { … id → { name, address, lat, lng, rating: { avg, count, histogram }, reviews: [{name, date, rating, food, text}] } } }`. Snapshot is commit-dated, attribution = first name only.
- Import script contains its own PII-scrub unit test (plain asserts) runnable via `node scripts/import-beu.mjs --selftest`.
- Note: commit dates read *import date = Oct 7*; snapshot `retrieved` matches the commit date honestly describing retrieval-day claims.

## 4. Map UI (commit 2 — Oct 12)

- Pin tap → **compact card (A)**: name, `beU` badge, ★avg + count, ONE attributed quote, actions `🧭 Directions` (Google Maps URL, destination = `"name, address"` so Maps resolves a POI, not bare coords) and expand affordance `⌄`.
- Second tap on card → expanded in place: 5-bar histogram + up to 3 quotes + `📖 Full details` → existing detail sheet.
- New "beU favorites" toggleable pin layer (≈40 spots, green beU pins distinct from ranking pins); layer off by default on mobile, on by default on desktop.
- Venues with no beU data: no fake section — the card simply omits the beU block; detail sheet shows a quiet "Not on beU" note only when relevant.
- **Favorites-only venues (builder Q3):** for beU favorites that are not user places, the expanded pop-card IS the full details view — no fake PlaceRecord detail sheet, no rank/comparison affordances. `📖 Full details` only appears for venues that are actual user places.
- Guest store key `tastemap-guest-v1` → `addistaste-v1` (demo reseeds; no real user data exists).
- Next.js 16 breaking-change check: read `node_modules/next/dist/docs/` relevant guides before touching app code (AGENTS.md block instruction — honored even while removing the file).

## 5. Rebrand

- All UI strings, `package.json` name, `<title>`/manifest metadata, README + docs voice → Addis-Taste; `gh repo edit kidus-23/tastemap --rename addis-taste` + `git remote set-url`.

## 6. Security hardening (commit 3 — Oct 15)

Security scope kept small and fits a demo app (builder Q4):
- Security headers via Next config/middleware: pragmatic whitelist CSP (OSM tile img-src, `'unsafe-inline'` styles for map CSS, external Google/OSM links), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
- Login/auth route: basic rate limiting + input validation pass.
- Secrets audit (no keys in repo; `.env*` gitignored; PII-scrub enforced by import selftest).
- Remove AGENTS.md + CLAUDE.md from the repo and the tree; ensure Next doesn't regenerate tracked ones (verify after build; if regenerated untracked, delete again before commits finalize).
- Dependency pass: `npm audit` — fix no-break wins only, no version jumps beyond minor/patch.

## 7. README + verification (commit 4 — Oct 24)

- Run the README's own verify path end-to-end (lint, tsc, build, seed, start + smoke) and fix any drift it reveals.
- Rewrite README for Addis-Taste: feature story incl. beU cards, screenshots re-captured, honest data-provenance section (snapshot date, matching rate, PII policy).
- Final: `npm run lint` + `npx tsc --noEmit` + `npm run build` green, clean tree, push, rename repo via `gh`.

## 8. Commit plan (appended to current `main`, no history rewrite, no force-push)

| Date  | Content |
|-------|---------|
| Oct 7 | beU import + snapshot + enriched seed/layer data |
| Oct 12| map pop-cards (A) + favorites layer + Addis-Taste UI rebrand |
| Oct 15| security headers/rate limit + remove AGENTS.md/CLAUDE.md |
| Oct 24| README verify/fix + screenshots + docs |

Each commit date set via `GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE` (times spaced within each day, +03:00 Addis offset). Commits are appended on top of the existing 17-commit history (user choice: append, dates intentionally out-of-order vs parents — README's history note already embraces the mess). No force-push. Repo rename via `gh` after final push.

## 9. Out of scope

- Live beU proxying at runtime, user accounts migration, database schema changes, i18n.
