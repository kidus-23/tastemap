// Server-side place/comparison operations for logged-in users.
// All rank math lives in src/lib/ranking.ts so the guest store can
// reuse it unchanged.

import type { Prisma } from "@/generated/prisma/client";
import type { ComparisonRecord, PlaceRecord, PlaceStatus, Snapshot } from "./types";
import { deriveRankedOrder, nextComparison, settleSlot } from "./ranking";
import { db } from "./db";

/** Structural shape of a Place row (no relations). */
type PlaceRow = {
  id: string;
  userId: string;
  name: string;
  lat: number;
  lng: number;
  cuisine: string;
  priceTier: number;
  status: string;
  note: string | null;
  tags: string;
  visitCount: number;
  position: number | null;
  statusEnteredAt: Date;
};

export function toPlaceRecord(row: PlaceRow): PlaceRecord {
  return {
    id: row.id,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    cuisine: row.cuisine,
    priceTier: row.priceTier as 1 | 2 | 3,
    status: (row.status === "WANT_TO_TRY" ? "WANT_TO_TRY" : "BEEN") as PlaceStatus,
    note: row.note ?? "",
    tags: row.tags ? row.tags.split(",").filter(Boolean) : [],
    visitCount: row.visitCount,
    position: row.position,
    addedAt: row.statusEnteredAt.toISOString(),
  };
}

export async function loadSnapshot(userId: string): Promise<Snapshot> {
  const [places, comps] = await Promise.all([
    db.place.findMany({ where: { userId } }),
    db.comparison.findMany({
      where: { userId },
      select: { winnerId: true, loserId: true },
      orderBy: { id: "asc" },
    }),
  ]);
  const comparisons: ComparisonRecord[] = comps.map((c) => ({
    winnerId: c.winnerId,
    loserId: c.loserId,
  }));
  return { places: places.map(toPlaceRecord), comparisons };
}

export interface PlaceInput {
  name: string;
  lat: number;
  lng: number;
  cuisine: string;
  priceTier: number;
  status: string;
  note: string;
  tags: string[];
  visitCount?: number;
}

export async function createPlace(userId: string, input: PlaceInput): Promise<PlaceRecord> {
  const status: PlaceStatus = input.status === "WANT_TO_TRY" ? "WANT_TO_TRY" : "BEEN";
  const hasOtherBeen = (await db.place.count({ where: { userId, status: "BEEN" } })) > 0;
  const row = await db.place.create({
    data: {
      userId,
      name: input.name,
      lat: input.lat,
      lng: input.lng,
      cuisine: input.cuisine,
      priceTier: input.priceTier as 1 | 2 | 3,
      status,
      note: input.note,
      tags: input.tags.join(","),
      // a first "been" place needs no comparisons — it's rank #1 by definition
      position: status === "BEEN" && !hasOtherBeen ? 1 : null,
    },
  });
  return toPlaceRecord(row);
}

export async function patchPlace(
  userId: string,
  placeId: string,
  input: Partial<PlaceInput>
): Promise<PlaceRecord> {
  const existing = await db.place.findFirst({ where: { id: placeId, userId } });
  if (!existing) throw new Error("NOT_FOUND");
  const data: Prisma.PlaceUpdateInput = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.lat !== undefined ? { lat: input.lat } : {}),
    ...(input.lng !== undefined ? { lng: input.lng } : {}),
    ...(input.cuisine !== undefined ? { cuisine: input.cuisine } : {}),
    ...(input.priceTier !== undefined ? { priceTier: input.priceTier as 1 | 2 | 3 } : {}),
    ...(input.note !== undefined ? { note: input.note } : {}),
    ...(input.tags !== undefined ? { tags: input.tags.join(",") } : {}),
    ...(input.visitCount !== undefined ? { visitCount: input.visitCount } : {}),
  };
  const statusChangedTo = input.status as PlaceStatus | undefined;
  if (statusChangedTo === "BEEN" && existing.status === "WANT_TO_TRY") {
    // entering the ranked flow — needs comparisons unless it's the only been place
    const otherBeenCount = await db.place.count({ where: { userId, status: "BEEN" } });
    data.status = "BEEN";
    data.position = otherBeenCount === 0 ? 1 : null;
  } else if (statusChangedTo === "WANT_TO_TRY" && existing.status === "BEEN") {
    data.status = "WANT_TO_TRY";
    data.position = null;
  }
  const row = await db.place.update({ where: { id: placeId }, data });
  return toPlaceRecord(row);
}

export async function deletePlace(userId: string, placeId: string): Promise<void> {
  const existing = await db.place.findFirst({ where: { id: placeId, userId } });
  if (!existing) throw new Error("NOT_FOUND");
  await db.comparison.deleteMany({
    where: { userId, OR: [{ winnerId: placeId }, { loserId: placeId }] },
  });
  await db.place.delete({ where: { id: placeId } });
}

export interface CompareState {
  kind: "question" | "settled";
  placeId: string;
  opponent?: { id: string; name: string; cuisine: string; priceTier: number; note: string; tags: string[] };
  answerCount: number;
  expectedCount: number;
  totalRanked?: number;
  position?: number;
}

/**
 * Record "the pending place beat `opponentId`" (or lost) and recompute the
 * flow state. Sufficient evidence → the place settles with a rank.
 */
export async function submitComparison(
  userId: string,
  placeId: string,
  opponentId: string,
  pendingWon: boolean
): Promise<CompareState> {
  const place = await db.place.findFirst({ where: { id: placeId, userId } });
  const opponent = await db.place.findFirst({ where: { id: opponentId, userId } });
  if (!place || !opponent) throw new Error("NOT_FOUND");

  await db.comparison.create({
    data: {
      userId,
      winnerId: pendingWon ? placeId : opponentId,
      loserId: pendingWon ? opponentId : placeId,
    },
  });

  return compareStateFor(userId, placeId);
}

export async function compareStateFor(
  userId: string,
  placeId: string
): Promise<CompareState> {
  const comparisons = await db.comparison.findMany({
    where: { userId },
    select: { winnerId: true, loserId: true },
  });
  const places = await db.place.findMany({ where: { userId } });
  const records = places.map(toPlaceRecord);
  const pending = records.find((p) => p.id === placeId);
  if (!pending) throw new Error("NOT_FOUND");

  const beenRecords = records.filter((p) => p.status === "BEEN");
  const ranked = deriveRankedOrder(
    beenRecords.filter((p) => p.id !== placeId),
    comparisons
  );
  const answered = comparisons.filter(
    (c) => c.winnerId === placeId || c.loserId === placeId
  ).length;
  const answerCount = answered;

  const next = nextComparison(pending, ranked, comparisons);
  if (next) {
    const opp = ranked.find((p) => p.id === next.opponentId)!;
    return {
      kind: "question",
      placeId,
      opponent: {
        id: opp.id,
        name: opp.name,
        cuisine: opp.cuisine,
        priceTier: opp.priceTier,
        note: opp.note,
        tags: opp.tags,
      },
      answerCount,
      expectedCount: expected(ranked.length),
    };
  }
  // settled: slot = number of ranked places the pending one beats in order
  const slot = settleSlot(pending, ranked, comparisons);
  await db.place.update({ where: { id: placeId }, data: { position: slot + 1 } });
  return {
    kind: "settled",
    placeId,
    answerCount,
    expectedCount: expected(ranked.length),
    totalRanked: ranked.length + 1,
    position: slot + 1,
  };
}

function expected(listSize: number): number {
  return Math.max(1, Math.ceil(Math.log2(listSize + 1)));
}
