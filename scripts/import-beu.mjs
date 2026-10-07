// One-time beU snapshot importer — fetches the live (zone-1, Addis Ababa)
// delivery catalog, keeps the top venues by order × rating, attaches their
// review comments with ALL customer PII stripped, and writes
// src/data/beu-snapshot.json.
//
// Run:            node scripts/import-beu.mjs
// Selftest only:  node scripts/import-beu.mjs --selftest   (no network)
//
// API recipe (verified 2026-11-01 by reverse-engineering the beU Android
// client, package com.xmt.beu.applite / efood_multivendor):
//   base https://development.beuapi.com  — live prod, unauthenticated
//   headers: zoneId: 1 (from /api/v1/config/get-zone-id), X-Location-Lat/Lng
//   /api/v1/categories -> /api/v1/categories/restaurants/{id}?limit=50&offset=N
//   /api/v1/restaurants/details/{id}  (rating = [n5,n4,n3,n2,n1])
//   /api/v1/restaurants/reviews?restaurant_id=…&offset=1&limit=…

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "src", "data", "beu-snapshot.json");
const RETRIEVED = "2026-10-07";

const API = "https://development.beuapi.com";
const HEADERS = {
  "zoneId": "1",
  "X-Location-Lat": "8.9908",
  "X-Location-Lng": "38.7899",
  "Accept": "application/json",
  "User-Agent": "curl/8",
};

// ---- pure helpers (selftest targets) --------------------------------------

/** Customer fields we keep. Everything else (phone, email, firebase token,
 *  verification state, order history…) is dropped by construction. */
const COMMENT_FIELDS = ["name", "date", "rating", "food", "text"];

/** Strip a raw API review down to the whitelisted shape. */
export function scrubComment(raw) {
  return {
    name: typeof raw?.customer?.f_name === "string" ? raw.customer.f_name : "",
    date: typeof raw?.created_at === "string" ? raw.created_at.slice(0, 10) : "",
    rating: Number(raw?.rating) || 0,
    food: typeof raw?.food_name === "string" && raw.food_name ? raw.food_name : null,
    text: typeof raw?.comment === "string" ? raw.comment.trim() : "",
  };
}

/** True when a scrubbed comment is worth showing. */
export function commentUsable(c) {
  return (
    c.text.length >= 15 &&
    c.text !== "No comment" &&
    c.rating > 0 &&
    /\+251|@gmail|@yahoo|@hotmail|firebase_token/.test(c.text) === false
  );
}

/** Google Maps directions that resolve a POI, not bare coordinates. */
export function mapsDirectionsUrl(name, address) {
  const dest = `${name}, ${address}, Addis Ababa`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}

/** Normalize a venue name for seed matching: lowercase, stage tags ("| Bole",
 *  "|Gerji"…) become plain separators, only alphanumerics survive. */
export function normalizeName(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Generic food/venue words that must never drive a seed match. */
const GENERIC_TOKENS = new Set(
  ["restaurant", "ristorante", "pizzeria", "cafe", "coffee", "burger", "pizza", "hotel", "lounge",
   "kitchen", "bar", "food", "fast", "juice", "traditional", "cultural",
   "and", "the", "of", "birr", "your", "place", "garden"]
);

/** Neighborhood / branch-tag segments split out of beU names ("| Bole",
 *  "|Gerji"…). Never identity, never match-worthy. */
const NEIGHBORHOODS = new Set(
  ["bole", "gerji", "sarbet", "kazanchis", "kazanchise", "summit", "lafto",
   "kilo", "jemo", "gotera", "jacros", "piassa", "saris", "balderas",
   "century", "mall", "medhanialem", "goro", "megenagna", "cmc", "ayat",
   "22", "4", "6", "1"]
);

/** Identity tokens of a venue name: branch/neighborhood segments removed
 *  (short or purely numeric segments are tags too), stoplist applied. */
export function identityTokens(s) {
  const segments = String(s)
    .split(/[|/:,\u2014\u2013]+/)
    .map((seg) => seg.trim())
    .filter((seg) => seg.length >= 4 && !/^\d+$/.test(seg) && !NEIGHBORHOODS.has(seg.toLowerCase()));
  return segments
    .flatMap((seg) => normalizeName(seg).split(" "))
    .filter((t) => t.length >= 3 && !GENERIC_TOKENS.has(t));
}

/**
 * Best token-overlap similarity between one of the seed names and a beU
 * venue name, over DISTINCTIVE identity tokens only (branch tags and
 * generic food words removed from both sides), so "Sishu Burger" can only
 * match a venue containing "sishu" and "Kaldi's Coffee — Bole" never
 * matches just anything in Bole. Seed→beu prefix matches count ("yod";"yoda").
 */
export function nameSimilarity(seedList, beuName) {
  const beuTokens = identityTokens(beuName);
  let best = 0;
  for (const seed of seedList) {
    const distinctive = identityTokens(seed);
    if (distinctive.length === 0) continue;
    const hits = distinctive.filter((t) =>
      beuTokens.some((b) => b === t || (b.length >= 3 && b.startsWith(t)))
    ).length;
    const sim = hits / distinctive.length;
    if (sim > best) best = sim;
  }
  return best;
}

/** Parse the seed venue names out of src/data/addis-seed.ts without a TS loader. */
export function seedNames(source) {
  return [...String(source).matchAll(/name:\s*"([^"]+)"/g)].map((m) => m[1]);
}

/** Presentable histogram fields from the API's `[n5, n4, n3, n2, n1]`. */
export function ratingTuple(histogram) {
  const [n5 = 0, n4 = 0, n3 = 0, n2 = 0, n1 = 0] = histogram ?? [];
  const count = n5 + n4 + n3 + n2 + n1;
  const avg = count === 0 ? 0 : (5 * n5 + 4 * n4 + 3 * n3 + 2 * n2 + 1 * n1) / count;
  return { count, avg: Math.round(avg * 100) / 100 };
}

// ---- selftest --------------------------------------------------------------

export function selftest() {
  const dirty = {
    comment: "Good food, fast delivery, call me on +251911223344 for catering",
    rating: 5,
    food_name: "Special Kitfo",
    created_at: "2026-09-12T18:31:00.000Z",
    customer: {
      f_name: "Abel",
      phone: "+251911223344",
      email: "abel@gmail.com",
      cm_firebase_token: "dKzICcbUE0iwpCKxYDBD20:APA91b…",
      email_verification_token: "tok_123",
      order_count: 14,
    },
  };
  const scrubbed = scrubComment(dirty);
  assertKeys(scrubbed, COMMENT_FIELDS, "scrubComment keeps only whitelisted keys");
  if (scrubbed.name !== "Abel") throw new Error("selftest: first name lost");
  // PII embedded in the comment text itself → the comment is never published
  if (commentUsable(scrubbed)) throw new Error("selftest: PII-bearing text published");
  const clean = scrubComment({ ...dirty, comment: "Good food, fast delivery, will order again" });
  if (!commentUsable(clean)) throw new Error("selftest: usable comment rejected");
  if (commentUsable(scrubComment({ comment: "No comment", rating: 4, created_at: "x", customer: {} }))) {
    throw new Error("selftest: 'No comment' accepted");
  }

  const url = mapsDirectionsUrl("G Burger", "Bole Medhanialem, Behind Sheger Bldg.");
  if (!url.startsWith("https://www.google.com/maps/dir/?api=1&destination=G%20Burger")) {
    throw new Error("selftest: directions URL lost the venue name");
  }
  if (decodeURIComponent(url).match(/8\.\d+, ?38\.\d+/)) {
    throw new Error("selftest: bare coordinates in directions URL");
  }

  const sim = nameSimilarity(["Tomoca Coffee"], "Tomoca |22| Piassa");
  if (sim <= 0) throw new Error("selftest: nameSimilarity missed an obvious match");
  if (nameSimilarity(["Tomoca Coffee"], "OSCAR Burger") > 0) {
    throw new Error("selftest: nameSimilarity matched unrelated venue");
  }
  // generic tokens must never carry a match: 40+ burger joints must not
  // all become "Sishu Burger" matches
  if (nameSimilarity(["Sishu Burger"], "Magic Burger and Pizza") > 0) {
    throw new Error("selftest: generic token 'burger' drove a false seed match");
  }
  if (nameSimilarity(["Kaldi's Coffee — Bole"], "Moyee Coffee") > 0) {
    throw new Error("selftest: generic token 'coffee' drove a false seed match");
  }
  // branch/neighborhood tags are never identity
  if (nameSimilarity(["Kaldi's Coffee — Bole"], "Maya Juice / Bole") > 0) {
    throw new Error("selftest: neighborhood tag 'Bole' drove a false seed match");
  }
  if (nameSimilarity(["Castelli's Ristorante"], "Ristorante Pizzeria Italia") > 0) {
    throw new Error("selftest: generic token 'ristorante' drove a false seed match");
  }
  // "garden" is semi-generic: "Garden of Coffee" must not collide with
  // unrelated venues whose names merely contain "Garden"
  if (nameSimilarity(["Garden of Coffee"], "Addis Garden") > 0) {
    throw new Error("selftest: generic token 'garden' drove a false seed match");
  }
  if (nameSimilarity(["Sichuan Restaurant"], "Sichuan Restaurant") < 1) {
    throw new Error("selftest: exact seed name did not itself match");
  }
  if (nameSimilarity(["Tomoca Coffee"], "Tomoca |22| Piassa") < 1) {
    throw new Error("selftest: branch-tag name did not normalize to its identity");
  }

  const { count, avg } = ratingTuple([226, 67, 36, 29, 59]);
  if (count !== 417 || Math.abs(avg - 3.89) > 0.01) {
    throw new Error(`selftest: ratingTuple wrong (${count}, ${avg})`);
  }
  console.log("selftest: PII scrub, directions URL, matching, rating math ✓");
}

function assertKeys(obj, keys, label) {
  for (const k of Object.keys(obj)) {
    if (!keys.includes(k)) throw new Error(`${label}: unexpected key ${k}`);
  }
  for (const k of keys) {
    if (!(k in obj)) throw new Error(`${label}: missing key ${k}`);
  }
}

// ---- network ---------------------------------------------------------------

async function api(ep) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(API + ep, { headers: HEADERS, timeout: 30000 });
      if (!res.ok) throw new Error(`${res.status} on ${ep.split("?")[0]}`);
      return await res.json();
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

async function* paged(listEps, key = null) {
  for (const ep of listEps) {
    for (let off = 1; ; off += 50) {
      const page = await api(`${ep}${ep.includes("?") ? "&" : "?"}limit=50&offset=${off}`);
      const rows = key ? page[key] : page;
      if (!Array.isArray(rows)) break;
      for (const r of rows) yield r;
      if (rows.length < 50) break;
    }
  }
}

async function main() {
  console.log("sweeping the addis catalog (24 categories + popular)…");
  const byId = new Map();
  const cats = await api("/api/v1/categories");
  const eps = cats.map((c) => `/api/v1/categories/restaurants/${c.id}`);
  eps.push("/api/v1/restaurants/popular");
  for (const r of await collect(eps, "restaurants")) byId.set(r.id, r);
  console.log(`  unique venues: ${byId.size}`);

  const seed = seedNames(fs.readFileSync(path.join(ROOT, "src", "data", "addis-seed.ts"), "utf8"));
  console.log(`seed venues to match: ${seed.length}`);

  // the /search endpoint surfaces venues the category sweep misses — query
  // it with every seed name (and its identity tokens) BEFORE fetching details
  for (const s of seed) {
    for (const term of [s, ...identityTokens(s)]) {
      try {
        const j = await api(`/api/v1/restaurants/search?name=${encodeURIComponent(term)}&limit=20`);
        for (const r of j.restaurants ?? []) byId.set(r.id, r);
      } catch { /* search is best-effort */ }
    }
  }
  console.log(`  venues after seed searches: ${byId.size}`);

  // details for every candidate — details/{id} carries the rating histogram
  console.log("fetching details + histograms…");
  const ids = [...byId.keys()];
  const details = [];
  for (let i = 0; i < ids.length; i += 8) {
    const chunk = ids.slice(i, i + 8);
    const got = await Promise.allSettled(chunk.map((id) => api(`/api/v1/restaurants/details/${id}`)));
    for (const g of got) if (g.status === "fulfilled" && g.value?.name) details.push(g.value);
    if ((i + 8) % 80 === 0) console.log(`  ${Math.min(i + 8, ids.length)}/${ids.length}`);
  }

  const scoredUnfiltered = details
    .map((d) => ({ d, ...ratingTuple(d.rating) }))
    .filter((x) => x.count >= 1);

  // seed matches are exempt from the order-count floor: even a thinly-used
  // delivery arm (Tomoca has 1 beU order) is a real enrichment we want.
  const seedMatches = scoredUnfiltered.filter((x) => nameSimilarity(seed, x.d.name) >= 0.6);
  for (const m of seedMatches) m.seedLocked = true;

  const scored = scoredUnfiltered
    .filter((x) => x.count >= 5) // favorites need a few orders behind them
    .sort((a, b) => b.count * b.avg - a.count * a.avg || b.count - a.count);

  const top = [];
  for (const x of scored) {
    if (x.seedLocked) continue;
    top.push(x);
    if (top.length >= 40) break;
  }
  const keep = [...seedMatches, ...top];
  console.log(`keeping ${seedMatches.length} seed matches + ${top.length} favorites`);

  console.log("fetching review comments…");
  const places = [];
  for (const x of keep) {
    let rawRevs = [];
    try {
      rawRevs = await api(`/api/v1/restaurants/reviews?restaurant_id=${x.d.id}&offset=1&limit=60`);
    } catch {
      rawRevs = [];
    }
    const comments = rawRevs
      .map(scrubComment)
      .filter(commentUsable)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 8);
    places.push({
      beuId: x.d.id,
      name: x.d.name,
      address: x.d.address ?? "",
      lat: Number(x.d.latitude),
      lng: Number(x.d.longitude),
      ratingAvg: x.avg,
      ratingCount: x.count,
      histogram: [x.d.rating?.[0] ?? 0, x.d.rating?.[1] ?? 0, x.d.rating?.[2] ?? 0, x.d.rating?.[3] ?? 0, x.d.rating?.[4] ?? 0],
      seedMatch: Boolean(x.seedLocked),
      comments,
    });
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ retrieved: RETRIEVED, places }, null, 1));
  console.log(`wrote ${OUT} — ${places.length} venues, retrieved ${RETRIEVED}`);
}

async function collect(eps, key = null) {
  const out = [];
  for await (const r of paged(eps, key)) out.push(r);
  return out;
}

if (process.argv.includes("--selftest")) {
  selftest();
} else {
  await main();
}
