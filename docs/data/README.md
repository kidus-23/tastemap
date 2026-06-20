# Seed data — Addis Ababa guest dataset

The guest experience boots with `src/data/addis-seed.ts`:

- **12 "been" places**, already ordered 1–12 through **25 head-to-head comparisons** that are also part of the seed. The comparisons enforce the full chain (each rank beats the next lower one directly), so the derived order is unique — the guest list looks exactly the same on every first load.
- **6 "want to try" places**, no comparisons needed.
- Coordinates are neighborhood-accurate (Bole, Kazanchis, Piassa, Gerji, Old Airport, Sarbet), not survey-grade; they're for pins and flying, not directions.

## Conventions

| Field       | Notes                                                              |
| ----------- | ------------------------------------------------------------------ |
| `priceTier` | 1 = under 150 birr · 2 = 150–500 birr · 3 = 500+ birr             |
| `cuisine`   | free-text but constrained to the `CUISINES` list in `src/lib/types.ts` |
| `tags`      | constrained to the `TAGS` list                                     |
| `addedAt`   | ISO date; seeded back a few months so the list feels lived-in      |

## Provenance & caveats

All venues are real Addis Ababa institutions (Yod Abyssinia, 2000 Habesha, Castelli's since 1948, Tomoca since 1953, Taitu since 1898, Kategna, Sishu, Sichuan, Lucy Lounge, Makush, Dukem, Meron Seafood, Lime Tree, Garden of Coffee, Little Italy, Aleppo). Notes are flavor text written for the demo persona; visit counts and the "tasted every dish" details are illustrative. Prices and coordinates drift — treat the dataset as a strong starting point, not scripture.

## The demo account

`npm run db:seed` re-creates `demo@tastemap.et` (password `tastemap-demo`) in Postgres with **the same 18 places and 25 comparisons**, so the database-backed account experience matches the guest experience. Re-running the script deletes and reseeds that user only.
