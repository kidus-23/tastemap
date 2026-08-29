# Design challenges — our product decisions

The challenge leaves three features unspecified. These are ours.

## 1. The ranking experience

**Decision: binary-insertion comparisons, chain-derived rank, visible honesty.**

- A新建 "been" place enters a comparison flow against the current ranked list, chicken-and-egg style: first vs. the median place, then vs. the median of the half it lost the first comparison to, and so on. That's ⌈log₂(n)⌉ questions (12 ranked places → about 4).
- Each answer is stored as a raw `Comparison` row. Rank is **derived from the chain of stored comparisons**, never recomputed from hidden math — so the list shows like a tally: "beat Yod on 12 Aug" appears under the place's stats.
- If two places are dead even (mutual + common comparisons can't separate them), their tie is displayed honestly: ranks like **7= and 7=** with a "settle it" button that queues a direct comparison between the two.
- If the user bails mid-flow, the place is **pending rank** — it appears on the map and lists with a mustard "needs ranking" pill, and re-entering continues where it left off (already-answered questions are not repeated).
- Confidence: a place carries a `settled` count; the list shows how deep the support for position is only when it's weak (e.g., "only 2 comparisons so far").

## 2. The "where should we eat?" moment

**Decision: a "Surprise me" shuffle over the current filtered set, with the reason spelled out.**

- The button lives in the panel header. It picks a place from **whatever currently passes your filters** — that's intentional: "vegan-friendly, under 300 Br, want to try" is a decision already half-made.
- On press: a short shuffle animation across the panel, the map flies to the winner, detail opens, and the reason line reads, e.g., "*picked from your 6 want-to-try places under 300 birr matching 'Ethiopian'.*"
- If the filtered set is empty, the button flips to a coach mark instead of picking garbage.
- No reroll spinners; a small "again" link is enough.

## 3. Map and list together

**Decision: one shared selection state, spatial anchor on desktop, tabbed parity on mobile.**

- Desktop: fixed split — ranked panel left, map right. A selected place is highlighted in both at once: its pin pops to a raised "active" state and the map pans to it, its list card scrolls into view.
  - Pin click → select in list (scroll, highlight).
  - List hover (desktop only) → temporary pulse on the pin.
  - List click → select, pan, open detail.
- Mobile: the map and the list are two tabs. Selecting in either switches tabs *only* when the interaction obviously needs it (pin → detail sheet; list item → stays in list, pin pulses on the map tab). The "map" tab shows a floating mini-bubble of the selected place so context never drops.
- Filters are global: they live above both views and apply to pins and list cards simultaneously.
