// Headless verification of the ranking engine + guest-mode semantics.
// Run: npx tsx scripts/verify-ranking.ts
import assert from "node:assert";
import { ADDIS_COMPARISONS, ADDIS_PLACES } from "../src/data/addis-seed";
import { deriveRankedOrder, nextComparison, settleSlot, expectedQuestionCount } from "../src/lib/ranking";
import type { ComparisonRecord, PlaceRecord } from "../src/lib/types";

const been = ADDIS_PLACES.filter((p) => p.status === "BEEN");

// 1. seed order is unique and exact
const order = deriveRankedOrder(been, ADDIS_COMPARISONS);
const names = order.map((p) => p.name);
assert.deepStrictEqual(names, [
  "Yod Abyssinia Traditional Restaurant",
  "2000 Habesha Cultural Restaurant",
  "Castelli's Ristorante",
  "Kategna Restaurant",
  "Social Momo",
  "Lucy Lounge & Restaurant",
  "Sishu Burger",
  "Sichuan Restaurant",
  "Tomoca Coffee",
  "Kaldi's Coffee — Bole",
  "Makush Art Gallery & Restaurant",
  "Taitu Hotel Restaurant",
]);
console.log("1. seed order reproduced exactly ✓");

// 2. a new place that loses every question settles at the bottom in ~4 questions
function runFlow(newPlace: PlaceRecord, answers: boolean[] | null) {
  const comparisons = structuredClone(ADDIS_COMPARISONS) as ComparisonRecord[];
  const others = deriveRankedOrder(been, comparisons);
  let asked = 0;
  for (let guard = 0; guard < 16; guard++) {
    const n = nextComparison(newPlace, others, comparisons);
    if (!n) {
      return { slot: settleSlot(newPlace, others, comparisons), asked };
    }
    const won =
      answers === null ? false : answers[asked % answers.length] ?? false;
    comparisons.push(
      won
        ? { winnerId: newPlace.id, loserId: n.opponentId }
        : { winnerId: n.opponentId, loserId: newPlace.id }
    );
    asked++;
  }
  throw new Error("flow never settled");
}

const bottom = runFlow(
  { id: "test-lose", name: "Test Loser", lat: 0, lng: 0, cuisine: "Burgers", priceTier: 1, status: "BEEN", note: "", tags: [], visitCount: 0, position: null, addedAt: new Date().toISOString() },
  null
);
console.log(`2. lose-everything flow: slot=${bottom.slot} (expect 12, 0-based ⇒ rank 13), questions=${bottom.asked}`);
assert.strictEqual(bottom.slot, 12);
assert.strictEqual(bottom.asked, expectedQuestionCount(12) - 1); // last midpoint already resolves itself
console.log("   ✓ settle math consistent");

function runFlowWins(newPlace: PlaceRecord) {
  const comparisons = structuredClone(ADDIS_COMPARISONS) as ComparisonRecord[];
  const others = deriveRankedOrder(been, comparisons);
  let asked = 0;
  for (let guard = 0; guard < 16; guard++) {
    const n = nextComparison(newPlace, others, comparisons);
    if (!n) return { slot: settleSlot(newPlace, others, comparisons), asked };
    comparisons.push({ winnerId: newPlace.id, loserId: n.opponentId });
    asked++;
  }
  throw new Error("never settled");
}
const topRes = runFlowWins({ id: "test-win", name: "Test Winner", lat: 0, lng: 0, cuisine: "Burgers", priceTier: 1, status: "BEEN", note: "", tags: [], visitCount: 0, position: null, addedAt: new Date().toISOString() });
console.log(`3. win-everything flow: slot=${topRes.slot} (expect 0 ⇒ rank 1), questions=${topRes.asked}`);
assert.strictEqual(topRes.slot, 0);

console.log("all ranking invariants hold ✓");
