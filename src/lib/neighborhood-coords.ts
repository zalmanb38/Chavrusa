// Neighborhood coordinates for the Browse map, one tier below CITY_COORDS.
//
// The neighborhood field on a profile is free text, not a dropdown, so the
// same place arrives spelled several ways — "Crown Heights", "crown
// heights", "Crown Heights, Brooklyn", "CH". This module is what turns
// that into a single point, and it only ever recognises what it has been
// taught: anything unmatched falls back to the city, exactly as before.
//
// The table is deliberately curated rather than geocoded, for the same
// reasons CITY_COORDS is. Precision is modest by design — a neighborhood
// marker still stands for a group, never a person, and the MIN_CLUSTER
// floor in browse-clusters.ts is what actually protects that.
//
// ADDING ENTRIES: build them from what people have really typed, not from
// a map of the city. The query that lists it:
//
//   select country, region, city, neighborhood, count(*)
//     from profiles
//    where coalesce(trim(neighborhood), '') <> ''
//    group by 1, 2, 3, 4
//    order by 1, 2, 3, count(*) desc;

import type { LatLng } from "@/lib/city-coords";

interface Neighborhood {
  /** Shown on the map and in the area heading. */
  label: string;
  coords: LatLng;
}

/** Normalized name -> place. Keys must already be normalized. */
type NeighborhoodTable = Record<string, Neighborhood>;

/**
 * Keyed by the same `COUNTRY-REGION:City` string CITY_COORDS uses, so a
 * neighborhood can only ever match within the city it belongs to —
 * "Midwood" in Brooklyn is not "Midwood" anywhere else.
 */
export const NEIGHBORHOOD_COORDS: Record<string, NeighborhoodTable> = {
  "US-NY:Brooklyn": {
    "crown heights": { label: "Crown Heights", coords: [40.6694, -73.9442] },
    "boro park": { label: "Boro Park", coords: [40.6334, -73.9938] },
    williamsburg: { label: "Williamsburg", coords: [40.7081, -73.9571] },
    flatbush: { label: "Flatbush", coords: [40.6415, -73.9594] },
    "east flatbush": { label: "East Flatbush", coords: [40.6509, -73.9308] },
    midwood: { label: "Midwood", coords: [40.6204, -73.9601] },
    kensington: { label: "Kensington", coords: [40.6418, -73.9735] },
    "marine park": { label: "Marine Park", coords: [40.6065, -73.929] },
    bensonhurst: { label: "Bensonhurst", coords: [40.6015, -73.9949] },
    gravesend: { label: "Gravesend", coords: [40.5918, -73.9757] },
    "sheepshead bay": { label: "Sheepshead Bay", coords: [40.5862, -73.9442] },
    canarsie: { label: "Canarsie", coords: [40.6403, -73.9065] },
    "park slope": { label: "Park Slope", coords: [40.671, -73.9814] },
    "prospect heights": { label: "Prospect Heights", coords: [40.6774, -73.9668] },
    "bedford stuyvesant": {
      label: "Bedford-Stuyvesant",
      coords: [40.6872, -73.9418],
    },
    "sunset park": { label: "Sunset Park", coords: [40.6455, -74.0122] },
    "brighton beach": { label: "Brighton Beach", coords: [40.578, -73.9596] },
  },
};

/**
 * Alias -> canonical key, per city. Both sides are normalized.
 *
 * Only what has actually been seen in the data belongs here. "CH" is in
 * because people really write it; the rest are the spelling variants the
 * same names arrive in.
 */
export const NEIGHBORHOOD_SYNONYMS: Record<string, Record<string, string>> = {
  "US-NY:Brooklyn": {
    ch: "crown heights",
    "crown hts": "crown heights",
    "borough park": "boro park",
    boropark: "boro park",
    bp: "boro park",
    "bedstuy": "bedford stuyvesant",
    "bed stuy": "bedford stuyvesant",
    wburg: "williamsburg",
    "south williamsburg": "williamsburg",
  },
};

/**
 * Lowercases, drops accents and punctuation, and collapses whitespace, so
 * "Crown Heights," and "crown  heights" are the same string. Separators
 * become spaces rather than vanishing, so "Bed-Stuy" reads as two words
 * instead of one.
 */
export function normalizeNeighborhood(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`".]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The place a free-text neighborhood refers to, or null.
 *
 * Trailing words are dropped one at a time when the whole string doesn't
 * match, which is what absorbs the qualifiers people append — "Crown
 * Heights Brooklyn", "Boro Park NY". It can only ever land on a name the
 * table already holds, so shortening cannot invent a match.
 */
export function neighborhoodFor(
  cityKey: string,
  raw: string | null | undefined,
): Neighborhood | null {
  const table = NEIGHBORHOOD_COORDS[cityKey];
  if (!table || !raw) return null;

  const synonyms = NEIGHBORHOOD_SYNONYMS[cityKey] ?? {};
  const words = normalizeNeighborhood(raw).split(" ").filter(Boolean);

  for (let end = words.length; end > 0; end--) {
    const candidate = words.slice(0, end).join(" ");
    const canonical = synonyms[candidate] ?? candidate;
    const hit = table[canonical];
    if (hit) return hit;
  }

  return null;
}
