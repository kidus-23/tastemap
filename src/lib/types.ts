// Shared domain types — the same shapes are used by the guest store
// (localStorage) and by the API-backed account mode.

export type PlaceStatus = "BEEN" | "WANT_TO_TRY";
export type PriceTier = 1 | 2 | 3;

export interface PlaceRecord {
  id: string;
  name: string;
  lat: number;
  lng: number;
  cuisine: string;
  priceTier: PriceTier;
  status: PlaceStatus;
  note: string;
  tags: string[];
  visitCount: number;
  /** 1-based rank among the user's "been" places; null = pending rank (or want-to-try) */
  position: number | null;
  addedAt: string;
}

export interface ComparisonRecord {
  winnerId: string;
  loserId: string;
}

export interface Snapshot {
  places: PlaceRecord[];
  comparisons: ComparisonRecord[];
}

export const CUISINES = [
  "Ethiopian",
  "Café & Coffee",
  "Italian",
  "Chinese",
  "Burgers",
  "Momo & Fusion",
  "Seafood",
  "Brunch",
  "Bakery",
  "Middle Eastern",
] as const;

export const PRICE_TIERS: { tier: PriceTier; label: string }[] = [
  { tier: 1, label: "$" },
  { tier: 2, label: "$$" },
  { tier: 3, label: "$$$" },
];

export const TAGS = [
  "live-music",
  "cultural-show",
  "date-night",
  "historic",
  "coffee-ceremony",
  "cheap-eats",
  "family",
  "group",
  "spicy",
  "seafood",
  "art",
  "late-night",
  "juice",
  "brunch",
] as const;

export const ADDIS_CENTER = { lat: 9.0192, lng: 38.7525, zoom: 12.5 } as const;
