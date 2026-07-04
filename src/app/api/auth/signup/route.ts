import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, getSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string; name?: string }
    | null;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";
  const name = body?.name?.trim();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password needs at least 8 characters." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Tell us what to call you." }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "That email already has an account — try logging in." },
      { status: 409 }
    );
  }

  const { hashPassword } = await import("@/lib/auth");
  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { email, name, passwordHash },
    select: { id: true, email: true, name: true },
  });
  await createSession(user);
  return NextResponse.json({ user });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user });
}
