import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { deletePlace, patchPlace } from "@/lib/place-service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  try {
    const place = await patchPlace(user.id, id, body as never);
    return NextResponse.json({ place });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  try {
    await deletePlace(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }
    throw e;
  }
}
