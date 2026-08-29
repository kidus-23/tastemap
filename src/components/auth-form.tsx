"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "signup" ? { email, password, name } : { email, password }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-8 shadow-sm">
        <Link href="/" className="font-display text-2xl font-semibold text-pine">
          Tastemap<span className="text-mustard">.</span>
        </Link>
        <h1 className="font-display mt-4 text-2xl font-semibold">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "login"
            ? "Your rankings are exactly how you left them."
            : "Your account starts with an empty map — add places and rank them as you go."}
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          {mode === "signup" && (
            <label className="block text-sm font-medium">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 font-normal"
                autoComplete="name"
              />
            </label>
          )}
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 font-normal"
              autoComplete="email"
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 font-normal"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "signup" ? 8 : undefined}
            />
          </label>
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-60"
          >
            {busy ? "…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-sm text-muted">
          {mode === "login" ? (
            <>
              No account yet?{" "}
              <Link href="/signup" className="font-semibold text-pine underline">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have one?{" "}
              <Link href="/login" className="font-semibold text-pine underline">
                Log in
              </Link>
            </>
          )}
        </p>
        <p className="mt-3 text-xs text-muted">
          Demo account with the seeded Addis map: <code>demo@tastemap.et</code> /{" "}
          <code>tastemap-demo</code>
        </p>
      </div>
    </main>
  );
}
