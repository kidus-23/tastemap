// Real-browser screenshots for the README.
// Start the prod server first:  npm run start -- -p 3200
// Then run:                     npx tsx scripts/screenshot.mts
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Browser, Page } from "playwright";
import pwCore from "playwright";

const BASE = process.env.TM_PORT ? `http://localhost:${process.env.TM_PORT}` : "http://localhost:3200";
const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "docs", "screenshots");
mkdirSync(OUT, { recursive: true });

const { chromium } = pwCore as unknown as typeof import("playwright");

const browser = await (async (): Promise<Browser> => {
  for (const channel of ["msedge", "chrome", ""]) {
    try {
      const b = await chromium.launch(
        channel
          ? { channel, headless: true, args: ["--disable-gpu"] }
          : { headless: true, args: ["--disable-gpu"] }
      );
      console.log(`launched with channel=${channel || "bundled chromium"}`);
      return b;
    } catch (e) {
      console.log(`channel=${channel || "chromium"} failed: ${(e as Error).message.split("\n")[0]}`);
    }
  }
  throw new Error("no browser available — run: npx playwright install chromium");
})();

const shot = async (page: Page, name: string) => {
  await page.waitForTimeout(700); // settle fonts/transitions
  await page.screenshot({ path: join(OUT, name) });
  console.log("✓", name);
};

// ── desktop ──────────────────────────────────────────────────────────────
const ctxD = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctxD.newPage();

const GOTO = { waitUntil: "domcontentloaded", timeout: 60000 } as const;
// OSM drops the tail of big tile bursts (Leaflet never retries failed tiles),
// so force-retry just the missing tiles in small waves until complete.
const tilesLoaded = async (page: Page) => {
  for (let wave = 0; wave < 20; wave++) {
    const counts = await page.evaluate(
      `(() => JSON.stringify({ loaded: document.querySelectorAll("img.leaflet-tile-loaded").length, total: document.querySelectorAll("img.leaflet-tile").length }))()`
    ).then((v) => JSON.parse(String(v)) as { loaded: number; total: number });
    const loaded = counts.loaded;
    const total = counts.total;
    // beware the "no tiles requested yet early-exit": require some real tiles
    if (total > 0 && loaded >= total) return;
    // the network here drops most parallel tile requests — re-request the
    // missing ones in tiny serialized chunks
    for (let pass = 0; pass < 6; pass++) {
      await new Promise((r) => setTimeout(r, 1500));
      await page.evaluate(
        `(() => {
          const missing = document.querySelectorAll("img.leaflet-tile:not(.leaflet-tile-loaded)");
          const batch = Array.from(missing).slice(0, 3);
          if (batch.length === 0) return;
          batch.forEach((el) => {
            const src = el.src.split("?")[0];
            el.src = src + "?r=" + Math.random();
          });
        })()`
      );
      await page.waitForTimeout(2000);
      const done = await page.evaluate(
        `(() => document.querySelectorAll("img.leaflet-tile:not(.leaflet-tile-loaded)").length === 0)()`
      );
      if (done) return;
    }
  }
  console.log("warning: some tiles still missing after retries");
};

const step = (m: string) => console.log("…", m);

await page.goto(BASE, GOTO);
step("landing loaded");
await shot(page, "landing.png");

await page.goto(BASE + "/dashboard", GOTO);
await page.waitForSelector("text=Your top tables", { timeout: 30000 });
await tilesLoaded(page);
step("dashboard loaded");
await shot(page, "dashboard-desktop.png");

// detail sheet — Yod Abyssinia is the #1 card
await page.getByRole("button", { name: /Yod Abyssinia/ }).first().click();
step("yod card clicked");
await page.waitForTimeout(400);
await shot(page, "detail-desktop.png");

// compare flow: inject a pending been place into the guest store, reload,
// open its detail, hit "Rank it now"
await page.evaluate(() => {
  const key = "tastemap-guest-v1";
  const parsed = JSON.parse(localStorage.getItem(key)!);
  parsed.state.places.push({
    id: "pending-shot",
    name: "Antica Pizzeria Demma",
    lat: 9.0294,
    lng: 38.7963,
    cuisine: "Italian",
    priceTier: 2,
    status: "BEEN",
    note: "wood-fired margherita near Demma",
    tags: ["pizza"],
    visitCount: 1,
    position: null,
    addedAt: "2026-09-11T12:00:00.000Z",
  });
  localStorage.setItem(key, JSON.stringify(parsed));
});
await page.reload(GOTO);
step("reloaded with pending place — flow auto-resumes");
// init() auto-resumes ranking for a pending been place, so the dialog opens by itself
await page.waitForSelector('[role="dialog"] >> text=Which was better?', { timeout: 20000 });
step("question dialog open");
await tilesLoaded(page);
await shot(page, "compare-question.png");

// answer with the first card until it settles, then capture the announcement
for (let i = 0; i < 10; i++) {
  const dlg = page.locator('[role="dialog"]');
  if ((await dlg.getByText("Ranked in").count()) > 0) break;
  const cards = dlg.getByRole("button").filter({ hasText: /the new place|current/ });
  step(`answering question ${i + 1} (cards=${await cards.count()})`);
  await cards.first().click({ timeout: 5000 }).catch(async (e) => {
    console.log("card click failed:", (e as Error).message.split("\n")[0]);
    await page.screenshot({ path: join(OUT, "debug-click.png") });
    throw e;
  });
  await page.waitForTimeout(600);
}
// settle + retake the map state before the announcement shot
await page.waitForTimeout(900);
await tilesLoaded(page);
await shot(page, "compare-settled.png");

// fresh guest seed for the mobile shots
await page.evaluate(() => localStorage.removeItem("tastemap-guest-v1"));
await ctxD.close();

// ── phone ────────────────────────────────────────────────────────────────
const ctxM = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
});
const mp = await ctxM.newPage();
await mp.goto(BASE + "/dashboard", GOTO);
await mp.waitForSelector("text=Your top tables");
await shot(mp, "mobile-list.png");

await mp.getByRole("button", { name: /map/i }).first().click();
step("map tab clicked");
await mp.waitForSelector(".tm-pin", { timeout: 20000 });
await tilesLoaded(mp);
await mp.waitForTimeout(1500); // repin/reposition after invalidateSize
await shot(mp, "mobile-map.png");

await browser.close();
console.log("all screenshots saved to docs/screenshots");
