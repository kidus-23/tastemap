import Link from "next/link";

export default function Landing() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Addis Ababa · your top tables
        </p>
        <h1 className="font-display mt-4 text-5xl font-semibold leading-tight text-pine sm:text-6xl">
          Tastemap<span className="text-mustard">.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-ink/80">
          Every place you&apos;ve eaten in Addis Ababa, on one honest map. No stars — a
          place earns its rank when you answer{" "}
          <em className="font-display">“which was better?”</em> a handful of times.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="w-full rounded-full bg-pine px-8 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-pine-deep sm:w-auto"
          >
            Try as guest
          </Link>
          <Link
            href="/signup"
            className="w-full rounded-full border border-pine px-8 py-3 text-sm font-semibold text-pine transition-colors hover:bg-pine-soft sm:w-auto"
          >
            Create an account
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted">
          Guest mode arrives pre-loaded with 12 ranked places, 6 want-to-try spots and 25
          prior comparisons — fully editable, saved in your browser, no account needed.
        </p>

        <div className="mt-14 grid gap-4 text-left sm:grid-cols-3">
          <Feature
            title="Honest ranking"
            body="Binary-insertion comparisons slot a new spot in ~4 questions. The list can't lie to you."
          />
          <Feature
            title="Map + list, always together"
            body="Filter once; pins and list both narrow. Pick anywhere — the other view follows."
          />
          <Feature
            title="Where should we eat?"
            body="One button picks from whatever already passed your filters — two taps to a confident choice."
          />
        </div>
      </div>
      <footer className="mt-16 text-xs text-muted">
        Built with free OpenStreetMap tiles · keyless Nominatim geocoding · a Frontend
        Mentor product challenge adapted for Addis Ababa.
      </footer>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <h2 className="font-display text-lg font-semibold text-pine">{title}</h2>
      <p className="mt-1.5 text-sm leading-6 text-ink/75">{body}</p>
    </div>
  );
}
