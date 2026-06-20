// generates docs/data/addis-places.csv from the seed dataset
import { writeFile } from "node:fs/promises";
import { ADDIS_PLACES } from "../../src/data/addis-seed";

function esc(v: string | number) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

const rows = ADDIS_PLACES.map((p) =>
  [
    p.name,
    p.lat,
    p.lng,
    p.cuisine,
    p.priceTier,
    p.status,
    p.tags.join("|"),
    p.note ?? "",
    p.visitCount,
  ]
    .map(esc)
    .join(",")
);
const csv = ["name,lat,lng,cuisine,priceTier,status,tags,note,visitCount", ...rows].join("\r\n");

writeFile(new URL("./addis-places.csv", import.meta.url), csv + "\r\n", "utf8").then(() =>
  console.log(`wrote ${rows.length} rows`)
);
