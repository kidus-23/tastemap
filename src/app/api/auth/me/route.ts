import { NextResponse } from "next/server";
import { clearSession, getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}

export async function POST() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
