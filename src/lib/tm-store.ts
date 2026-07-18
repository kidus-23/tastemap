// The single source of UI truth. One store, two backends:
//  - guest mode: everything computed locally (ranking.ts), persisted to
//    localStorage, seeded with the Addis Ababa dataset; the DB is never
//    touched.
//  - account mode: the same operations are executed server-side; this
//    store mirrors the server responses.

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ADDIS_COMPARISONS, ADDIS_PLACES } from "@/data/addis-seed";
import {
  deriveRankedOrder,
  nextComparison,
  settleSlot,
  headToHeadStats,
  expectedQuestionCount,
} from "./ranking";
import type {
  ComparisonRecord,
  PlaceRecord,
  PlaceStatus,
  PriceTier,
  Snapshot,
} from "./types";

export interface AddPlaceInput {
  name: string;
  lat: number;
  lng: number;
  cuisine: string;
  priceTier: PriceTier;
  status: PlaceStatus;
  note: string;
  tags: string[];
  visitCount?: number;
}

export type CompareState =
  | {
      kind: "question";
      placeId: string;
      opponent: Pick<PlaceRecord, "id" | "name" | "cuisine" | "priceTier" | "note" | "tags">;
      answerCount: number;
      expectedCount: number;
    }
  | {
      kind: "settled";
      placeId: string;
      position: number;
      totalRanked?: number;
      answerCount: number;
      expectedCount: number;
    };

let placeSeq = 0;
function guestId() {
  return `g_${Date.now().toString(36)}_${placeSeq++}`;
}

function guestCopy(): Snapshot {
  return {
    places: structuredClone(ADDIS_PLACES),
    comparisons: structuredClone(ADDIS_COMPARISONS),
  };
}

interface TmStore {
  mode: "loading" | "guest" | "account";
  user: { id: string; name: string; email: string } | null;
  places: PlaceRecord[];
  comparisons: ComparisonRecord[];
  selectedId: string | null;
  flowPlaceId: string | null;
  flowState: CompareState | null;
  initializing: boolean;

  init: () => Promise<void>;
  switchToGuest: () => Promise<void>;
  select: (id: string | null) => void;
  startFlow: (placeId: string) => Promise<void>;
  clearFlow: () => void;
  add: (input: AddPlaceInput) => Promise<string>;
  update: (id: string, input: Partial<AddPlaceInput> & { visitCount?: number }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  answer: (pendingWon: boolean) => Promise<"question" | "settled">;
  bumpVisit: (id: string) => Promise<void>;
}

export const useTm = create<TmStore>()(
  persist(
    (set, get) => ({
      mode: "loading",
      user: null,
      places: [],
      comparisons: [],
      selectedId: null,
      flowPlaceId: null,
      flowState: null,
      initializing: true,

      async init() {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await res.json()) as { user?: { id: string; name: string; email: string } | null };
        if (data.user) {
          const snap = await fetch("/api/places", { cache: "no-store" });
          const snapshot = (await snap.json()) as Snapshot;
          set({
            mode: "account",
            user: data.user,
            places: snapshot.places,
            comparisons: snapshot.comparisons,
            initializing: false,
          });
          // resume any interrupted ranking flow
          const pending = snapshot.places.find(
            (p) => p.status === "BEEN" && p.position === null
          );
          if (pending) void get().startFlow(pending.id);
          return;
        }
        // guest: persisted places (already in localStorage) or fresh seed
        const persisted = (get() as { places?: PlaceRecord[] }).places ?? [];
        if (persisted.length === 0) {
          const seed = guestCopy();
          set({ places: seed.places, comparisons: seed.comparisons });
        }
        set({ mode: "guest", user: null, initializing: false });
        // resume any interrupted ranking flow
        const pending = get().places.find((p) => p.status === "BEEN" && p.position === null);
        if (pending) void get().startFlow(pending.id);
      },

      async switchToGuest() {
        const seed = guestCopy();
        set({
          mode: "guest",
          user: null,
          places: seed.places,
          comparisons: seed.comparisons,
          selectedId: null,
          flowPlaceId: null,
          flowState: null,
        });
      },

      select(id) {
        set({ selectedId: id });
      },

      async startFlow(placeId) {
        if (get().mode === "account") {
          const res = await fetch(`/api/compare?placeId=${placeId}`, { cache: "no-store" });
          const data = (await res.json()) as { state: CompareState };
          set({ flowPlaceId: placeId, flowState: data.state });
          return;
        }
        const { places, comparisons } = get();
        const pending = places.find((p) => p.id === placeId);
        if (!pending) return;
        const others = deriveRankedOrder(
          places.filter((p) => p.status === "BEEN" && p.id !== placeId),
          comparisons
        );
        const next = nextComparison(pending, others, comparisons);
        if (next) {
          const opp = others.find((p) => p.id === next.opponentId)!;
          set({
            flowPlaceId: placeId,
            flowState: {
              kind: "question",
              placeId,
              opponent: opp,
              answerCount: comparisons.filter(
                (c) => c.winnerId === placeId || c.loserId === placeId
              ).length,
              expectedCount: expectedQuestionCount(others.length),
            },
          });
        } else {
          const slot = settleSlot(pending, others, comparisons);
          set({
            places: places.map((p) => (p.id === placeId ? { ...p, position: slot + 1 } : p)),
            flowState: {
              kind: "settled",
              placeId,
              position: slot + 1,
              totalRanked: others.length + 1,
              answerCount: comparisons.filter(
                (c) => c.winnerId === placeId || c.loserId === placeId
              ).length,
              expectedCount: expectedQuestionCount(others.length),
            },
          });
        }
      },

      clearFlow() {
        set({ flowPlaceId: null, flowState: null });
      },

      async add(input) {
        if (get().mode === "account") {
          const res = await fetch("/api/places", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          if (!res.ok) {
            const e = (await res.json()) as { error?: string };
            throw new Error(e.error ?? "Could not save the place.");
          }
          const { place } = (await res.json()) as { place: PlaceRecord };
          set({ places: [...get().places, place] });
          const others = get().places.filter(
            (p) => p.status === "BEEN" && p.id !== place.id
          );
          if (place.status === "BEEN" && place.position === null && others.length > 0) {
            get().clearFlow();
            void get().startFlow(place.id);
          }
          return place.id;
        }
        const id = guestId();
        const otherBeen = get().places.filter((p) => p.status === "BEEN");
        const place: PlaceRecord = {
          id,
          name: input.name,
          lat: input.lat,
          lng: input.lng,
          cuisine: input.cuisine,
          priceTier: input.priceTier,
          status: input.status,
          note: input.note,
          tags: input.tags,
          visitCount: input.visitCount ?? 0,
          position: input.status === "BEEN" && otherBeen.length === 0 ? 1 : null,
          addedAt: new Date().toISOString(),
        };
        set({ places: [...get().places, place] });
        if (place.status === "BEEN" && place.position === null) {
          get().clearFlow();
          void get().startFlow(place.id);
        }
        return id;
      },

      async update(id, input) {
        if (get().mode === "account") {
          const res = await fetch(`/api/places/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          if (!res.ok) throw new Error("Could not save changes.");
          const { place } = (await res.json()) as { place: PlaceRecord };
          set({
            places: get().places.map((p) => (p.id === id ? place : p)),
          });
          if (place.status === "BEEN" && place.position === null) {
            void get().startFlow(place.id);
          }
          return;
        }
        set({
          places: get().places.map((p) => {
            if (p.id !== id) return p;
            const nextStatus = (input.status ?? p.status) as PlaceStatus;
            let position = p.position;
            if (nextStatus === "BEEN" && p.status === "WANT_TO_TRY") {
              const others = get().places.filter(
                (x) => x.status === "BEEN" && x.id !== id
              );
              position = others.length === 0 ? 1 : null;
            } else if (nextStatus === "WANT_TO_TRY") {
              position = null;
            }
            return {
              ...p,
              ...input,
              status: nextStatus,
              position,
              visitCount: input.visitCount ?? p.visitCount,
            };
          }),
        });
        const updated = get().places.find((p) => p.id === id);
        if (updated?.status === "BEEN" && updated?.position === null) {
          void get().startFlow(id);
        }
      },

      async remove(id) {
        if (get().mode === "account") {
          await fetch(`/api/places/${id}`, { method: "DELETE" });
        }
        set({
          places: get().places.filter((p) => p.id !== id),
          comparisons: get().comparisons.filter(
            (c) => c.winnerId !== id && c.loserId !== id
          ),
          selectedId: get().selectedId === id ? null : get().selectedId,
        });
      },

      async answer(pendingWon) {
        const flowPlaceId = get().flowPlaceId;
        const flowState = get().flowState;
        const opponent = flowState?.kind === "question" ? flowState.opponent : null;
        if (!flowPlaceId || !opponent) return "settled";

        if (get().mode === "account") {
          const res = await fetch("/api/compare", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              placeId: flowPlaceId,
              opponentId: opponent.id,
              pendingWon,
            }),
          });
          const data = (await res.json()) as { state: CompareState };
          const snapshot = await fetch("/api/places", { cache: "no-store" });
          const s = (await snapshot.json()) as Snapshot;
          // NOTE: keep flowPlaceId when settled — the dialog must stay open
          // to announce the final rank; clearFlow() (its close button) ends it.
          set({ places: s.places, comparisons: s.comparisons, flowState: data.state });
          return data.state.kind;
        }

        // guest mode — record and recompute locally
        const newComparison: ComparisonRecord = pendingWon
          ? { winnerId: flowPlaceId, loserId: opponent.id }
          : { winnerId: opponent.id, loserId: flowPlaceId };
        const comparisons = [...get().comparisons, newComparison];
        set({ comparisons });
        // startFlow updates flowState (settling it if no question remains);
        // flowPlaceId intentionally stays so the announcement renders.
        await get().startFlow(flowPlaceId);
        return get().flowState?.kind ?? "settled";
      },

      async bumpVisit(id) {
        const place = get().places.find((p) => p.id === id);
        if (!place) return;
        await get().update(id, { visitCount: place.visitCount + 1 });
      },
    }),
    {
      name: "tastemap-guest-v1",
      partialize: (state) => ({
        // only guest data is persisted — account data always comes from the DB
        ...(state.mode === "guest"
          ? { mode: "guest", places: state.places, comparisons: state.comparisons }
          : {}),
      }),
    }
  )
);

// ---- derived helpers -------------------------------------------------------

export function beenList(state: { places: PlaceRecord[]; comparisons: ComparisonRecord[] }) {
  const been = state.places.filter((p) => p.status === "BEEN");
  const settled = deriveRankedOrder(
    been.filter((p) => p.position !== null),
    state.comparisons
  );
  return settled; // pending ones surface separately in the UI
}

export function pendingBeen(state: { places: PlaceRecord[] }) {
  return state.places.filter((p) => p.status === "BEEN" && p.position === null);
}

export function wantList(state: { places: PlaceRecord[] }) {
  return state.places
    .filter((p) => p.status === "WANT_TO_TRY")
    .sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1)); // newest first
}

export function statsFor(state: { comparisons: ComparisonRecord[] }, placeId: string) {
  return headToHeadStats(placeId, state.comparisons);
}
