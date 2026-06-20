// Guest-mode seed: a real slice of eating around Addis Ababa.
//
// Every place is a real venue (neighborhood coordinates are approximate).
// The 12 "been" places arrive already ranked through the 25 stored
// comparisons below, so guests immediately see a trustworthy list and can
// add their own places without ever seeing the database.

import type { ComparisonRecord, PlaceRecord, PriceTier, PlaceStatus } from "@/lib/types";

interface SeedInput {
  name: string;
  lat: number;
  lng: number;
  cuisine: string;
  priceTier: PriceTier;
  status: PlaceStatus;
  note: string;
  tags: string[];
  visitCount: number;
  position: number | null;
  addedAt: string;
}

// rank order was produced by the comparisons at the bottom of this file
const BEEN_SEED: SeedInput[] = [
  {
    name: "Yod Abyssinia Traditional Restaurant",
    lat: 9.0098, lng: 38.7646, cuisine: "Ethiopian", priceTier: 3,
    status: "BEEN",
    note: "Azmari players between every table. Kitfo platter is the move — go with a group and share everything.",
    tags: ["live-music", "cultural-show", "date-night"], visitCount: 4,
    position: 1, addedAt: "2026-06-14T19:30:00.000Z",
  },
  {
    name: "2000 Habesha Cultural Restaurant",
    lat: 9.0322, lng: 38.7656, cuisine: "Ethiopian", priceTier: 3,
    status: "BEEN",
    note: "Kazanchis classic. Top-tier cultural show; food a hair behind Yod but the espresso ceremony is excellent.",
    tags: ["live-music", "cultural-show", "coffee-ceremony"], visitCount: 2,
    position: 2, addedAt: "2026-05-02T20:00:00.000Z",
  },
  {
    name: "Castelli's Ristorante",
    lat: 9.0362, lng: 38.7517, cuisine: "Italian", priceTier: 3,
    status: "BEEN",
    note: "Piassa institution since 1948. Wood-and-leather interior, proper Italian pasta, legendary tiramisu.",
    tags: ["historic", "date-night"], visitCount: 2,
    position: 3, addedAt: "2026-04-11T20:15:00.000Z",
  },
  {
    name: "Kategna Restaurant",
    lat: 9.013, lng: 38.79, cuisine: "Ethiopian", priceTier: 2,
    status: "BEEN",
    note: "Gerji workday lunch spot. The kikil with berbere butter wins; injera always fresh.",
    tags: ["cheap-eats", "family"], visitCount: 7,
    position: 4, addedAt: "2026-03-08T12:40:00.000Z",
  },
  {
    name: "Social Momo",
    lat: 9.0087, lng: 38.7821, cuisine: "Momo & Fusion", priceTier: 1,
    status: "BEEN",
    note: "Steamed and fried momos with three dips, Bole side street. Fast, tiny, always full after 8pm.",
    tags: ["cheap-eats", "late-night"], visitCount: 5,
    position: 5, addedAt: "2026-03-21T19:00:00.000Z",
  },
  {
    name: "Lucy Lounge & Restaurant",
    lat: 9.0334, lng: 38.7642, cuisine: "Ethiopian", priceTier: 2,
    status: "BEEN",
    note: "Great terrace above Kazanchis; mixing Ethiopian plates with a modern bar menu. Grouper Fridays.",
    tags: ["group", "seafood", "date-night"], visitCount: 1,
    position: 6, addedAt: "2026-02-27T19:45:00.000Z",
  },
  {
    name: "Sishu Burger",
    lat: 9.0047, lng: 38.7894, cuisine: "Burgers", priceTier: 1,
    status: "BEEN",
    note: "Bole Michael smash burgers. The 'Addis Stack' with awaze mayo is the actual reason to go.",
    tags: ["cheap-eats", "late-night"], visitCount: 6,
    position: 7, addedAt: "2026-02-14T21:10:00.000Z",
  },
  {
    name: "Sichuan Restaurant",
    lat: 9.0077, lng: 38.7948, cuisine: "Chinese", priceTier: 2,
    status: "BEEN",
    note: "Rwanda Street. Real mapo tofu — tell them 'berbere level' at your own risk. Group-friendly round tables.",
    tags: ["spicy", "group"], visitCount: 2,
    position: 8, addedAt: "2026-01-29T19:30:00.000Z",
  },
  {
    name: "Tomoca Coffee",
    lat: 9.0341, lng: 38.7546, cuisine: "Café & Coffee", priceTier: 1,
    status: "BEEN",
    note: "Wavel Street, standing-room only since 1953. Macchiato, a bag of beans, done.",
    tags: ["historic", "coffee-ceremony"], visitCount: 12,
    position: 9, addedAt: "2026-01-17T08:20:00.000Z",
  },
  {
    name: "Kaldi's Coffee — Bole",
    lat: 9.0056, lng: 38.7811, cuisine: "Café & Coffee", priceTier: 1,
    status: "BEEN",
    note: "The reliable WiFi-and-spris workspace sort of cafe. Macchiato fine, weekend noise high.",
    tags: ["brunch", "family"], visitCount: 9,
    position: 10, addedAt: "2025-12-05T10:00:00.000Z",
  },
  {
    name: "Makush Art Gallery & Restaurant",
    lat: 9.0138, lng: 38.782, cuisine: "Ethiopian", priceTier: 2,
    status: "BEEN",
    note: "Eat surrounded by paintings, then buy one. Beyainatu was generous; service drifts when busy.",
    tags: ["art", "group"], visitCount: 1,
    position: 11, addedAt: "2025-11-21T19:10:00.000Z",
  },
  {
    name: "Taitu Hotel Restaurant",
    lat: 9.0349, lng: 38.7524, cuisine: "Café & Coffee", priceTier: 1,
    status: "BEEN",
    note: "Addis's first hotel (1898). Sunday coffee ceremony in the garden costs the price of two coffees.",
    tags: ["historic", "coffee-ceremony", "cheap-eats"], visitCount: 1,
    position: 12, addedAt: "2025-10-10T15:30:00.000Z",
  },
];

const WANT_SEED: SeedInput[] = [
  {
    name: "Dukem Restaurant",
    lat: 9.0039, lng: 38.7837, cuisine: "Ethiopian", priceTier: 2,
    status: "WANT_TO_TRY",
    note: "Everyone says the doro wot here outshines the Bole cultural spots. Saturday lunch mission.",
    tags: ["family", "spicy"], visitCount: 0,
    position: null, addedAt: "2026-07-02T18:00:00.000Z",
  },
  {
    name: "Meron Seafood & More",
    lat: 9.0083, lng: 38.7635, cuisine: "Seafood", priceTier: 2,
    status: "WANT_TO_TRY",
    note: "Fish Friday favorite off Meskel Flower Road. Effectively on the way home — no excuse.",
    tags: ["seafood"], visitCount: 0,
    position: null, addedAt: "2026-06-28T18:00:00.000Z",
  },
  {
    name: "Lime Tree Restaurant",
    lat: 8.9997, lng: 38.7743, cuisine: "Brunch", priceTier: 2,
    status: "WANT_TO_TRY",
    note: "Old Airport garden brunch. Reportedly worth the taxi past Bole.",
    tags: ["brunch"], visitCount: 0,
    position: null, addedAt: "2026-06-20T09:00:00.000Z",
  },
  {
    name: "Garden of Coffee",
    lat: 9.0065, lng: 38.7753, cuisine: "Café & Coffee", priceTier: 1,
    status: "WANT_TO_TRY",
    note: "Specialty roast-to-cup place; want to bring someone visiting here as the 'real' buna tour.",
    tags: ["coffee-ceremony"], visitCount: 0,
    position: null, addedAt: "2026-05-30T10:00:00.000Z",
  },
  {
    name: "Little Italy",
    lat: 9.0111, lng: 38.777, cuisine: "Italian", priceTier: 2,
    status: "WANT_TO_TRY",
    note: "If it survives the Castelli's comparison it earns a permanent slot. Pizza night test pending.",
    tags: ["family"], visitCount: 0,
    position: null, addedAt: "2026-05-12T19:00:00.000Z",
  },
  {
    name: "Aleppo Restaurant",
    lat: 9.0051, lng: 38.7761, cuisine: "Middle Eastern", priceTier: 2,
    status: "WANT_TO_TRY",
    note: "Bole hummus/shawarma place — the closest Addis gets to a proper Levantine mezze table.",
    tags: ["group"], visitCount: 0,
    position: null, addedAt: "2026-04-25T19:00:00.000Z",
  },
];

/** 25 prior comparisons among the "been" places → they arrive ranked 1..12. */

const id = (name: string) =>
  `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}` as string;export const ADDIS_PLACES: PlaceRecord[] = [...BEEN_SEED, ...WANT_SEED].map((p) => ({
  ...p,
  id: id(p.name),
}));

export const ADDIS_COMPARISONS: ComparisonRecord[] = [
  // 1>2, 1>3, 2>3
  { winnerId: id(BEEN_SEED[0].name), loserId: id(BEEN_SEED[1].name) },
  { winnerId: id(BEEN_SEED[0].name), loserId: id(BEEN_SEED[2].name) },
  { winnerId: id(BEEN_SEED[1].name), loserId: id(BEEN_SEED[2].name) },
  // 1,2,3 > 4
  { winnerId: id(BEEN_SEED[0].name), loserId: id(BEEN_SEED[3].name) },
  { winnerId: id(BEEN_SEED[1].name), loserId: id(BEEN_SEED[3].name) },
  { winnerId: id(BEEN_SEED[2].name), loserId: id(BEEN_SEED[3].name) },
  // top of 4 pops down
  { winnerId: id(BEEN_SEED[2].name), loserId: id(BEEN_SEED[4].name) },
  { winnerId: id(BEEN_SEED[3].name), loserId: id(BEEN_SEED[4].name) },
  { winnerId: id(BEEN_SEED[3].name), loserId: id(BEEN_SEED[5].name) },
  { winnerId: id(BEEN_SEED[4].name), loserId: id(BEEN_SEED[5].name) },
  { winnerId: id(BEEN_SEED[4].name), loserId: id(BEEN_SEED[6].name) },
  { winnerId: id(BEEN_SEED[5].name), loserId: id(BEEN_SEED[6].name) },
  { winnerId: id(BEEN_SEED[5].name), loserId: id(BEEN_SEED[7].name) },
  { winnerId: id(BEEN_SEED[6].name), loserId: id(BEEN_SEED[7].name) },
  { winnerId: id(BEEN_SEED[6].name), loserId: id(BEEN_SEED[8].name) },
  { winnerId: id(BEEN_SEED[7].name), loserId: id(BEEN_SEED[8].name) },
  { winnerId: id(BEEN_SEED[7].name), loserId: id(BEEN_SEED[9].name) },
  { winnerId: id(BEEN_SEED[8].name), loserId: id(BEEN_SEED[9].name) },
  { winnerId: id(BEEN_SEED[8].name), loserId: id(BEEN_SEED[10].name) },
  { winnerId: id(BEEN_SEED[9].name), loserId: id(BEEN_SEED[10].name) },
  { winnerId: id(BEEN_SEED[9].name), loserId: id(BEEN_SEED[11].name) },
  { winnerId: id(BEEN_SEED[10].name), loserId: id(BEEN_SEED[11].name) },
  { winnerId: id(BEEN_SEED[4].name), loserId: id(BEEN_SEED[9].name) },
  { winnerId: id(BEEN_SEED[2].name), loserId: id(BEEN_SEED[6].name) },
  { winnerId: id(BEEN_SEED[0].name), loserId: id(BEEN_SEED[11].name) },
];
