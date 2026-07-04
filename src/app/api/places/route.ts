import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createPlace, loadSnapshot } from "@/lib/place-service";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const snapshot = await loadSnapshot(user.id);
  return NextResponse.json(snapshot);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    lat?: number;
    lng?: number;
    cuisine?: string;
    priceTier?: number;
    status?: string;
    note?: string;
    tags?: string[];
  } | null;
  if (!body?.name || typeof body.lat !== "number" || typeof body.lng !== "number") {
    return NextResponse.json(
      { error: "A name and a map location are required." },
      { status: 400 }
    );
  }
  const place = await createPlace(user.id, {
    name: body.name.trim(),
    lat: body.lat,
    lng: body.lng,
    cuisine: body.cuisine ?? "Ethiopian",
    priceTier: body.priceTier ?? 1,
    status: body.status ?? "BEEN",
    note: body.note ?? "",
    tags: Array.isArray(body.tags) ? body.tags : [],
  });
  return NextResponse.json({ place });
}
