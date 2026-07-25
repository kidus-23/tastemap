"use client";

import { ListCard, priceLabel } from "./place-card";
import { emptyFilters, type Filters } from "./filter-bar";
import { useState } from "react";
import { deriveRankedOrder } from "@/lib/ranking";
import type { PlaceRecord } from "@/lib/types";

interface PlaceListProps {
  places: PlaceRecord[]; // already filtered
  comparisons: { winnerId: string; loserId: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

export function PlaceList({
  places,
  comparisons,
  selectedId,
  onSelect,
  onHover,
}: PlaceListProps) {
  const [tab, setTab] = useState<"ranked" | "want">("ranked");

  const been = places.filter((p) => p.status === "BEEN");
  const want = places.filter((p) => p.status === "WANT_TO_TRY");
  const ranked = deriveRankedOrder(been.filter((p) => p.position !== null), comparisons);
  const pending = been.filter((p) => p.position === null);
  want.sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));

  const rows =
    tab === "ranked"
      ? [
          // the rank is the derived head-to-head order, never the stored
          // position — a freshly settled place shifts everything after it
          ...ranked.map((p, i) => ({
            place: p,
            rank: i + 1,
            topPick: i === 0,
          })),
          ...pending.map((p) => ({ place: p, rank: null, topPick: false })),
        ]
      : want.map((p) => ({ place: p, rank: null, topPick: false }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        role="tablist"
        aria-label="List mode"
        className="flex gap-1 rounded-full bg-paper p-1"
      >
        <button
          role="tab"
          aria-selected={tab === "ranked"}
          onClick={() => setTab("ranked")}
          className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
            tab === "ranked" ? "bg-pine text-white" : "text-ink/70 hover:bg-pine-soft"
          }`}
        >
          Ranked ({ranked.length})
          {pending.length > 0 && (
            <span className="ml-1 text-[10px] font-bold text-mustard-deep">+{pending.length}</span>
          )}
        </button>
        <button
          role="tab"
          aria-selected={tab === "want"}
          onClick={() => setTab("want")}
          className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
            tab === "want" ? "bg-mustard text-white" : "text-ink/70 hover:bg-pine-soft"
          }`}
        >
          Want to try ({want.length})
        </button>
      </div>

      <div
        role="tabpanel"
        className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1"
      >
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-paper px-4 py-8 text-center text-sm text-muted">
            {tab === "ranked"
              ? "No been places here yet — add one and it earns its rank by comparison."
              : "Nothing on the want-to-try list under these filters."}
          </p>
        ) : (
          rows.map(({ place, rank, topPick }) => (
            <ListCard
              key={place.id}
              place={place}
              rank={rank}
              topPick={topPick}
              active={selectedId === place.id}
              onHover={onHover}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}

export type { Filters };
export { emptyFilters, priceLabel };
