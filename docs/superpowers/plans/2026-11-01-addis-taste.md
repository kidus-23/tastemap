# Addis-Taste × beU Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mount real beU delivery data into the map as pop-out cards (Option A) + toggleable favorites layer, rebrand tastemap → Addis-Taste everywhere, harden security, verify/fix the README, remove agent files — as 4 commits dated Oct 7/12/15/24 2026 appended to `main`, then rename the GitHub repo.

**Architecture:** One-time import script writes a PII-scrubbed snapshot JSON consumed statically by a small typed client lib. MapPanel grows a favorites marker layer + React pop-card overlay anchored via `latLngToContainerPoint`. Security = headers in `next.config` + in-memory rate-limit middleware. No new npm dependencies.

**Tech Stack:** Next.js 16.4.3 (App Router), TS, Tailwind v4, Leaflet 1.9 + markercluster (existing), zustand persist (existing), plain Node ESM for the import script, Playwright (existing devDep) for screenshots.

**Spec:** `docs/superpowers/specs/2026-11-01-addis-taste-beu-map-design.md`

## Global Constraints

- Next 16: before touching app code, check `node_modules/next/dist/docs/` for the touched APIs (middleware, headers, metadata) per the project AGENTS markdown convention.
- No new runtime npm dependencies; no dependency version changes except `npm audit fix` minor/patch-only wins.
- PII rule (verbatim from spec): reviews keep only first name, date, rating, comment text, food name — never phone/email/firebase tokens.
- Snapshot retrieval date string: `"2026-10-07"`.
- Commit dates (+03:00): Oct 7 → `2026-10-07T10:42:31+03:00`, Oct 12 → `2026-10-12T16:05:09+03:00`, Oct 15 → `2026-10-15T09:17:44+03:00`, Oct 24 → `2026-10-24T14:33:27+03:00`, set through `GIT_AUTHOR_DATE` + `GIT_COMMITTER_DATE`. Regular `git commit` otherwise; **no force-push, no history rewrite**.
- Store key: `addistaste-v1` (old guest data silently reseeds — acceptable per spec).
- Keep the existing visual language: Tailwind tokens already in `globals.css` (`paper`, `pine`, `card`, `line`, `mustard`, `font-display`), pin classes `.tm-pin*`.
- Commit message style: lowercase imperative, no prefix (matches existing log).

## Review Focus

1. **PII leakage through reviewer references** — a reviewer record containing a phone/email/token must never reach the snapshot; expect: selftest proves scrub strips all fields except first-name/date/rating/food/text. → pinned by import selftest (Task 1).
2. **Snapshot has no beU data for a venue** — pin tap on a non-matching place must show no beU block, never a fake one; expect: "Not on beU" note in detail sheet only. → pinned by tsc-typed `BeuMatch | null` lookup + detail-sheet branch (Task 3).
3. **Directions URL resolving to bare coordinates** — destination must be `"<name>, <address>, Addis Ababa"` URL-encoded so Google Maps resolves a POI; expect: no `q=<lat>,<lng>` output anywhere. → pinned by unit step in beu lib test (Task 1).
4. **CSP breaking Leaflet/OSM tiles or Next inline hydration** — pragmatic whitelist, not strict nonce CSP; expect: app boots and tiles load after headers ship. → pinned by header smoke against `npm start` (Task 4).
5. **Zustand persist key rename stranding guest state** — old `tastemap-guest-v1` data must be ignored, not crash; expect: fresh seed appears. → pinned by lint/typecheck + manual dev smoke (Task 2).

---

### Task 1: beU import script + snapshot + typed data lib (commit 1 — Oct 7)

**Files:**
- Create: `scripts/import-beu.mjs`
- Create (generated): `src/data/beu-snapshot.json`
- Create: `src/lib/beu.ts`
- Create: `scripts/verify-beu.ts`

**Interfaces:**
- Produces: `src/data/beu-snapshot.json` — `{ retrieved: "2026-10-07", places: BeuPackedPlace[] }` where `BeuPackedPlace = { beuId: number; name: string; address: string; lat: number; lng: number; ratingAvg: number; ratingCount: number; histogram: [number, number, number, number, number]; comments: BeuComment[] }`, `BeuComment = { name: string; date: string; rating: number; food: string | null; text: string }` (histogram index 0 = five stars, count-ordered; ≤ top 40 by ratingCount plus any seed-name matches).
- Produces (consumed by Tasks 2–3): `src/lib/beu.ts` exports `BEU_RETRIEVED: string`, `type BeuComment`, `type BeuPlace`, `type BeuMatch = { place: BeuPlace; comments: BeuComment[] }`, `beuFor(name: string): BeuMatch | null` (seed-venue name match), `BEU_FAVORITES: BeuPlace[]` (top 40 minus seed matches), `popScore(histogram: number[]): number`, `mapsDirectionsUrl(name: string, address: string): string` → `https://www.google.com/maps/dir/?api=1&destination=<encoded "name, address, Addis Ababa">`.

- [ ] **Step 1: Write `scripts/import-beu.mjs`** — sweep `GET /api/v1/categories` → `/api/v1/categories/restaurants/{id}?limit=50&offset=…` + `popular`, headers `{ "zoneId": "1", "X-Location-Lat": "8.9908", "X-Location-Lng": "38.7899", Accept, "User-Agent": "curl/8" }`, dedupe by `id`, sort by computed avg×count. Seed matches = names in `src/data/addis-seed.ts` matched by normalized token-overlap (normalize: lowercase, strip non-alphanum, `|`→" ", drop stage tags like "bole"/"gerji"). For each kept venue fetch ≤ 60 reviews (`/api/v1/restaurants/reviews?restaurant_id=…&offset=1&limit=60`), keep comments with `length ≥ 15` and not `"No comment"`, newest-first, ≤ 8, map to `BeuComment` with **scrub**: keep `customer.f_name`, `created_at.slice(0,10)`, `rating`, `food_name`, `comment` — copy no other field. `--selftest` flag runs inline asserts: input review object containing phone/email/token yields comment with only whitelisted keys, and `mapsDirectionsUrl` output contains no `,` -joined coordinate pair.
- [ ] **Step 2: Run selftest + import.** Run: `node scripts/import-beu.mjs --selftest` → all asserts pass; `node scripts/import-beu.mjs` → writes `src/data/beu-snapshot.json`, logs venue count; expect **≥ 40** favorites with `ratingCount > 0` (degrade gracefully if fewer — log warning, don't fail).
- [ ] **Step 3: Write `src/lib/beu.ts`** with the exports above (`import snapshot from "@/data/beu-snapshot.json"`); `beuFor` uses the same normalization; `popScore` = precomputed from histogram for card sort.
- [ ] **Step 4: Write `scripts/verify-beu.ts`** (tsx, like existing verify scripts): imports the lib, asserts (a) snapshot venue count ≥ 40, (b) every comment's keys ⊆ `{name,date,rating,food,text}`, (c) no snapshot string matches `/\+251\d+/` or `firebase_token` or `@gmail`, (d) `mapsDirectionsUrl` starts with the api=1 URL and encodes a name, (e) `beuFor("Tomoca Coffee")` finds the Tomoca match (validate actual match exists in snapshot at import time; if it doesn't, drop this assert in favor of any one real match).
- [ ] **Step 5: Run** `npx tsx scripts/verify-beu.ts` → PASS; `npx tsc --noEmit` → clean.
- [ ] **Step 6: Commit**
  ```bash
  GIT_AUTHOR_DATE="2026-10-07T10:42:31+03:00" GIT_COMMITTER_DATE="2026-10-07T10:42:31+03:00" \
    git commit -m "import beu delivery data as a pii-scrubbed snapshot + typed lookup lib"
  ```

### Task 2: map pop-cards (Option A) + favorites layer + Addis-Taste rebrand (commit 2 — Oct 12)

**Files:**
- Modify: `src/components/map-panel.tsx` (favorites layer + pop-card overlay)
- Modify: `src/components/dashboard.tsx` (beU toggle state + props)
- Modify: `src/components/place-detail.tsx` (beU section + directions button + not-on-beU note)
- Modify: `src/app/globals.css` (`.tm-pin-beu`, `.tm-pin-active-beu` variants near existing `.tm-pin*` block)
- Modify: `src/lib/tm-store.ts:351` (`name: "tastemap-guest-v1"` → `"addistaste-v1"`)
- Modify: `src/app/layout.tsx:21-25` (metadata: "Addis-Taste — your Addis Ababa top tables", description mentioning beU-powered map)
- Modify: `package.json:2` (`"name": "addis-taste"`)
- Modify: every file matching `grep -ri tastemap src/ package.json` — app strings → "Addis-Taste" (top-bar, lander `src/app/page.tsx`, login/signup pages, dialogs, compare-flow); GitHub URL `kidus-23/tastemap` → `kidus-23/addis-taste` even though the rename happens in Task 5.

**Interfaces:**
- Consumes: `BEU_FAVORITES`, `beuFor`, `mapsDirectionsUrl`, `BEU_RETRIEVED` (Task 1).
- Produces: `MapPanel` props extended with `beuLayer: boolean` (favorites visible) and unchanged `ranks/onSelect` contract; dashboard/local state `showBeu` defaulting true on ≥lg viewports, false on mobile; `PlaceDetail` unchanged props (beU injected internally via `beuFor(place.name)`).

- [ ] **Step 1: Favorites layer in `map-panel.tsx`** — when `beuLayer`, add a second pass in the rebuild effect: cluster-group markers from `BEU_FAVORITES`-derived pins with `divIcon` html `<div class="tm-pin tm-pin-beu">` showing a 🍽 emoji, `title: name`, excluded from selection/hover id logic; clicking a favorites pin sets internal state `activeBeu`. CSS variant: green `--pine` fill.
- [ ] **Step 2: Pop-card overlay (Option A)** — internal React state machine `activeBeu` + `expanded: boolean`; position card with `map.latLngToContainerPoint([lat,lng])` recomputed on `map.moveend`/resize (`useEffect` listeners on the Leaflet map instance). Compact card: name + `beU` pill, ★avg (`ratingAvg.toFixed(1)`), count, ONE comment (first), actions: `🧭 Directions` anchor (`mapsDirectionsUrl`, `target="_blank" rel="noreferrer"`) and `⌄` expand button. Expanded: adds 5-bar histogram (flex bars, widths ∝ histogram values) + up to 3 comments + `📖 Full details` button only when `beuFor(name)` returned a seed-venue match (then `onSelect(placeId)`); outside-click/`×` closes; Enter/Space on pin toggles like existing pins. Tailwind classes per existing tokens; animation: `transition-transform scale/opacity` spring-in via CSS keyframe in globals.css (`.beu-card-pop`).
- [ ] **Step 3: Detail-sheet beU section in `place-detail.tsx`** — after the note block: `const beu = beuFor(place.name)`; when `beu`: card with `On beU · ★x.x · N orders rated`, mini histogram, ≤ 8 comments + section-sourced `retrieved BEU_RETRIEVED` microcopy, `🧭 Directions` button; when null and place is WANT_TO_TRY: quiet "not on beU — add it if you visit" line. No other prop changes.
- [ ] **Step 4: Dashboard wiring + toggle** — `const [showBeu, setShowBeu] = useState(true)` (default false when `window.matchMedia("(max-width: 1023px)")` at mount), pass `beuLayer={showBeu}`; toggle rendered on the map corner control (and mobile map tab) — small pill "beU favorites".
- [ ] **Step 5: Rebrand sweep + store key + rerun data check** — store key rename, metadata, package name, string sweep (case-sensitive: keep repo-internal mentions like README until Task 5). Run `npx tsx scripts/verify-beu.ts && npm run lint && npx tsc --noEmit`.
- [ ] **Step 6: Dev smoke (docker up if needed)** — if `docker compose up -d` works, bring the DB for later reuse; smoke: `npm run dev` → guest dashboard → map shows favorites toggled, tap a pin → card appears with real Cocoon/YeBet data, Directions link opens google.com/maps domain URL with the venue name. (Manual; record findings.)
- [ ] **Step 7: Commit**
  ```bash
  GIT_AUTHOR_DATE="2026-10-12T16:05:09+03:00" GIT_COMMITTER_DATE="2026-10-12T16:05:09+03:00" \
    git commit -m "beu pop-out pin cards + favorites layer, app renamed addis-taste"
  ```

### Task 3: security hardening + agent-file removal (commit 3 — Oct 15)

**Files:**
- Modify: `next.config.ts` (add `headers()` returning 4 header groups)
- Create: `src/middleware.ts` (rate limit `/api/auth/login` + `/api/auth/signup`)
- Delete: `AGENTS.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: nothing new.
- Produces: headers on all routes: `Content-Security-Policy: default-src 'self'; img-src 'self' https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://development-image.beuapi.com https://beu-img.s3.me-south-1.amazonaws.com https://beu-img2.s3.eu-west-1.amazonaws.com data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self'; font-src 'self' data: https://fonts.gstatic.com; frame-ancestors 'none'`; `X-Content-Type-Options: nosniff`; `X-Frame-Options: DENY`; `Referrer-Policy: strict-origin-when-cross-origin`. Middleware: fixed-window token bucket keyed by IP (x-forwarded-for first hop), 10 attempts / 5 min on auth POSTs → `429 {"error":"Too many attempts. Try again in a few minutes."}`.

- [ ] **Step 1: Check `node_modules/next/dist/docs/`** for `middleware` + `headers` current signatures (Next 16 may differ from training data); adjust the shapes in Steps 2–3 to what the docs say.
- [ ] **Step 2: `next.config.ts` headers** — `async headers()` with the exact header set above applied to `source: "/:path*"`.
- [ ] **Step 3: `src/middleware.ts`** — module-level `Map<string, {count, resetAt}>`, gate only `req.method === "POST"` + path prefix `/api/auth/login|/api/auth/signup`; clean expired entries opportunistically; excluded from auth GET routes.
- [ ] **Step 4: `npm audit`** — run; apply only fixes that are minors/patches with no breaking-change note; if none apply cleanly, record output and skip. No new deps.
- [ ] **Step 5: Delete agent files** — `git rm AGENTS.md CLAUDE.md`; add note in README Credits that agent-rule files were removed.
- [ ] **Step 6: Verify** — `npm run build` (confirm AGENTS.md is NOT regenerated as a tracked/untracked file, and clean tree after); then header smoke on `npm start`: `curl -sI http://localhost:3000 | Select-String "content-security|options|referrer"` all 4 present; rate-limit smoke: 11 rapid POSTs to `/api/auth/login` with bad creds → throttled 429 by attempt ~11 (auth DB needed → ensured docker compose up).
- [ ] **Step 7: Commit**
  ```bash
  GIT_AUTHOR_DATE="2026-10-15T09:17:44+03:00" GIT_COMMITTER_DATE="2026-10-15T09:17:44+03:00" \
    git commit -m "security headers, login rate limiting, removed agent rules files"
  ```

### Task 4: README verify-and-fix + screenshots + full gate (commit 4 — Oct 24)

**Files:**
- Modify: `README.md` (full Addis-Taste rewrite)
- Create: `scripts/screenshot.cjs` (Playwright headless; guest dashboard at 1440×900 + 390×844 mobile; `docs/screenshots/*`)
- Modify: `docs/screenshots/*` (regenerated)

**Interfaces:**
- Consumes: built app + DB (docker), snapshot from Task 1.

- [ ] **Step 1: Run the README's own verify path end-to-end** — `npm run lint && npx tsc --noEmit && npm run build && npm run verify`; fix any drift (README claims → actual behavior).
- [ ] **Step 2: Rewrite README** — retitle "# Addis-Taste — Addis Ababa", keep existing voice/sections (screenshots, why-no-stars, how-it-was-built, bugs-lessons, credits), add "beU-powered map cards" section: Option-A card behavior, favorites layer toggle, Google Maps directions, honest data provenance (snapshot `retrieved 2026-10-07`, ~40 top delivery spots, seed-match rate, PII policy: first names only), repo links → `github.com/kidus-23/addis-taste`, drop any doc links that will no longer exist (AGENTS.md/CLAUDE.md).
- [ ] **Step 3: Screenshots** — `scripts/screenshot.cjs` drive guest dashboard: landing, dashboard-desktop, detail-desktop (a beU place → card visible), compare-question, compare-settled, mobile-list, mobile-map (beU toggle visible). Run with `npm start` + DB per README; if a view can't render headlessly, keep the existing screenshot and note it in the README.
- [ ] **Step 4: Final gate** — `npm run lint && npx tsc --noEmit && npm run build && npm run verify && npx tsx scripts/verify-beu.ts` all green; `git status` clean.
- [ ] **Step 5: Commit**
  ```bash
  GIT_AUTHOR_DATE="2026-10-24T14:33:27+03:00" GIT_COMMITTER_DATE="2026-10-24T14:33:27+03:00" \
    git commit -m "readme rewritten for addis-taste, regenerated screenshots"
  ```

### Task 5: push + repo rename (no commit)

- [ ] **Step 1: Confirm history** — `git log --format="%h %ad %s" --date=iso -6` shows the 4 dated commits on top of the existing 17; check `gitCV dates` plausible; no stray `.superpowers/` tracked (`git status --ignored` spot check).
- [ ] **Step 2: Push** — `git push origin main` (fast-forward expected; if rejected, STOP and report — no force-push).
- [ ] **Step 3: Rename** — `gh repo edit kidus-23/tastemap --rename addis-taste` then `git remote set-url origin https://github.com/kidus-23/addis-taste.git`; verify `gh repo view kidus-23/addis-taste --json name,url`.
- [ ] **Step 4: Post-rename README links** — `kidus-23/tastemap` references committed in Task 2/4 should already read `addis-taste` (done in those tasks); if any residual link 404s, fix in a small follow-up commit (dated Oct 24 `+03:00`, message "fix post-rename links") rather than rewriting Task 4's commit.
