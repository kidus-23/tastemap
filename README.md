# tastemap (working name)

## Where this currently stands

Scaffolding is up (Next.js + TS + Tailwind), Postgres runs in Docker, and
the Prisma schema is drafted. Pure ranking module works and is testable
from the CLI. Guest demo dataset (Addis places + a pile of comparisons) is
committed but not wired into any UI yet.

## The idea, unchanged since May

Ranking without stars. Every "been" place earns its position through
head-to-head questions instead of a rating. Sketch of current state:

- `src/lib/ranking.ts` — pure, no React, no DB: derive full order from a
  comparison graph; place a NEW entry with ⌈log₂(n+1)⌉ questions
- `src/data/addis-seed.ts` — 18 real Addis places + 25 matchups
- `prisma/schema.prisma` — draft (places, comparisons, users)
- maps (Leaflet) and UI — not started

## Next up

1. guest store (zustand + localStorage) — ranking on the client, zero DB
   dependency, so the demo works without round-trips
2. account mode server-side — same ranking math in place-service.ts
3. the actual UI — this is the part I keep postponing

## Running it

Nothing user-facing yet. Tests are plain tsx scripts; `npm run verify`
(out of date, only checks the pure module right now).
