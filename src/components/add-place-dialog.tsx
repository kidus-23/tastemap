"use client";

import { useState } from "react";
import { CUISINES, TAGS } from "@/lib/types";
import type { PlaceRecord, PlaceStatus, PriceTier } from "@/lib/types";
import type { AddPlaceInput } from "@/lib/tm-store";

interface AddPlaceDialogProps {
  open: boolean;
  editing: PlaceRecord | null;
  onClose: () => void;
  onSubmit: (input: AddPlaceInput) => Promise<void>;
}

interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
  name: string;
}

export function AddPlaceDialog({ open, editing, onClose, onSubmit }: AddPlaceDialogProps) {
  const [name, setName] = useState(editing?.name ?? "");
  const [lat, setLat] = useState<string>(editing ? String(editing.lat) : "");
  const [lng, setLng] = useState<string>(editing ? String(editing.lng) : "");
  const [cuisine, setCuisine] = useState<string>(editing?.cuisine ?? "Ethiopian");
  const [priceTier, setPriceTier] = useState<PriceTier>(editing?.priceTier ?? 1);
  const [status, setStatus] = useState<PlaceStatus>(editing?.status ?? "BEEN");
  const [note, setNote] = useState(editing?.note ?? "");
  const [tags, setTags] = useState<string[]>(editing?.tags ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nominatim search
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  async function runSearch() {
    const q = search.trim();
    if (q.length < 3) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { results: GeocodeResult[] };
      setResults(data.results);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }

  function toggleTag(tag: string) {
    setTags((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!name.trim()) return setError("The place needs a name.");
    if (
      Number.isNaN(latNum) ||
      Number.isNaN(lngNum) ||
      latNum < -90 ||
      latNum > 90 ||
      lngNum < -180 ||
      lngNum > 180
    ) {
      return setError("Pick a location from search, or enter valid coordinates.");
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        lat: latNum,
        lng: lngNum,
        cuisine,
        priceTier,
        status,
        note,
        tags,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? `Edit ${editing.name}` : "Add a place"}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-6 shadow-2xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              {editing ? "Edit place" : "Add a place"}
            </h2>
            <p className="text-sm text-muted">
              {status === "BEEN"
                ? "You've eaten here — it will join the ranked list."
                : "On your want-to-try list — no comparisons needed yet."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full px-2 py-1 text-xl text-muted hover:bg-paper"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="block text-sm font-medium">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Yod Abyssinia"
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 font-normal"
            />
          </label>

          <div className="block text-sm font-medium">
            Location
            <div className="mt-1 flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void runSearch();
                  }
                }}
                placeholder="Search a place in Addis…"
                className="w-full rounded-lg border border-line bg-paper px-3 py-2 font-normal"
              />
              <button
                type="button"
                onClick={() => void runSearch()}
                className="whitespace-nowrap rounded-lg bg-pine-soft px-3 py-2 text-sm font-semibold text-pine hover:bg-pine hover:text-white"
              >
                {searching ? "…" : "Find"}
              </button>
            </div>
            {results.length > 0 && (
              <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-paper text-sm font-normal">
                {results.map((r, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => {
                        setLat(String(r.lat));
                        setLng(String(r.lng));
                        if (!name.trim()) setName(r.name);
                        setResults([]);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-pine-soft"
                    >
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {results.length === 0 && searched && !searching && (
              <p className="mt-1 text-xs text-muted">
                No results — enter coordinates manually below.
              </p>
            )}
            <div className="mt-2 flex gap-2 font-normal">
              <input
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                inputMode="decimal"
                placeholder="Latitude (9.02)"
                className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
              />
              <input
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                inputMode="decimal"
                placeholder="Longitude (38.75)"
                className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium">
              Cuisine
              <select
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 font-normal"
              >
                {CUISINES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <div className="text-sm font-medium">
              Price tier
              <div className="mt-1 flex gap-1.5">
                {[1, 2, 3].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPriceTier(t as PriceTier)}
                    aria-pressed={priceTier === t}
                    className={`flex-1 rounded-lg border px-2 py-2 font-serif ${
                      priceTier === t
                        ? "border-mustard-deep bg-mustard text-white"
                        : "border-line bg-paper hover:border-mustard"
                    }`}
                  >
                    {"$".repeat(t)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-sm font-medium">
            Status
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => setStatus("BEEN")}
                aria-pressed={status === "BEEN"}
                className={`flex-1 rounded-lg border px-3 py-2 ${
                  status === "BEEN"
                    ? "border-pine bg-pine text-white"
                    : "border-line bg-paper"
                }`}
              >
                I&apos;ve been
              </button>
              <button
                type="button"
                onClick={() => setStatus("WANT_TO_TRY")}
                aria-pressed={status === "WANT_TO_TRY"}
                className={`flex-1 rounded-lg border px-3 py-2 ${
                  status === "WANT_TO_TRY"
                    ? "border-mustard-deep bg-mustard text-white"
                    : "border-line bg-paper"
                }`}
              >
                Want to try
              </button>
            </div>
          </div>

          <div className="text-sm font-medium">
            Tags
            <div className="mt-1 flex flex-wrap gap-1.5">
              {TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  aria-pressed={tags.includes(t)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    tags.includes(t)
                      ? "border-pine bg-pine-soft font-semibold text-pine"
                      : "border-line bg-paper text-muted"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm font-medium">
            Note
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="What did you eat? What should you go back for?"
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 font-normal"
            />
          </label>

          {error && <p className="text-sm font-medium text-danger">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm font-semibold text-muted hover:bg-paper"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-pine px-5 py-2 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-60"
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Save place"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
