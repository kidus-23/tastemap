"use client";

import type { PlaceRecord, PriceTier } from "@/lib/types";

export function priceLabel(tier: PriceTier) {
  return "$".repeat(tier);
}

export function currencyHint(tier: PriceTier) {
  return tier === 1 ? "under 150 birr" : tier === 2 ? "150–500 birr" : "500+ birr";
}

export function CuisineBadge({ cuisine }: { cuisine: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-pine-soft px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-pine">
      {cuisine}
    </span>
  );
}

export function PendingPill() {
  return (
    <span className="inline-flex items-center rounded-full bg-mustard-soft px-2 py-0.5 text-[11px] font-semibold text-mustard-deep">
      needs ranking
    </span>
  );
}

interface ListCardProps {
  place: PlaceRecord;
  rank: number | null; // null = want-to-try or pending
  topPick: boolean;
  active: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

export function ListCard({ place, rank, topPick, active, onHover, onSelect }: ListCardProps) {
  return (
    <button
      type="button"
      onMouseEnter={() => onHover(place.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(place.id)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(place.id)}
      aria-current={active || undefined}
      className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
        active
          ? "border-pine bg-pine-soft"
          : "border-transparent bg-card hover:border-line hover:bg-pine-soft/40"
      }`}
    >
      {rank !== null ? (
        <span
          className={`font-display w-10 shrink-0 text-3xl font-semibold tabular-nums ${
            topPick ? "text-pine" : "text-ink/45"
          }`}
        >
          {rank}
        </span>
      ) : (
        <span className="flex w-10 shrink-0 items-center justify-center">
          <span className="h-3 w-3 rounded-full bg-mustard" aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-semibold">{place.name}</span>
          {topPick && (
            <span className="rounded-sm bg-pine px-1.5 py-px text-[10px] font-bold tracking-widest text-white">
              TOP PICK
            </span>
          )}
          {place.status === "BEEN" && rank === null && <PendingPill />}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
          <CuisineBadge cuisine={place.cuisine} />
          <span className="font-medium text-mustard-deep">
            {priceLabel(place.priceTier)}
          </span>
          <span>
            {place.status === "BEEN"
              ? place.visitCount > 0
                ? `${place.visitCount} visit${place.visitCount === 1 ? "" : "s"}`
                : "first visit logged"
              : "want to try"}
          </span>
        </span>
      </span>
    </button>
  );
}
