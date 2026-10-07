// Headless verification of the beU snapshot + lookup lib.
// Run: npx tsx scripts/verify-beu.ts
import assert from "node:assert";
import rifleSnapshot from "../src/data/beu-snapshot.json";
import {
  BEU_FAVORITES,
  BEU_RETRIEVED,
  beuFor,
  mapsDirectionsUrl,
} from "../src/lib/beu";

type comment = { name: string; date: string; rating: number; food: string | null; text: string };

// 1. snapshot is present, dated, and carries enough favorites to be worth showing
assert.strictEqual(rifleSnapshot.retrieved, "2026-10-07");
const places = rifleSnapshot.places as {
  beuId: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  ratingAvg: number;
  ratingCount: number;
  histogram: number[];
  comments: comment[];
}[];
assert.ok(places.length >= 40, `expected >= 40 snapshot venues, got ${places.length}`);
const favorites = BEU_FAVORITES.length;
assert.ok(favorites >= 40, `expected >= 40 favorites, got ${favorites}`);
assert.ok(
  places.every((p) => p.ratingCount > 0),
  "every snapshot venue has at least one order rated"
);
console.log(`1. snapshot (${places.length} venues, ${favorites} in the favorites layer) ✓`);

// 2. every comment's keys are exactly the whitelisted set — no PII can slip
const allowed = new Set(["name", "date", "rating", "food", "text"]);
for (const p of places) {
  for (const c of p.comments) {
    assert.ok(
      Object.keys(c).every((k) => allowed.has(k)),
      `comment key leak in venue ${p.beuId}: ${Object.keys(c).join(", ")}`
    );
  }
}
console.log("2. comment keys strictly whitelisted ✓");

// 3. no contact-shaped string anywhere in the snapshot
const raw = JSON.stringify(rifleSnapshot);
assert.ok(!/\+251\s?\d{2,}/.test(raw), "phone number leaked into snapshot");
assert.ok(!/firebase_token/.test(raw), "firebase token leaked into snapshot");
assert.ok(!/@gmail|@yahoo|@hotmail/.test(raw), "email leaked into snapshot");
console.log("3. no phone / token / email strings ✓");

// 4. directions URL resolves a POI (name + address), never bare coordinates
const url = mapsDirectionsUrl("Cocoon Juice And Burger | Bole", "Bole Infront Of Sheger House");
assert.ok(url.startsWith("https://www.google.com/maps/dir/?api=1&destination="), url);
const decoded = decodeURIComponent(url);
assert.ok(decoded.includes("Cocoon Juice And Burger"), url);
assert.ok(decoded.includes("Addis Ababa"), url);
assert.ok(!/8\.\d+,\s*38\.\d+/.test(decoded), "bare coordinates leaked into directions URL");
console.log("4. directions URL is POI-resolving ✓");

// 5. seed-venue lookup finds a real match by name only
const hit = beuFor("Tomoca Coffee") ?? beuFor("Sichuan Restaurant");
assert.ok(hit !== null, "expected at least one beU match for the seed list");
assert.ok(hit.place.name.length > 0 && hit.place.ratingCount > 0, String(hit));
console.log(`5. seed lookup resolves a real match → ${hit.place.name} ✓`);

console.log(`snapshot retrieved: ${BEU_RETRIEVED}`);
console.log("verify-beu: all checks passed");
