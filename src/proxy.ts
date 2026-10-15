import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limiting for credential-bearing POST routes (login, signup).
// Next.js 16 note: the middleware file convention is now `proxy.ts` — same
// request pipeline, current contract is one exported `proxy` function.
//
// Fixed-window counter, in-memory: per process, resets when the server
// restarts. Deliberately dependency-free — this is a demo app keyed on IP;
// a real deployment would put this agenda in the gateway or Redis.

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 10;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** leftmost x-forwarded-for entry, or a fallback key */
function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  const first = fwd?.split(",")[0]?.trim();
  return first || "direct";
}

const PROTECTED_PATHS = ["/api/auth/login", "/api/auth/signup"];

export function proxy(req: NextRequest) {
  const isProtected =
    req.method === "POST" && PROTECTED_PATHS.some((p) => req.nextUrl.pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const now = Date.now();
  const key = clientKey(req);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  bucket.count += 1;

  if (bucket.count > MAX_ATTEMPTS) {
    // opportunistic cleanup of other expired windows so the map can't grow
    if (buckets.size > 500) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  return NextResponse.next();
}
