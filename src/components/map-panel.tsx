"use client";

// Interactive clustered OpenStreetMap map — plain Leaflet (no API key),
// rebuilt markers on data change, keyboard-activatable pins.

import { useEffect, useRef, useState } from "react";
import type * as LeafletNS from "leaflet";
import { ADDIS_CENTER } from "@/lib/types";
import type { PlaceRecord } from "@/lib/types";

interface MapPanelProps {
  places: PlaceRecord[];
  /** derived rank (1-based) per been place id, from the head-to-head order */
  ranks: Record<string, number>;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
}

export default function MapPanel({ places, ranks, selectedId, hoveredId, onSelect }: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<{
    map: LeafletNS.Map;
    cluster: LeafletNS.MarkerClusterGroup;
  } | null>(null);
  const onSelectRef = useRef(onSelect);
  // flips after the first render, when containerRef.current is actually attached
  const [attachEpoch, setAttachEpoch] = useState(0);
  const [mapReady, setMapReady] = useState(false);
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
    })();
  }, [places, ranks, mapReady]);

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

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="application"
      aria-label="Map of your places in Addis Ababa"
    />
  );
}
