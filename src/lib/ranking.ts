// Ranking engine — the honest part of Tastemap.
//
// Rank is DERIVED from stored head-to-head comparisons. A place beats
// another if it beat it directly or transitively; unresolved pairs fall
// back to a consistent, explainable heuristic instead of inventing stars.

import type { ComparisonRecord, PlaceRecord } from "./types";

export interface RankedGroup {
  /** continuous 1-based ordinals; equal values on every member of a tie */
  ordinal: number;
  contributors: PlaceRecord[];
}

/** Does `a` beat `b` through stored comparisons (direct or transitive)? */
export function beats(aId: string, bId: string, comparisons: ComparisonRecord[]): boolean {
  const byWinner = new Map<string, string[]>();
  for (const c of comparisons) {
    const list = byWinner.get(c.winnerId) ?? [];
    list.push(c.loserId);
    byWinner.set(c.winnerId, list);
  }
  // BFS from a — we're asking "who lost to a, directly or not?"
  const queue = [aId];
  const seen = new Set<string>([aId]);
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const next of byWinner.get(id) ?? []) {
      if (next === bId) return true;
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

/**
 * Total order of a user's "been" places:
 * pairwise beats() with deterministic tie-breaks (win count against
 * shared opponents, recency, name) so the list is stable between renders.
 */
export function deriveRankedOrder(
  beenPlaces: PlaceRecord[],
  comparisons: ComparisonRecord[]
): PlaceRecord[] {
  const sorted = [...beenPlaces].sort((a, b) => {
    if (beats(a.id, b.id, comparisons)) return -1;
    if (beats(b.id, a.id, comparisons)) return 1;
    // Neither provably above the other: shared-opponent win rate, then recency, then name.
    const wa = winsAmong(a, b, beenPlaces, comparisons);
    const wb = winsAmong(b, a, beenPlaces, comparisons);
    if (wa !== wb) return wb - wa;
    if (a.addedAt !== b.addedAt) return a.addedAt < b.addedAt ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return sorted;
}

function winsAmong(
  a: PlaceRecord,
  b: PlaceRecord,
  been: PlaceRecord[],
  comparisons: ComparisonRecord[]
): number {
  const opps = new Set(been.map((p) => p.id));
  let wins = 0;
  for (const c of comparisons) {
    if (c.winnerId === a.id && opps.has(c.loserId) && c.loserId !== b.id) wins++;
  }
  let bWins = 0;
  for (const c of comparisons) {
    if (c.winnerId === b.id && opps.has(c.loserId) && c.loserId !== a.id) bWins++;
  }
  return wins - bWins;
}

/** Head-to-head stats per place, for the detail view. */
export function headToHeadStats(placeId: string, comparisons: ComparisonRecord[]) {
  const wins = comparisons.filter((c) => c.winnerId === placeId).length;
  const losses = comparisons.filter((c) => c.loserId === placeId).length;
  return { wins, losses };
}

/**
 * Next comparison question for a pending place, or null when its slot is
 * fully decided (then its position = final slot index + 1).
 *
 * Strategy: binary insert over the current ranked list. The slot candidate
 * range is [lo, hi]; every stored comparison against the pending place
 * narrows the range silently, and the first unknown midpoint becomes the
 * question. At most ⌈log₂(n)⌉ user questions — answered ones never repeat.
 */
export function nextComparison(
  pending: PlaceRecord,
  beenPlaces: PlaceRecord[], // ranked "been" places WITHOUT the pending one
  comparisons: ComparisonRecord[]
): { opponentId: string } | null {
  if (beenPlaces.length === 0) return null;

  const ordered = deriveRankedOrder(beenPlaces, comparisons);
  let lo = 0; // slot ∈ [lo, hi] (0 = top of the list)
  let hi = ordered.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const result = comparisonResult(pending.id, ordered[mid].id, comparisons);
    if (result === "pending-won") hi = mid; // pending beat someone here → slots above it
    else if (result === "pending-lost") lo = mid + 1; // pending lost → slots below it
    else return { opponentId: ordered[mid].id }; // unknown → ask the user
  }
  return null;
}

/**
 * Slot index (0-based) of a fully-decided pending place within `ranked`.
 * Callers use slot + 1 as the displayed rank.
 */
export function settleSlot(
  pending: PlaceRecord,
  ranked: PlaceRecord[],
  comparisons: ComparisonRecord[]
): number {
  let lo = 0;
  let hi = ranked.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const result = comparisonResult(pending.id, ranked[mid].id, comparisons);
    if (result === "pending-won") hi = mid;
    else if (result === "pending-lost") lo = mid + 1;
    else break;
  }
  return lo;
}

function comparisonResult(
  pendingId: string,
  opponentId: string,
  comparisons: ComparisonRecord[]
): "pending-won" | "pending-lost" | "unknown" {
  for (const c of comparisons) {
    if (c.winnerId === pendingId && c.loserId === opponentId) return "pending-won";
    if (c.winnerId === opponentId && c.loserId === pendingId) return "pending-lost";
  }
  return "unknown";
}

/** Expected comparisons to fully place a "been" spot: ≈ log2(n+1). */
export function expectedQuestionCount(listSize: number): number {
  return Math.max(1, Math.ceil(Math.log2(listSize + 1)));
}
