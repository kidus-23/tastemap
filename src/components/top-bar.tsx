"use client";

import Link from "next/link";

export function TopBar({
  mode,
  user,
  query,
  onQuery,
  onAdd,
  onGuest,
  onLogout,
}: {
  mode: "loading" | "guest" | "account";
  user: { name: string } | null;
  query: string;
  onQuery: (q: string) => void;
  onAdd: () => void;
  onGuest: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="z-20 border-b border-line bg-paper/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3 lg:px-6">
        <Link
          href="/"
          className="font-display shrink-0 text-xl font-semibold tracking-tight text-pine sm:text-2xl"
        >
          Tastemap<span className="text-mustard">.</span>
        </Link>
        <span className="hidden shrink-0 rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-muted sm:inline">
          Addis Ababa
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {mode === "account" && user ? (
            <>
              <span className="hidden text-sm font-semibold md:inline">{user.name}</span>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-full border border-line bg-card px-2.5 py-1.5 text-xs font-semibold text-muted hover:border-pine"
              >
                Log out
              </button>
              <button
                type="button"
                onClick={onGuest}
                className="hidden text-xs font-semibold text-muted underline underline-offset-2 md:inline"
              >
                View guest demo
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-full px-3 py-2 text-xs font-semibold text-ink/70 hover:bg-pine-soft sm:inline"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="hidden rounded-full border border-line bg-card px-3 py-2 text-xs font-semibold text-pine hover:border-pine sm:inline"
              >
                Sign up
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={onAdd}
            className="rounded-full bg-pine px-3 py-2 text-sm font-semibold text-white hover:bg-pine-deep sm:px-4"
          >
            + Add a place
          </button>
        </div>

        <label className="sr-only" htmlFor="place-search">
          Search places by name
        </label>
        <input
          id="place-search"
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search your places…"
          className="order-last min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-2 text-sm focus:border-pine sm:order-none sm:block sm:w-60 sm:flex-none lg:w-72"
        />
      </div>
    </header>
  );
}
