// Typed client-side access to the beU snapshot. The snapshot is a one-time,
// PII-scrubbed capture of the beU delivery catalog (Addis zone 1) — see
// scripts/import-beu.mjs and docs/superpowers/specs/2026-11-01-addis-taste-beu-map-design.md.
// Nothing here ever talks to the beU API at runtime.

import snapshot from "@/data/beu-snapshot.json";

export interface BeuComment {
  /** reviewer first name only — the importer strips every other identity field */
  name: string;
  date: string;
  rating: number;
  food: string | null;
  text: string;
}

export interface BeuPlace {
  beuId: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  ratingAvg: number;
  ratingCount: number;
  /** [n5, n4, n3, n2, n1] as observed on beU */
  histogram: number[];
  comments: BeuComment[];
  /** true when this venue was matched against the Addis seed list at import time */
  seedMatch: boolean;
}

export interface BeuMatch {
  place: BeuPlace;
  comments: BeuComment[];
}

interface SnapshotFile {
  retrieved: string;
  places: BeuPlace[];
}

const raw = snapshot as SnapshotFile;

export const BEU_RETRIEVED: string = raw.retrieved;

const ALL_PLACES: BeuPlace[] = raw.places;

/** Top favorites for the map layer — seed-match venues are shown as part of
 *  the user's own list (enriched), never duplicated as separate favorites. */
export const BEU_FAVORITES: BeuPlace[] = ALL_PLACES.filter((p) => !p.seedMatch);

/** Order-weighted presence score, for sorting pins that deserve the front of
 *  the layer (kept from the import's ranking for any secondary listing). */
export function popScore(place: BeuPlace): number {
  return place.ratingCount * place.ratingAvg;
}

/** Same rules as the importer's matcher: venue-name matching keyed on a
 *  single name — branch/neighborhood tags and generic food words drop out,
 *  so "Tomoca Coffee" resolves to "Tomoca | 22" and "Sishu Burger" never
 *  matches just any burger joint. Returns null when beU has no verified
 *  data for the venue. */
export function beuFor(name: string): BeuMatch | null {
  const seedTokens = identityTokens(name);
  if (seedTokens.length === 0) return null;
  let best: { place: BeuPlace; sim: number } | null = null;
  for (const place of ALL_PLACES) {
    const sim = simScore(seedTokens, identityTokens(place.name));
    if (best === null || sim > best.sim) best = { place, sim };
  }
  if (!best || best.sim < 0.6) return null;
  return { place: best.place, comments: best.place.comments };
}

/** distinctiveness helpers — identical rules to the importer's matcher */
const GENERIC = new Set([
  "restaurant", "ristorante", "pizzeria", "cafe", "coffee", "burger", "pizza",
  "hotel", "lounge", "kitchen", "bar", "food", "fast", "juice",
  "traditional", "cultural", "and", "the", "of", "birr", "your", "place",
  "garden",
]);
const NEIGHBORHOODS = new Set([
  "bole", "gerji", "sarbet", "kazanchis", "kazanchise", "summit", "lafto",
  "kilo", "jemo", "gotera", "jacros", "piassa", "saris", "balderas",
  "century", "mall", "medhanialem", "goro", "megenagna", "cmc", "ayat",
  "22", "4", "6", "1",
]);

function identityTokens(s: string): string[] {
  const segments = s
    .split(/[|/:,\u2014\u2013]+/)
    .map((seg) => seg.trim())
    .filter((seg) => seg.length >= 4 && !/^\d+$/.test(seg) && !NEIGHBORHOODS.has(seg.toLowerCase()));
  return segments
    .flatMap((seg) => seg.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" "))
    .filter((t) => t.length >= 3 && !GENERIC.has(t));
}

function simScore(seed: string[], beu: string[]): number {
  const hits = seed.filter((t) =>
    beu.some((b) => b === t || (b.length >= 3 && b.startsWith(t)))
  ).length;
  return hits / seed.length;
}

/** Google Maps directions that resolve a POI, never bare coordinates. */
export function mapsDirectionsUrl(name: string, address: string): string {
  const dest = `${name}, ${address}, Addis Ababa`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}
