# tastemap (working name)

Restaurant ranking for Addis Ababa that *never* asks for a score.

The itch: my friends and I keep arguing about "best traditional restaurant"
with no way to be honest about it. Stars are useless — everything decent
ends up at 4 and you can't tell your third-favorite kitfo spot from your
tenth. So: no ratings at all. A place earns its spot by answering quick
"which was better?" questions against things you already ranked
(binary insertion, ~⌈log₂(n+1)⌉ questions per place — need to verify the
math, but the sketch is in the notebook).

Today: repository is empty except notes. Nothing runs yet.

## The plan so far

- Ranked list + a real map of Addis (OpenStreetMap tiles, Leaflet — keyless
  because I'm not paying for a maps API on a side project)
- Add/edit places: name, location, cuisine, price tier (in birr), tags, note
- Been vs. want-to-try, two lists, pins color-coded
- Head-to-head ranking for the been places only
- Maybe accounts later; for now everything local

## Open questions

1. What happens on ties? (a dead-even pair should stay put until new
   evidence pushes one way — write this down properly later)
2. Where do coordinates come from without an API key? Nominatim probably,
   with a manual pin-drop fallback.
3. Can guest mode get the visitor interested without any account box
   standing in the way? Pre-loading the demo with real Addis places and a
   believable comparison history would show the whole flow in one open.

Notes live in the notebook; the city list (Yod Abyssinia, 2000 Habesha,
Castelli's, Tomoca, Kaldi's…) needs proper coordinates before any of this
works as a demo.
