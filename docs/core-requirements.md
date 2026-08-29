# Core requirements — Tastemap (Addis Ababa edition)

Tiers: **Core** (required) and **Stretch** (recommended). Adapted from the challenge's spec; acceptance criteria assume the Addis Ababa seed city.

## Core

### C1. Places CRUD
Logged-in users and guests can add, edit, and delete places.
Each place carries: name, location (lat/lng or geocoded via Nominatim search), cuisine, price tier (`$` under 150 Br, `$$` 150–500 Br, `$$$` 500+ Br), tags, note, status (`been` or `want-to-try`), optional visit count.
**Accepts:** create → place appears in list and map immediately; edit → both views update; delete → pin leaves map and list, comparisons involving it are cleaned up.

### C2. Interactive map with pins and clustering
Free OpenStreetMap tiles via Leaflet (no API key). Every place is a pin; heavy clusters expand on click. `been` pins are numbered by rank and dark green; `want-to-try` pins are mustard and unnumbered. Pins are keyboard-activatable and have readable labels.
**Accepts:** qualifying map loads zoomed to Addis Ababa (~9.02 N, 38.75 E); pins differ visually by status; number = current rank.

### C3. Head-to-head ranking instead of stars
Adding a `been` place triggers the comparison flow vs. existing ranked places (~⌈log₂(n)⌉ questions). Comparisons are stored as data. The rank list is derived from them.
**Accepts:** new place needs only a handful of questions to slot in; no user can see a star input anywhere; canceling mid-flow leaves the place "pending rank" with a visible "settle it" affordance.

### C4. Ranked list + want-to-try list
Two tabs in the side panel: **Ranked** (the ordered `been` list; #1 wears a `TOP PICK` badge) and **Want to try** (the `want-to-try` list, ordered newest-first).
**Accepts:** switching tabs reliabeltly refetches and the filter row still applies; counts shown per tab.

### C5. Search & filter driving both views at once
One filter row: text search (name), cuisine pills, price tier, status, tag. Whatever survives the filter is on the map and in the list simultaneously.
**Accepts:** filtering to "Ethiopian" dims/removes other pins and filters the list in the same interaction; clearing restores.

### C6. Detail view for any place
Opened from a pin or a list card. Shows everything the record holds, plus rank, comparison stats (wins/losses), and edit/delete actions (owner only).
**Accepts:** detail state is shareable in-place (map flies to pin, list scrolls to card).

### C7. Guest mode + accounts
Landing page has **Try as guest** (pre-loaded Addis Ababa dataset with 12 ranked places and prior comparisons: guests get full CRUD, persisted to localStorage — never touching the DB) and signup login (server sessions, rows in Postgres).
**Accepts:** guest data never reaches the database; signup converts nothing silently — starting an account starts an empty (or importable) map.

### C8. Responsive layout
Desktop: list panel left (~38%), full-bleed map right. Mobile: the two views become tabs (with the map always within one tap), the comparison flow, detail sheet and add-form render as bottom sheets.
**Accepts:** no horizontal scroll at 360 px width; comparison flow usable with one thumb.

## Stretch

### S1. Surprise me ("Where should we eat?")
One button picks from the currently filtered set with a light shuffle animation, snaps the map, opens the detail, and explains why it was picked.

### S2. Shareable top-10
A public read-only page with the ranked top-10 of one user's map.

### S3. Import/export
JSON export of all places + comparisons; import merges into an existing account (the escape hatch for "guest built a real map, then made an account").
