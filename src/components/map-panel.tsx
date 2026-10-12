"use client";

// Interactive clustered OpenStreetMap map — plain Leaflet (no API key),
// rebuilt markers on data change, keyboard-activatable pins.
//
// beU layer: optional overlay of the top beU delivery venues (green 🍽 pins),
// each opening a compact pop-out card — star average + one attributed quote +
// Directions (Google Maps, POI-resolving destination). A second tap expands
// the card in place to the rating histogram + up to 3 quotes.

import { useCallback, useEffect, useRef, useState } from "react";
import type * as LeafletNS from "leaflet";
import { ADDIS_CENTER } from "@/lib/types";
import type { PlaceRecord } from "@/lib/types";
import { BEU_FAVORITES, BEU_RETRIEVED, beuNameSimilarity, mapsDirectionsUrl } from "@/lib/beu";
import type { BeuPlace } from "@/lib/beu";

interface MapPanelProps {
  places: PlaceRecord[];
  /** derived rank (1-based) per been place id, from the head-to-head order */
  ranks: Record<string, number>;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  /** when true, add the beU favorites pin layer */
  beuLayer?: boolean;
}

export default function MapPanel({
  places,
  ranks,
  selectedId,
  hoveredId,
  onSelect,
  beuLayer = false,
}: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<{
    map: LeafletNS.Map;
    cluster: LeafletNS.MarkerClusterGroup;
  } | null>(null);
  const onSelectRef = useRef(onSelect);
  // flips after the first render, when containerRef.current is actually attached
  const [attachEpoch, setAttachEpoch] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  // the open beU pop-out card (and its expanded state), anchored to its pin
  const [beuCard, setBeuCard] = useState<{ place: BeuPlace; expanded: boolean } | null>(null);
  const [beuCardPos, setBeuCardPos] = useState({ x: 0, y: 0 });
  // pin position of the open card, kept out of state (never re-renders on pan)
  const beuCardAnchorRef = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAttachEpoch(1));
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // live highlight targets, readable from the (async) rebuild effect
  const highlightRef = useRef<{ selected: string | null; hovered: string | null }>({
    selected: null,
    hovered: null,
  });
  useEffect(() => {
    highlightRef.current = { selected: selectedId, hovered: hoveredId };
  }, [selectedId, hoveredId]);

  // open the card for a beU venue: set content + anchor to the pin's point.
  // Stable callback (refs + setState only) so marker closures can hold it.
  const openBeuCard = useCallback((place: BeuPlace) => {
    const map = leafletRef.current?.map;
    const anchor = { lat: place.lat, lng: place.lng };
    beuCardAnchorRef.current = anchor;
    setBeuCard({ place, expanded: false });
    setBeuCardPos(cardPoint(map, anchor));
  }, []);

  // create the map once — but only once the panel is actually laid out.
  // The dashboard renders a full-screen "initializing…" state first; if
  // Leaflet boots against the 0-height hidden panel its whole tile lattice
  // is built collapsed (0-size tiles, dead zoom origin) and never recovers.
  useEffect(() => {
    if (attachEpoch === 0) return;
    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet.markercluster");
      const el = containerRef.current;
      if (cancelled || !el || leafletRef.current) return;

      // block until layout gives the container real dimensions
      await new Promise<void>((resolve) => {
        const check = () => {
          if (cancelled) return resolve();
          const r = el.getBoundingClientRect();
          if (r.width > 10 && r.height > 10) return resolve();
          requestAnimationFrame(check);
        };
        check();
      });
      if (cancelled || containerRef.current !== el) return;

      const map = L.map(el, {
        center: [ADDIS_CENTER.lat, ADDIS_CENTER.lng],
        zoom: ADDIS_CENTER.zoom,
        zoomControl: true,
        scrollWheelZoom: "center",
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      const cluster = L.markerClusterGroup({
        maxClusterRadius: 42,
        showCoverageOnHover: false,
        disableClusteringAtZoom: 16,
      });
      map.addLayer(cluster);
      // an open pop-out card drifts off its pin as the user pans the map —
      // re-anchor live so the card keeps pointing at its venue
      map.on("move zoom", () => {
        const anchor = beuCardAnchorRef.current;
        if (anchor) setBeuCardPos(cardPoint(map, anchor));
      });
      // a tap on empty map (not a pin) closes any open card
      map.on("click", () => setBeuCard(null));
      leafletRef.current = { map, cluster };
      // let the rebuild effect know the map exists — it may have already
      // run to completion against the null ref (mount race) and must re-run
      setMapReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [attachEpoch]);

  // keep the canvas in sync when the container appears/resizes
  // (hidden-on-load phone map tab needs invalidateSize once shown)
  useEffect(() => {
    const el = containerRef.current;
    if (attachEpoch === 0 || !el) return;
    const observer = new ResizeObserver(() => {
      leafletRef.current?.map.invalidateSize();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [attachEpoch]);

  // rebuild markers whenever the data changes (or once the map exists)
  useEffect(() => {
    const leaflet = leafletRef.current;
    if (!leaflet || !mapReady) return;
    const { cluster } = leaflet;
    void (async () => {
      const L = (await import("leaflet")).default;
      cluster.clearLayers();

      for (const place of places) {
        const been = place.status === "BEEN";
        const rank = been ? String(ranks[place.id] ?? "?") : "★";
        const active = place.id === highlightRef.current.selected || place.id === highlightRef.current.hovered;
        const icon = L.divIcon({
          className: "",
          iconSize: [30, 30],
          html: `<div class="tm-pin ${been ? "tm-pin-been" : "tm-pin-want"}${
            active ? " tm-pin-active" : ""
          }" tabindex="0" role="button" aria-label="${
            been ? `rank ${rank}, ${place.name}` : `want to try, ${place.name}`
          }"><span class="tm-pin-inner">${rank}</span></div>`,
        });
        const marker = L.marker([place.lat, place.lng], {
          icon,
          title: place.name,
          alt: `${place.name} — show detail`,
          riseOnHover: true,
        });
        marker.on("click", () => onSelectRef.current(place.id));
        marker.on("keydown", (e: LeafletNS.LeafletKeyboardEvent) => {
          if (e.originalEvent.key === "Enter" || e.originalEvent.key === " ") {
            e.originalEvent.preventDefault();
            onSelectRef.current(place.id);
          }
        });
        (marker as LeafletNS.Marker & { placeId: string }).placeId = place.id;
        cluster.addLayer(marker);
      }

      if (beuLayer) {
        for (const beu of BEU_FAVORITES) {
          // favorites use a dashed 🍽 pin; clicking opens the pop-out card
          const icon = L.divIcon({
            className: "",
            iconSize: [28, 28],
            html: `<div class="tm-pin tm-pin-beu" tabindex="0" role="button" aria-label="on beU, ${beu.name}"><span class="tm-pin-inner">🍽</span></div>`,
          });
          const marker = L.marker([beu.lat, beu.lng], {
            icon,
            title: `${beu.name} · beU ${beu.ratingAvg}★`,
            alt: `${beu.name} — beU card`,
            riseOnHover: true,
          });
          marker.on("click", () => openBeuCard(beu));
          marker.on("keydown", (e: LeafletNS.LeafletKeyboardEvent) => {
            if (e.originalEvent.key === "Enter" || e.originalEvent.key === " ") {
              e.originalEvent.preventDefault();
              openBeuCard(beu);
            }
          });
          (marker as LeafletNS.Marker & { beuId: number }).beuId = beu.beuId;
          cluster.addLayer(marker);
        }
      }
    })();
  }, [places, ranks, mapReady, beuLayer, openBeuCard]);

  // selection / hover highlight + pan
  useEffect(() => {
    const leaflet = leafletRef.current;
    if (!leaflet) return;
    const { cluster } = leaflet;
    const targetId = hoveredId ?? selectedId;
    cluster.eachLayer((layer) => {
      const marker = layer as LeafletNS.Marker & { placeId?: string };
      const inner = marker.getElement()?.querySelector(".tm-pin");
      inner?.classList.toggle("tm-pin-active", marker.placeId === targetId);
    });
    if (selectedId) {
      const place = places.find((p) => p.id === selectedId);
      if (place) {
        leaflet.map.flyTo([place.lat, place.lng], Math.max(leaflet.map.getZoom(), 13.5), {
          duration: 0.6,
        });
      }
    }
  }, [selectedId, hoveredId, places]);

  // the open card also closes on Escape, like the detail sheet
  useEffect(() => {
    if (!beuCard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBeuCard(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [beuCard]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="application"
      aria-label="Map of your places in Addis Ababa"
    >
      {beuCard && (
        <BeuPinCard
          place={beuCard.place}
          expanded={beuCard.expanded}
          userPlaces={places}
          pos={beuCardPos}
          onExpand={() => setBeuCard((c) => (c ? { ...c, expanded: true } : c))}
          onClose={() => setBeuCard(null)}
          onOpenPlace={(id) => {
            setBeuCard(null);
            onSelectRef.current(id);
          }}
        />
      )}
    </div>
  );
}

/**
 * container-space point for the card anchor; kept as a tiny helper so the
 * two call sites (open + pan) stay in sync on the clamping decision.
 */
function cardPoint(map: LeafletNS.Map | undefined, anchor: { lat: number; lng: number }) {
  const p = map?.latLngToContainerPoint([anchor.lat, anchor.lng]);
  return p ? { x: p.x, y: p.y } : { x: 0, y: 0 };
}

// ---- the pop-out card ------------------------------------------------------

function BeuPinCard({
  place,
  expanded,
  userPlaces,
  pos,
  onExpand,
  onClose,
  onOpenPlace,
}: {
  place: BeuPlace;
  expanded: boolean;
  userPlaces: PlaceRecord[];
  pos: { x: number; y: number };
  onExpand: () => void;
  onClose: () => void;
  onOpenPlace: (id: string) => void;
}) {
  const stars = "★★★★★☆☆☆☆☆".slice(5 - Math.round(place.ratingAvg), 10 - Math.round(place.ratingAvg));
  const maxHist = Math.max(...place.histogram, 1);
  // the card only links into the detail sheet when this venue is genuinely
  // one of the user's ranked places — favorites-only venues end here
  const userPlace = userPlaces.find((p) => beuNameSimilarity(p.name, place.name) >= 0.6);

  const cardRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    // the card floats inside the Leaflet container — without this, taps on
    // the card bubble to the map div and map.on("click") closes the card
    void import("leaflet").then((L) => {
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
    });
  }, []);

  return (
    <div
      ref={cardRef}
      className={`beu-card ${expanded ? "beu-card--wide" : ""} rounded-2xl border border-line bg-card text-ink shadow-2xl`}
      style={{ left: pos.x - 24, top: pos.y + 26 }}
      role="dialog"
      aria-label={`${place.name} on beU`}
    >
      <div className="flex items-start gap-2 px-3 pt-3">
        <div className="flex-1">
          <p className="flex items-baseline gap-1.5 font-display text-sm font-semibold leading-tight">
            {place.name}
            <span className="rounded-full bg-pine px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white">
              beU
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {stars} {place.ratingAvg.toFixed(1)} · {place.ratingCount}{" "}
            {place.ratingCount === 1 ? "order" : "orders"} rated
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close beU card"
          className="-mr-1 rounded-full px-1.5 text-muted hover:bg-paper"
        >
          ×
        </button>
      </div>

      {place.comments.length > 0 ? (
        <p className="mx-3 mt-2 rounded-lg bg-paper px-2.5 py-2 text-[11.5px] leading-5">
          “{place.comments[0].text}”
          <span className="text-muted"> — {place.comments[0].name}, {place.comments[0].rating}★</span>
        </p>
      ) : (
        <p className="mx-3 mt-2 rounded-lg bg-paper px-2.5 py-2 text-[11.5px] text-muted">
          No written beU reviews yet — {place.ratingCount} rating{place.ratingCount === 1 ? "" : "s"} only.
        </p>
      )}

      {expanded && (
        <div className="px-3 pt-2">
          {/* 5→1 histogram, tallest bar = most-awarded star */}
          <div className="flex h-9 items-end gap-1.5" aria-label="beU rating spread">
            {place.histogram.map((n, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-t bg-pine/80"
                  style={{ height: `${Math.max((n / maxHist) * 100, n > 0 ? 6 : 0)}%` }}
                />
                <span className="text-[9px] text-muted">{5 - i}★</span>
              </div>
            ))}
          </div>
          {place.comments.slice(1, 3).map((c, i) => (
            <p key={i} className="mt-1.5 rounded-lg bg-paper px-2.5 py-2 text-[11.5px] leading-5">
              “{c.text}”
              <span className="text-muted"> — {c.name}, {c.rating}★</span>
            </p>
          ))}
          {userPlace ? (
            <button
              type="button"
              onClick={() => onOpenPlace(userPlace.id)}
              className="mt-2 w-full rounded-full border border-pine bg-card px-3 py-1.5 text-xs font-semibold text-pine hover:bg-pine-soft"
            >
              📖 Full details
            </button>
          ) : (
            <p className="mt-2 text-center text-[10px] text-muted">
              from the beU snapshot · {BEU_RETRIEVED}
            </p>
          )}
        </div>
      )}

      <div className="mt-2.5 flex border-t border-line text-xs font-semibold">
        <a
          href={mapsDirectionsUrl(place.name, place.address)}
          target="_blank"
          rel="noreferrer"
          className="flex-1 rounded-bl-2xl px-3 py-2.5 text-center text-pine hover:bg-pine-soft"
        >
          🧭 Directions
        </a>
        {!expanded && (
          <button
            type="button"
            onClick={onExpand}
            className="flex-1 rounded-br-2xl border-l border-line px-3 py-2.5 text-center text-muted hover:bg-paper"
          >
            ⌄ More
          </button>
        )}
      </div>
    </div>
  );
}
