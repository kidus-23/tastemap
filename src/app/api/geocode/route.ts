import { NextResponse } from "next/server";

// Keyless Nominatim geocoding proxy. Kept server-side so we can send a
// proper User-Agent as the usage policy requires; the client debounces
// to at most one request per 700 ms on typing.

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 3) return NextResponse.json({ results: [] });

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "6");
  // bias towards Addis Ababa without excluding anything else
  url.searchParams.set("viewbox", "38.63,9.09,38.90,8.95");
  url.searchParams.set("bounded", "0");

  const res = await fetch(url, {
    headers: {
      "User-Agent": "AddisTasteDemo/1.0 (local development; not for production traffic)",
      Accept: "application/json",
      "Accept-Language": "en",
    },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ results: [] });

  type NominatimResult = {
    lat: string;
    lon: string;
    display_name: string;
    name?: string;
    type?: string;
  };
  const data = (await res.json()) as NominatimResult[];
  return NextResponse.json({
    results: data.map((r) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      label: r.display_name,
      name: r.name || r.display_name.split(",")[0],
    })),
  });
}
