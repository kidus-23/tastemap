// Seeds a demo account (demo@tastemap.et / tastemap-demo) whose map is the
// exact Addis Ababa guest dataset, so the server-backed app can be demoed
// immediately after signup-free login.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { ADDIS_COMPARISONS, ADDIS_PLACES } from "../src/data/addis-seed";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/tastemap",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "demo@tastemap.et";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.delete({ where: { email } }); // idempotent reseed
  }

  const passwordHash = await bcrypt.hash("tastemap-demo", 12);
  const user = await prisma.user.create({
    data: { email, name: "Demo Diner", passwordHash },
  });

  const ids = new Map<string, string>();
  for (const p of ADDIS_PLACES) {
    const row = await prisma.place.create({
      data: {
        userId: user.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        cuisine: p.cuisine,
        priceTier: p.priceTier,
        status: p.status,
        note: p.note,
        tags: p.tags.join(","),
        visitCount: p.visitCount,
        position: p.position,
        statusEnteredAt: new Date(p.addedAt),
      },
    });
    ids.set(p.id, row.id);
  }

  for (const c of ADDIS_COMPARISONS) {
    const winnerId = ids.get(c.winnerId);
    const loserId = ids.get(c.loserId);
    if (!winnerId || !loserId) throw new Error("seed comparison references unknown place");
    await prisma.comparison.create({
      data: { userId: user.id, winnerId, loserId },
    });
  }

  console.log(
    `Seeded demo account ${email} with ${ADDIS_PLACES.length} places (` +
      `${ADDIS_COMPARISONS.length} comparisons, ${ADDIS_PLACES.length - 12} want-to-try).`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
