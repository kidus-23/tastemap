"use client";

import { headToHeadStats } from "@/lib/ranking";
import { CuisineBadge, priceLabel } from "./place-card";
import type { PlaceRecord } from "@/lib/types";

interface PlaceDetailProps {
  place: PlaceRecord;
  rank: number | null;
  comparisons: { winnerId: string; loserId: string }[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: (status: "BEEN" | "WANT_TO_TRY") => void;
  onBumpVisit: () => void;
  onRankNow?: () => void;
}

export function PlaceDetail({
  place,
  rank,
  comparisons,
  onClose,
  onEdit,
  onDelete,
  onToggleStatus,
  onBumpVisit,
  onRankNow,
}: PlaceDetailProps) {
  const { wins, losses } = headToHeadStats(place.id, comparisons);
  return (
    <div className="fixed inset-x-0 bottom-16 z-[1100] lg:inset-x-auto lg:right-4 lg:top-4 lg:bottom-4 lg:w-[380px]">
      <div className="max-h-[70vh] overflow-y-auto rounded-t-2xl border border-line bg-card p-5 shadow-2xl sm:max-h-full sm:rounded-2xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            {rank !== null ? (
              <p className="font-display text-sm font-semibold text-pine">rank #{rank}</p>
            ) : place.status === "BEEN" ? (
              <p className="text-sm font-semibold text-mustard-deep">needs ranking</p>
            ) : (
              <p className="text-sm font-semibold text-mustard-deep">want to try</p>
            )}
            <h2 className="font-display text-2xl font-semibold leading-tight">{place.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail"
            className="rounded-full px-2 py-1 text-xl text-muted hover:bg-paper"
          >
            ×
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <CuisineBadge cuisine={place.cuisine} />
          <span className="font-semibold text-mustard-deep" title={place.priceTier === 1 ? "under 150 birr" : place.priceTier === 2 ? "150–500 birr" : "500+ birr"}>
            {priceLabel(place.priceTier)}
          </span>
          <span className="text-muted">
            {place.visitCount} visit{place.visitCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {place.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-pine-soft px-2.5 py-0.5 text-[11px] font-semibold text-pine"
            >
              {t}
            </span>
          ))}
        </div>

        {place.note && <p className="mt-4 rounded-lg bg-paper p-3 text-sm leading-6">{place.note}</p>}

        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-pine-soft px-3 py-2">
            <p className="font-display text-2xl font-semibold text-pine">{wins}</p>
            <p className="text-xs text-muted">beat</p>
          </div>
          <div className="rounded-xl bg-mustard-soft px-3 py-2">
            <p className="font-display text-2xl font-semibold text-mustard-deep">{losses}</p>
            <p className="text-xs text-muted">lost to</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {place.status === "BEEN" && rank === null && onRankNow && (
            <button
              type="button"
              onClick={onRankNow}
              className="rounded-full bg-mustard px-4 py-2 text-sm font-semibold text-white hover:bg-mustard-deep"
            >
              Rank it now
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-pine-deep"
          >
            Edit
          </button>
          {place.status === "BEEN" && rank !== null && (
            <button
              type="button"
              onClick={onBumpVisit}
              className="rounded-full border border-pine bg-card px-4 py-2 text-sm font-semibold text-pine hover:bg-pine-soft"
            >
              + 1 visit
            </button>
          )}
          {place.status === "BEEN" ? (
            <button
              type="button"
              onClick={() => onToggleStatus("WANT_TO_TRY")}
              className="rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-ink/70 hover:border-mustard"
            >
              Move to want-to-try
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onToggleStatus("BEEN")}
              className="rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-ink/70 hover:border-pine"
            >
              I&apos;ve been here — rank it
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-danger hover:border-danger"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
