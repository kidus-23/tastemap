<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project context — Tastemap (Addis Ababa edition)

- Stack: Next.js 16 (App Router) + TS + Tailwind v4 + Prisma 7 (adapter `@prisma/adapter-pg`) + PostgreSQL via docker compose (:5433) + JWT-cookie auth (`jose`) in `src/lib/auth.ts`.
- All ranking math is head-to-head-derivation only, in `src/lib/ranking.ts`. Server ops: `src/lib/place-service.ts`. Guest store (Addis seed + localStorage): `src/lib/tm-store.ts`. Guest mode never touches the database.
- Seed data: `src/data/addis-seed.ts` (12 ranked been + 6 want-to-try + 25 comparisons), demo account seeded by `prisma/seed.ts` -> `demo@tastemap.et / tastemap-demo`.
- Verify: `npm run lint`, `npx tsc --noEmit`, `npm run build`, then `npm run db:seed` + `npm run start` for the end-to-end pass (see README).
- Challenge docs live in `docs/` (product definition, core requirements, design-challenges decisions, technical requirements, seed-data provenance).
