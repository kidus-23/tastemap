# Technical requirements — Tastemap (Addis Ababa edition)

## Data model

```
User         id, email, passwordHash, name, createdAt
Place        id, userId, name, lat, lng, cuisine, priceTier(1..3),
             status(BEEN|WANT_TO_TRY), note, tags[], visitCount,
             statusEnteredAt
Comparison   id, userId, winnerId -> Place, loserId -> Place, createdAt
```

- **Raw comparisons are the source of truth.** Rank is derived (see `src/lib/ranking.ts`), not stored as a magic number — recomputation is deterministic from comparisons alone.
- Guest mode uses the same shapes client-side; guests' places/comparisons never hit the database.

## Ranking algorithm

- Insertion uses median binary insert: the proposed position for a new place is decided in ⌈log₂(n)⌉ questions against the user's existing ranking; a persisted `position` per place is **only** a cache of the last settled result — changed by exactly one thing, a completed comparison flow.
- Derived tie handling: unresolvable pairs render as `7=` / `7=` with an explicit "settle it" action.
- Deleting a place deletes comparisons involving it.

## Authentication

- Email + password with **bcrypt** hashing; sessions are **stateless JWTs** in httpOnly, SameSite=Lax cookies (signed with JWT_SECRET); no cookies-readable tokens in markup; no `localStorage` tokens.
- Guest mode is server-free by design and touches nothing resembling `/api/places`: the DB only ever sees signed-up users' rows.

## Map & geocoding

- Leaflet + leaflet.markercluster with plain OSM raster tiles (keyless, attribution kept in-map).
- Add-place search uses Nominatim (`https://nominatim.openstreetmap.org/search`) with a proper `Accept`/`User-Agent`-shaped request per its usage policy, a debounce to stay polite, and a **manual lat/lng fallback** to keep all editing possible if the service is slow.
- Both guest and logged-in users' `markers` respect filters and current selection.

## Database & deployment

- PostgreSQL. Local dev runs it via `docker compose up -d`; can equally reuse a hosted Postgres (e.g. Neon) by pointing `DATABASE_URL` at it.
- Prisma DB schema provisioned with `prisma db push` (no migrations stored) so dev/hosted DBs stay identical; guest users can sign up at any time without a restart.
- Next.js 16 + React 19 must typecheck clean under `next build` — strong typing through prisma client + no `any` chains.

## Performance & accessibility

- Map marker layer re-renders only on filter/selection change; list uses keyed rows.
- Pins are buttons first: keyboard focusable, labeled (`aria-label="rank 12, Yod Abyssinia"`), and the comparison flow is fully operable by keyboard.
- Contrast tokens (warm dark-green `#2F5233` on off-white `#FAF7F2`) sit ≥ 4.5:1 in text usage.
