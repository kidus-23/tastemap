// Headless verification of guest-mode flow semantics (the UI bugs found in review).
// The guest branch of tm-store never fetches — it runs pure-local ranking.
// Run: npx tsx scripts/verify-guest-flow.ts
import assert from "node:assert";
import { useTm } from "../src/lib/tm-store";
import { ADDIS_COMPARISONS, ADDIS_PLACES } from "../src/data/addis-seed";

const s0 = useTm.getState();
s0.clearFlow();
useTm.setState({
  mode: "guest",
  user: null,
  places: structuredClone(ADDIS_PLACES),
  comparisons: structuredClone(ADDIS_COMPARISONS),
  selectedId: null,
});

async function main() {
const newId = await s0.add({
  name: "Ravina Bakes & Coffee",
  lat: 9.0075,
  lng: 38.7790,
  cuisine: "Bakery",
  priceTier: 1,
  status: "BEEN",
  note: "cinnamon bun pilgrimage",
  tags: ["brunch"],
});

const st = useTm.getState();
const flowId = st.flowPlaceId;
assert.strictEqual(flowId, newId, "add() must open the ranking flow");
assert.strictEqual(st.flowState?.kind, "question", "first question rendered");

// answer "new place wins" until settled, exactly as the dialog does
let guard = 0;
let kind = "question";
while (kind !== "settled" && guard < 8) {
  guard++;
  kind = await useTm.getState().answer(true);
}
const after = useTm.getState();

// THE BUG FIX UNDER TEST: after settling, the dialog must still render the
// announcement (flowPlaceId stays + flowState.kind === "settled").
assert.strictEqual(after.flowState?.kind, "settled", "flowState settled");
assert.strictEqual(after.flowPlaceId, newId, "flowPlaceId must SURVIVE settle so the modal can announce the rank");
assert.strictEqual(after.flowState?.position, 1, "won everything ⇒ rank #1");
assert.strictEqual(
  after.places.find((p) => p.id === newId)?.position,
  1,
  "position persisted on the place"
);
console.log(`settled announcement survives: #${after.flowState?.position} of ${after.flowState?.totalRanked}, answered ${after.flowState?.answerCount} questions ✓`);

// closing the dialog clears both
after.clearFlow();
assert.strictEqual(useTm.getState().flowPlaceId, null);
assert.strictEqual(useTm.getState().flowState, null);
console.log("clearFlow closes dialog ✓");

// want→been reactivation resumes at the tail
const want = useTm.getState().places.find((p) => p.status === "WANT_TO_TRY")!;
await useTm.getState().update(want.id, { status: "BEEN" });
const resumed = useTm.getState();
assert.strictEqual(resumed.flowPlaceId, want.id, "status toggle reopens the flow");
assert.strictEqual(resumed.flowState?.kind, "question");

// and losing every question afterwards must land it at the bottom (#14 of 14 —
// 13 others existed: 12 seed been + the #1 place settled before)
let kind2 = "question";
guard = 0;
while (kind2 !== "settled" && guard < 8) {
  guard++;
  kind2 = await useTm.getState().answer(false);
}
const fin = useTm.getState();
assert.strictEqual(fin.flowState?.kind, "settled");
assert.strictEqual(fin.flowState?.position, 14, "lost all ⇒ #14 of 14");
assert.strictEqual(fin.flowState?.totalRanked, 14);
console.log(`reactivated place settled #${fin.flowState?.position} of ${fin.flowState?.totalRanked} ✓`);

// deleting the reactivated place cleans its comparisons
await useTm.getState().remove(want.id);
const cleaned = useTm.getState();
assert.strictEqual(cleaned.places.length, 18);
assert.strictEqual(
  cleaned.comparisons.length,
  ADDIS_COMPARISONS.length + 4, // seed + the settled #1 place's comparisons
  "comparisons involving the deleted place are removed"
);
console.log("delete cleans comparisons ✓");

console.log("guest flow semantics all hold ✓");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
