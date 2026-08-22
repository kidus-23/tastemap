"use client";

import type { CompareState } from "@/lib/tm-store";
import type { PlaceRecord } from "@/lib/types";

interface CompareFlowProps {
  state: CompareState | null;
  pending: PlaceRecord | null;
  onAnswer: (pendingWon: boolean) => Promise<"question" | "settled">;
  onClose: () => void;
}

export function CompareFlow({ state, pending, onAnswer, onClose }: CompareFlowProps) {
  if (!state || !pending) return null;

  return (
    <div className="fixed inset-0 z-[1300] flex items-end justify-center bg-ink/50 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Head-to-head ranking"
        className="w-full max-w-xl rounded-t-2xl bg-paper p-6 shadow-2xl sm:rounded-2xl"
      >
        {state.kind === "question" ? (
          <>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                Which was better?
              </p>
              <p className="text-xs font-medium text-muted">
                question {Math.min(state.answerCount + 1, state.expectedCount)} of ~
                {state.expectedCount}
              </p>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
              <ChoiceCard
                name={pending.name}
                cuisine={pending.cuisine}
                note={pending.note}
                highlight="new"
                onPick={() => void onAnswer(true)}
              />
              <div className="flex items-center font-display text-lg text-muted">vs</div>
              <ChoiceCard
                name={state.opponent.name}
                cuisine={state.opponent.cuisine}
                note={state.opponent.note}
                onPick={() => void onAnswer(false)}
              />
            </div>
            <div className="mt-4 text-center">
              <p className="text-xs text-muted">
                Every answer is remembered — you&apos;ll never re-answer the same matchup.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 text-xs font-semibold text-muted underline underline-offset-2"
              >
                Finish later (place stays “needs ranking”)
              </button>
            </div>
          </>
        ) : (
          <div className="py-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              Ranked in {state.answerCount} question{state.answerCount === 1 ? "" : "s"}
            </p>
            <h2 className="font-display mt-2 text-5xl font-semibold text-pine">
              #{state.position}
            </h2>
            <p className="mt-2 text-lg font-semibold">{pending.name}</p>
            <p className="mt-1 text-sm text-muted">
              {state.position === 1
                ? "New top pick of your Addis map."
                : state.totalRanked && state.position === state.totalRanked
                  ? "Straight onto the bottom of the list — worth a rematch later."
                  : "The list has spoken."}
              {state.totalRanked
                ? ` (${state.position} of ${state.totalRanked} been places)`
                : ""}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 rounded-full bg-pine px-6 py-2 text-sm font-semibold text-white hover:bg-pine-deep"
            >
              Back to the map
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ChoiceCard({
  name,
  cuisine,
  note,
  highlight,
  onPick,
}: {
  name: string;
  cuisine: string;
  note: string | undefined;
  highlight?: "new";
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={`flex min-h-40 flex-col rounded-xl border-2 p-3 text-left transition-transform hover:scale-[1.02] ${
        highlight === "new" ? "border-mustard bg-mustard-soft" : "border-pine bg-card"
      }`}
    >
      <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted">
        {highlight === "new" ? "the new place" : "current"}
      </span>
      <span className="font-display text-lg font-semibold leading-tight">{name}</span>
      <span className={`mt-1 w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        highlight === "new" ? "bg-mustard-deep/15 text-mustard-deep" : "bg-pine-soft text-pine"
      }`}>
        {cuisine}
      </span>
      {note && <span className="mt-2 line-clamp-4 text-xs text-muted">{note}</span>}
    </button>
  );
}
