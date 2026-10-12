"use client";

import { headToHeadStats } from "@/lib/ranking";
import { BEU_RETRIEVED, beuFor, mapsDirectionsUrl } from "@/lib/beu";
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

        {(() => {
          const beu = beuFor(place.name);
          if (!beu) {
            return place.status === "WANT_TO_TRY" ? (
              <p className="mt-4 text-center text-xs text-muted">
                not on beU — add a note here when you visit
              </p>
            ) : null;
          }
          const maxHist = Math.max(...beu.place.histogram, 1);
          return (
            <div className="mt-4 rounded-xl border border-line bg-paper p-3">
              <p className="flex items-baseline gap-2 font-display text-sm font-semibold">
                On beU
                <span className="text-mustard-deep">
                  ★ {beu.place.ratingAvg.toFixed(1)}
                </span>
                <span className="text-xs font-normal text-muted">
                  {beu.place.ratingCount} {beu.place.ratingCount === 1 ? "order" : "orders"} rated
                </span>
              </p>
              {/* 5→1 histogram, tallest bar = most-awarded star */}
              <div className="mt-2 flex h-8 items-end gap-1" aria-label="beU rating spread">
                {beu.place.histogram.map((n, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                    <div
                      className="w-full rounded-t bg-pine/80"
                      style={{ height: `${Math.max((n / maxHist) * 100, n > 0 ? 8 : 0)}%` }}
                    />
                    <span className="text-[9px] text-muted">{5 - i}★</span>
                  </div>
                ))}
              </div>
              <ul className="mt-2 space-y-1.5">
                {beu.comments.map((c, i) => (
                  <li key={i} className="rounded-lg bg-card px-2.5 py-2 text-[12px] leading-5">
                    <span className="font-semibold text-mustard-deep">{c.rating}★</span>{" "}
                    “{c.text}”
                    <span className="text-muted">
                      {" "}
                      — {c.name}
                      {c.food ? `, on ${c.food}` : ""} ({c.date})
                    </span>
                  </li>
                ))}
              </ul>
              <a
                href={mapsDirectionsUrl(beu.place.name, beu.place.address)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block rounded-full bg-pine px-4 py-2 text-center text-sm font-semibold text-white hover:bg-pine-deep"
              >
                🧭 Directions
              </a>
              <p className="mt-1.5 text-center text-[10px] text-muted">
                beU snapshot · {BEU_RETRIEVED} · reviewer names shortened, contacts removed
              </p>
            </div>
          );
        })()}

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
