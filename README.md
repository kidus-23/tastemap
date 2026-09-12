# Tastemap — Addis Ababa

A restaurant map and ranking app for Addis Ababa, Ethiopia. Log the places you've eaten, rank them through quick head-to-head comparisons ("which was better?"), and keep a map of everything you still want to try.

This is my take on the [Frontend Mentor "restaurant ranking" challenge](https://www.frontendmentor.io), rebuilt for my own city instead of the London sample data. I reconstructed the brief from other builders' repos (details down in Credits) and wrote my own product spec, seed data, and design docs for Addis — they all live in [`docs/`](docs).

## Why there are no stars

Everyone rates restaurants on a one-to-five scale, and it stops being meaningful around the third favorite. If all my usual kitfo spots get four stars, I've learned nothing about which one to actually go back to.

So I removed ratings. A place's rank comes out of little head-to-head questions — the app computes ⌈log₂(n+1)⌉ matchups via binary insertion, so each place lands in the list after roughly a handful of them. The exact code path is `deriveRankedOrder` / `nextComparison` / `settleSlot` in [`src/lib/ranking.ts`](src/lib/ranking.ts) and, honestly, that file is the heart of the app.

## How it was built

I started this in May 2026 as a stack of notes and a hand-drawn sketch of a ranked list, mostly to answer one question I kept arguing about with myself: "do ratings work when the thing being rated is food you re-visit?" Short version — they don't. So Tastemap's whole premise became: never ask for a score, ask for comparisons between things you've already been to.

The first thing I actually got working was the pure ranking module — no UI, just TypeScript in `src/lib/ranking.ts`, with a script that derived an order from a fake pile of matchups and printed it. Once that could place a new venue in the right slot, everything else was scaffolding around it.

A few decisions worth explaining, since they cost me the most time:

- **The ranking is derivation-only.** There's no `position` you can argue with in the UI — the server recomputes it from the stored comparison graph every time. When two places are perfectly even in the graph, the most recent result between them stands, and the list just says so ("tied — settle it with a new answer"). That trade-off showed up in `docs/design-challenges.md` before I wrote a line of UI.
- **Guest mode comes first.** Every "what if" feature check on a half-built app is painful if you need a database running. The Addis Ababa seed (12 ranked been places, 6 want-to-try, 25 prior matchups — real venues, my own picks) lives in `src/data/addis-seed.ts`, loads straight into a Zustand store with localStorage, and never talks to the DB. That's also why the demo is useful: you open the app and it's an *interesting* app, not an empty one.
- **No frills on map/geocoding.** Leaflet + OpenStreetMap tiles + leaflet.markercluster, all keyless. Geocoding goes through Nominatim proxied by one small API route (`src/app/api/geocode`) so we control the User-Agent it's sent with (the usage policy requires it), with a manual "drop the pin" fallback when the street address isn't in OSM. There's no API key anywhere in the repo because it's nowhere in the app.
- **Auth is boring on purpose.** `jose` + bcryptjs, one httpOnly cookie, JS routes for signup/login/logout and an `/api/places` + `/api/compare` pair. Same ranking math runs server-side in `src/lib/place-service.ts` — a good check that `ranking.ts` really was framework-free.

### Bugs I had to fix (all hindsight lessons)

- The "settled!" modal used to close itself the same tick the flow ended, so you never saw the rank — settle and dialog-close were one state update. Now the dialog owns its close button; settling only switches its content.
- "The list has spoken" for a bottom-ranked place never fired — the code compared the rank against the *question count* (≈5) rather than the list length.
- Editing one place brought another place's values — the dialog mount persists, stale `useState` initializers.
- Pin highlight always dropped after the markers got rebuilt (a build races the highlight style) — now the rebuild reads the live selection from a ref.
- Phone map tab was grey when the map initializes hidden in `display:none` → `map.invalidateSize()` from a ResizeObserver when it appears.
- Top bar overflow on ≤360 px when both auth buttons and the search field render — the search drops to its second row below sm.
- The map used to boot inside the dashboard's zero-height "initializing" state — Leaflet built its whole tile lattice collapsed and never recovered. It now waits for a real layout before creating the map, and a ResizeObserver feeds it `invalidateSize` ever after.
- The list showed the *stored* position, which only the just-settled place ever gets — so when a new place took #1, the old #1 also kept showing "1". All ranks (list, pin labels, detail sheet) now come straight from the derived head-to-head order.

Every change is pinned down headlessly with `npm run verify` (two scripts: ranking invariants and guest-flow semantics). If something UI-side could go wrong in a session, the verify scripts cover where it came from.

### Two features of my own (from the challenge brief's open decisions)

1. **"Where should we eat?"** — the "Surprise me" button on the dashboard. Filters already narrow to what you want (want-to-try, price range, cuisine, tag), the button picks one out of the eligible set, does a short shuffle, centers the map and opens its detail page, so the decision takes two taps.
2. **One shared selection state.** Select a pin or a list card and both follow: surfacing detail opens, the map centers in on the place, its pin glows. Map and list never disagree about what you're looking at.

Both are written up in [`docs/design-challenges.md`](docs/design-challenges.md) with the alternatives I rejected.

## Tech stack

| Layer      | Choice                                                     |
| ---------- | ---------------------------------------------------------- |
| Framework  | Next.js 16 (App Router) + TypeScript + React 19            |
| Styling    | Tailwind CSS v4                                            |
| Database   | PostgreSQL (Docker Compose for local dev, any DATABASE_URL for prod) |
| ORM        | Prisma 7 + `@prisma/adapter-pg`                            |
| Auth       | Custom JWT sessions (`jose`, httpOnly cookies, bcryptjs hashing) |
| Map        | Leaflet + leaflet.markercluster, OpenStreetMap tiles (keyless) |
| Geocoding  | Nominatim (keyless, a proper User-Agent, manual pin-drop fallback) |
| Guest mode | Fully client-side — Addis Ababa seed dataset in Zustand + localStorage, never touches the database |

## Run it yourself

```bash
git clone https://github.com/kidus-23/tastemap.git
cd tastemap
npm install
cp .env.example .env      # set DATABASE_URL (a Postgres 17+ instance)
docker compose up -d      # or your own Postgres
npm run db:push           # create the tables
npm run db:seed           # optional: demo account — demo@tastemap.et / tastemap-demo
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) and hit **Try as guest** — the full seed data loads with zero setup.

Before claiming anything works, I keep two gates:

- `npm run verify` — headless ranking + guest-flow checks (these catch the ranking math bugs before a browser does)
- and then make sure `npm run build`, `npx tsc --noEmit` and `npm run lint` are all clean too

## What's in the repo

```
├── docs/
│   ├── product-definition.md     # the product took shape while writing this
│   ├── core-requirements.md      # features + their acceptance criteria
│   ├── design-challenges.md      # rationale for the 3 "design it yourself" calls
│   ├── technical-requirements.md
│   └── data/                     # the Addis seed data as CSV, its derivation
├── prisma/                       # schema + demo-account seed
├── src/
│   ├── app/                      # Next routes: landing, dashboard, API handlers
│   ├── components/               # Leaflet panel, list cards, detail sheet, dialogs…
│   ├── lib/                      # ranking.ts, store, auth, server actions
│   └── data/addis-seed.ts        # guest dataset: 18 places + 25 matchups
├── scripts/                      # verify scripts + the screenshot generator
└── docker-compose.yml            # local Postgres
```

## Data provenance

The seed dataset is real places — Yod Abyssinia, 2000 Habesha, Castelli's, Tomoca, Kaldi's, Sishu Burger, Social Momo, Sichuan, Lucy Lounge, Makush, Kategna, Taitu Hotel and a few more — with coordinates out to neighborhood level (Bole, Kazanchis, Piassa, Old Airport, Gerji, Sarbet). Where I got it and how each prior matchup was chosen: [`docs/data/README.md`](docs/data/README.md). The CSV in there regenerates straight from `src/data/addis-seed.ts`, so the seed stays one source of truth.

## Credits

- [Frontend Mentor](https://www.frontendmentor.io) challenge — restaurant ranking app. (`Mduduzi-Ndlovu1/tastemap` and `suman-hazra/tastemapsf`'s write-ups were my main cues for reconstructing the brief — thanks.)
- Map tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
- Geocoding by [Nominatim](https://operations.osmfoundation.org/policies/nominatim/) — used sparingly per their usage policy.
- Addis Ababa seed data is invented. Places are real; the opinions are mine.
