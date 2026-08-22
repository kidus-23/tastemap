"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTm, beenList } from "@/lib/tm-store";
import type { AddPlaceInput } from "@/lib/tm-store";
import { TopBar } from "./top-bar";
import { FilterBar, applyFilters, emptyFilters } from "./filter-bar";
import type { Filters } from "./filter-bar";
import { PlaceList } from "./place-list";
import { PlaceDetail } from "./place-detail";
import { AddPlaceDialog } from "./add-place-dialog";
import { CompareFlow } from "./compare-flow";

const MapPanel = dynamic(() => import("./map-panel"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-pine-soft text-sm text-muted">
      Loading the map…
    </div>
  ),
});

export function Dashboard() {
  const tm = useTm();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [surpriseId, setSurpriseId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    void tm.init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => applyFilters(tm.places, filters), [tm.places, filters]);
  const ranked = useMemo(
    () => beenList({ places: tm.places, comparisons: tm.comparisons }),
    [tm.places, tm.comparisons]
  );
  // display rank = index in the derived head-to-head order (1-based) —
  // stored `position` only ever updates for the settled place, so it lags
  const rankById = useMemo(() => {
    const m: Record<string, number> = {};
    ranked.forEach((p, i) => (m[p.id] = i + 1));
    return m;
  }, [ranked]);
  const selected = tm.places.find((p) => p.id === tm.selectedId) ?? null;

  async function handleAdd(input: AddPlaceInput) {
    if (editing) {
      await tm.update(editing, input);
      setEditing(null);
    } else {
      await tm.add(input);
      setMobileView("map");
    }
  }

  function surprise() {
    const pool = filtered.filter((p) => p.id !== tm.selectedId);
    if (pool.length === 0) return;
    setSpinning(true);
    let ticks = 0;
    const shuffle = setInterval(() => {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setSurpriseId(pick.id);
      if (++ticks >= 7) {
        clearInterval(shuffle);
        setSpinning(false);
        tm.select(pick.id);
      }
    }, 110);
  }
  const surprisePlace = tm.places.find((p) => p.id === surpriseId) ?? null;

  if (tm.initializing) {
    return (
      <div className="flex flex-1 items-center justify-center bg-paper">
        <p className="font-display animate-pulse text-2xl text-pine">Tastemap…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar
        mode={tm.mode}
        user={tm.user}
        query={filters.q}
        onQuery={(q) => setFilters({ ...filters, q })}
        onAdd={() => setAddOpen(true)}
        onGuest={() => void tm.switchToGuest()}
        onLogout={async () => {
          await fetch("/api/auth/me", { method: "POST" });
          await tm.switchToGuest();
        }}
      />

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(380px,420px)_1fr]">
        {/* left panel */}
        <section
          aria-label="Your ranked list"
          className={`${mobileView === "list" ? "flex" : "hidden"} min-h-0 flex-col gap-3 border-r border-line bg-card/60 p-4 lg:flex`}
        >
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="font-display text-3xl font-semibold leading-tight">
                Your top tables
              </h1>
              <p className="text-sm text-muted">
                Addis Ababa · {tm.places.length} places · {ranked.length} ranked
              </p>
            </div>
            <button
              type="button"
              onClick={surprise}
              disabled={filtered.length === 0}
              title='Pick from “where should we eat?” — surprise me'
              className="rounded-full border border-mustard-deep bg-mustard-soft px-3.5 py-2 text-sm font-semibold text-mustard-deep hover:bg-mustard hover:text-white disabled:opacity-40"
            >
              🎯 Surprise me
            </button>
          </div>

          <FilterBar filters={filters} onChange={setFilters} />

          {surprisePlace && !spinning && (
            <div className="tm-shuffle rounded-xl border border-mustard bg-mustard-soft px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-mustard-deep">
                Tonight? — picked from your filtered {filtered.length} place
                {filtered.length === 1 ? "" : "s"}
              </p>
              <button
                type="button"
                onClick={() => tm.select(surprisePlace.id)}
                className="font-display mt-0.5 text-lg font-semibold hover:underline"
              >
                {surprisePlace.name}
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1">
            <PlaceList
              places={filtered}
              comparisons={tm.comparisons}
              selectedId={tm.selectedId}
              onSelect={(id) => tm.select(id)}
              onHover={setHoveredId}
            />
          </div>
        </section>

        {/* map */}
        <section
          aria-label="Map"
          className={`${mobileView === "map" ? "block" : "hidden"} relative min-h-[50vh] lg:block lg:min-h-0`}
        >
          <MapPanel
            places={filtered}
            ranks={rankById}
            selectedId={tm.selectedId}
            hoveredId={hoveredId}
            onSelect={(id) => tm.select(id)}
          />
          <div className="pointer-events-none absolute right-3 top-3 z-[500] hidden rounded-xl border border-line bg-card/95 px-3 py-2 text-xs shadow lg:block">
            <p className="flex items-center gap-1.5 font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-pine" /> been · numbered by rank
            </p>
            <p className="mt-1 flex items-center gap-1.5 font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-mustard" /> want to try
            </p>
          </div>
        </section>
      </div>

      {/* mobile view toggle */}
      <div className="sticky bottom-3 z-30 flex justify-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileView("list")}
          aria-pressed={mobileView === "list"}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg ${
            mobileView === "list" ? "bg-pine text-white" : "bg-card text-ink"
          }`}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => setMobileView("map")}
          aria-pressed={mobileView === "map"}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg ${
            mobileView === "map" ? "bg-pine text-white" : "bg-card text-ink"
          }`}
        >
          Map
        </button>
      </div>

      {/* detail sheet */}
      {selected && (
        <PlaceDetail
          place={selected}
          rank={selected.status === "BEEN" ? rankById[selected.id] ?? null : null}
          comparisons={tm.comparisons}
          onClose={() => tm.select(null)}
          onEdit={() => {
            setEditing(selected.id);
            setAddOpen(true);
          }}
          onRankNow={() => void tm.startFlow(selected.id)}
          onDelete={async () => {
            await tm.remove(selected.id);
          }}
          onToggleStatus={(status) => void tm.update(selected.id, { status })}
          onBumpVisit={() => void tm.bumpVisit(selected.id)}
        />
      )}

      {/* add / edit dialog — remounts per target so the form is never stale */}
      <AddPlaceDialog
        key={`${editing ?? "new"}:${String(addOpen)}`}
        open={addOpen}
        editing={editing ? tm.places.find((p) => p.id === editing) ?? null : null}
        onClose={() => {
          setAddOpen(false);
          setEditing(null);
        }}
        onSubmit={handleAdd}
      />

      {/* comparison flow */}
      <CompareFlow
        state={tm.flowState}
        pending={tm.flowPlaceId ? tm.places.find((p) => p.id === tm.flowPlaceId) ?? null : null}
        onAnswer={(won) => tm.answer(won)}
        onClose={() => tm.clearFlow()}
      />
    </div>
  );
}
