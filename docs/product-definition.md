# tastemap (working name)

Second scratch document for the same idea. Rougher than I'd like admitted
in public, but this is the planning pen.

## What this is

A personal restaurant map + ranking app for **Addis Ababa**. Log every place
you've eaten, and let a place *earn* its rank by way of small head-to-head
questions ("which was better — A or B?"), instead of stars that celebrate
everything at 4.

This adapts the Frontend Mentor "restaurant ranking" challenge (product
challenge, no Figma file — all design decisions are mine) to my own city.
Most public builds of this challenge are on the London sample data, so I'm
writing the spec down fresh for Addis and seeding the comparison history
myself. The brief itself I reconstructed from other builders' READMEs —
because it works.

## What a user does

1. Open the app cold — no login. The map is already warm: a handful of real
   Addis restaurants, ranked, each with a one-line note my past self would
   have written.
2. Add a place you've actually been to (name + a point on the map is enough;
   a search field and tags and a note are nice but optional).
3. Answer a couple of head-to-head questions. The place slots in ~3-4.
4. Keep a want-to-try list for places you haven't been yet. Legend: the one
   you're certain about is a warmer pin.

## Ranking rules (draft)

- Only "been" places carry a rank; want-to-try has none.
- A brand-new been place compares with the current list at position by
  binary insertion … questions: ceil(log2(n+1)).
- Ties: keep both in place, prefer newest locally, but never claim false
  precision — the UI will simply not show an invented half-rank.
- Delete: a deleted place removes its comparisons with it (no orphans).

## Non-goals (for now)

- No reviews, comments, or social layer.
- No photo uploads — OSM tiles and text are enough for v1.
- No API keys anywhere. OSM tiles + Nominatim are free at the needed volume.

## Data

Seed data: hand-curated. Real venues and my actual picks — Yod Abyssinia,
2000 Habesha, Castelli's, Tomoca, Kaldi's, Sishu Burger, Social Momo —
plus a want-to-try pile for places I keep meaning to get to.
Neighborhood-grade coordinates are enough (Bole, Kazanchis, Piassa, Old
Airport, Gerji, Sarbet). A "which did you prefer" pile of ~25 prior
matchups walks the seed list into a deterministic rank order I actually
agree with.
