import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { compareStateFor, submitComparison } from "@/lib/place-service";

/** Current comparison state for a pending place (or null when nothing pending). */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const placeId = new URL(request.url).searchParams.get("placeId");
  if (!placeId) return NextResponse.json({ error: "placeId required" }, { status: 400 });
  try {
    const state = await compareStateFor(user.id, placeId);
    return NextResponse.json({ state });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }
    throw e;
  }
}

/** Answer a question: { placeId, opponentId, pendingWon } → next state. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as
    | { placeId?: string; opponentId?: string; pendingWon?: boolean }
    | null;
  if (!body?.placeId || !body.opponentId || typeof body.pendingWon !== "boolean") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  try {
    const state = await submitComparison(user.id, body.placeId, body.opponentId, body.pendingWon);
    return NextResponse.json({ state });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }
    throw e;
  }
}
