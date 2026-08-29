# CLAUDE.md

See [AGENTS.md](./AGENTS.md) for the working instructions for AI assistants on this
repository (Next.js 16 agent rules plus the Tastemap project context below).

## Project context (Tastemap — Addis Ababa edition)

- Stack: Next.js 16 (App Router) + TypeScript + Tailwind v4 + Prisma 7 (driver
  adapter `@prisma/adapter-pg`) + PostgreSQL (docker compose on :5433) +
  custom JWT sessions (`jose`, httpOnly cookie `tastemap_session`).
- Rank comes from stored head-to-head rows only — all math in
  `src/lib/ranking.ts` (`deriveRankedOrder`, `nextComparison`, `settleSlot`);
  server ops in `src/lib/place-service.ts`, guest-mode store in
  `src/lib/tm-store.ts` reuses the same functions.
- Guest mode = Addis Ababa seed (`src/data/addis-seed.ts`) + localStorage;
  it must never call the database.
- Verify with: `npm run lint && npx tsc --noEmit && npm run build`, then
  `npm run db:seed && npm run start` for an end-to-end pass.
