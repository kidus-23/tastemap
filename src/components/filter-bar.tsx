"use client";

import { CUISINES, PRICE_TIERS, TAGS } from "@/lib/types";
import type { PlaceRecord, PlaceStatus } from "@/lib/types";

export interface Filters {
  q: string;
  cuisine: string | null;
  priceTier: number | null;
  status: "all" | PlaceStatus;
  tag: string | null;
}

export const emptyFilters: Filters = {
  q: "",
  cuisine: null,
  priceTier: null,
  status: "all",
  tag: null,
};

export function applyFilters(places: PlaceRecord[], f: Filters): PlaceRecord[] {
  const q = f.q.trim().toLowerCase();
  return places.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q)) return false;
    if (f.cuisine && p.cuisine !== f.cuisine) return false;
    if (f.priceTier && p.priceTier !== f.priceTier) return false;
    if (f.status !== "all" && p.status !== f.status) return false;
    if (f.tag && !p.tags.includes(f.tag)) return false;
    return true;
  });
}

interface FilterBarProps {
  filters: Filters;
  onChange: (f: Filters) => void;
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const dirty =
    filters.cuisine !== null ||
    filters.priceTier !== null ||
    filters.status !== "all" ||
    filters.tag !== null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by cuisine">
        {CUISINES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={filters.cuisine === c}
            onClick={() => onChange({ ...filters, cuisine: filters.cuisine === c ? null : c })}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              filters.cuisine === c
                ? "border-pine bg-pine text-white"
                : "border-line bg-card text-ink/80 hover:border-pine"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <div role="group" aria-label="Filter by price" className="flex gap-1.5">
          {PRICE_TIERS.map(({ tier, label }) => (
            <button
              key={tier}
              type="button"
              aria-pressed={filters.priceTier === tier}
              title={tier === 1 ? "under 150 birr" : tier === 2 ? "150–500 birr" : "500+ birr"}
              onClick={() =>
                onChange({ ...filters, priceTier: filters.priceTier === tier ? null : tier })
              }
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                filters.priceTier === tier
                  ? "border-mustard-deep bg-mustard text-white"
                  : "border-line bg-card text-ink/80 hover:border-mustard"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="tag-filter">
          Filter by tag
        </label>
        <select
          id="tag-filter"
          value={filters.tag ?? ""}
          onChange={(e) => onChange({ ...filters, tag: e.target.value || null })}
          className="rounded-full border border-line bg-card px-3 py-1 text-xs font-medium text-ink/80"
        >
          <option value="">Any tag</option>
          {TAGS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {dirty && (
          <button
            type="button"
            onClick={() => onChange({ ...filters, cuisine: null, priceTier: null, tag: null, status: "all" })}
            className="px-2 py-1 text-xs font-medium text-danger underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
