// Turns a list of browsable profiles into map clusters.
//
// Nobody is ever plotted individually. A marker needs at least
// MIN_CLUSTER people behind it at every tier — neighborhood, city, state,
// country — and anything still under the floor is reported as a footer
// count instead of a marker. A dot over a town of one is a pin with extra
// steps, which is the thing this view exists to avoid.
//
// The tiers run downward as well as up. A neighborhood with enough people
// gets its own point; everyone else in that city stays on the city point,
// and a city below the floor rolls up to its state as before.
//
// Worth being clear about what this does and doesn't buy: the list view
// already shows each profile's city, so the floor isn't hiding anything a
// determined reader couldn't tally by hand. It's here so the map doesn't
// *visually* single out small communities.

import {
  CITY_COORDS,
  COUNTRY_CENTERS,
  coordKey,
  type LatLng,
} from "@/lib/city-coords";
import { neighborhoodFor } from "@/lib/neighborhood-coords";

export const MIN_CLUSTER = 3;

export interface ClusterInput {
  id: string;
  country: string | null;
  region: string | null;
  city: string | null;
  /** Free text. Matched against a curated table, or ignored. */
  neighborhood?: string | null;
}

export interface Cluster {
  id: string;
  lat: number;
  lng: number;
  count: number;
  kind: "neighborhood" | "city" | "region" | "country";
  country: string;
  region: string;
  city: string;
  /** Set only on a neighborhood cluster; the display label, not the key. */
  neighborhood: string;
  profileIds: string[];
}

export interface ClusterResult {
  clusters: Cluster[];
  /** Placeable, but in groups too small to draw even at country level. */
  belowFloorCount: number;
  /** No country set, or a free-text city we have no coordinates for. */
  unplacedCount: number;
}

/** Median rather than mean: one far-flung city shouldn't drag the centre. */
function centroid(points: LatLng[]): LatLng {
  const lat = points.map((p) => p[0]).sort((a, b) => a - b);
  const lng = points.map((p) => p[1]).sort((a, b) => a - b);
  const mid = points.length >> 1;
  return [lat[mid], lng[mid]];
}

export function buildClusters(profiles: ClusterInput[]): ClusterResult {
  // Bucket by exact city first — anything with coordinates we recognise.
  const cityBuckets = new Map<
    string,
    {
      coords: LatLng;
      country: string;
      region: string;
      city: string;
      members: { id: string; neighborhood: string | null }[];
    }
  >();
  let unplacedCount = 0;

  for (const p of profiles) {
    const country = p.country ?? "";
    const region = p.region ?? "";
    const city = p.city ?? "";
    const coords = country && city ? CITY_COORDS[coordKey(country, region, city)] : undefined;

    if (!coords) {
      unplacedCount++;
      continue;
    }
    const key = coordKey(country, region, city);
    const bucket = cityBuckets.get(key) ?? {
      coords,
      country,
      region,
      city,
      members: [],
    };
    bucket.members.push({ id: p.id, neighborhood: p.neighborhood ?? null });
    cityBuckets.set(key, bucket);
  }

  const clusters: Cluster[] = [];
  // Cities under the floor fall through to their region, and regions under
  // the floor fall through again to their country.
  const regionOverflow = new Map<
    string,
    { country: string; region: string; ids: string[]; points: LatLng[] }
  >();

  for (const [key, bucket] of cityBuckets) {
    // Split off any neighborhood that clears the floor on its own. The
    // rest of the city — people whose neighborhood is blank, unrecognised,
    // or in a group too small to draw — keeps the city point it had
    // before, so this tier can only ever add detail, never move anyone to
    // a place they didn't say.
    const neighborhoods = new Map<
      string,
      { label: string; coords: LatLng; ids: string[] }
    >();
    const cityIds: string[] = [];

    for (const member of bucket.members) {
      const hit = neighborhoodFor(key, member.neighborhood);
      if (!hit) {
        cityIds.push(member.id);
        continue;
      }
      const nb = neighborhoods.get(hit.label) ?? {
        label: hit.label,
        coords: hit.coords,
        ids: [],
      };
      nb.ids.push(member.id);
      neighborhoods.set(hit.label, nb);
    }

    // Splitting is only allowed to add detail, never to subtract people.
    // If pulling the neighborhoods out would strand a remainder too small
    // to draw, the whole city stays as one marker exactly as it was —
    // better a coarser map than one that shows fewer people than before.
    const plottable = [...neighborhoods.values()].filter(
      (nb) => nb.ids.length >= MIN_CLUSTER,
    );
    const remainder =
      cityIds.length +
      [...neighborhoods.values()]
        .filter((nb) => nb.ids.length < MIN_CLUSTER)
        .reduce((n, nb) => n + nb.ids.length, 0);

    const splitStrands = remainder > 0 && remainder < MIN_CLUSTER;

    for (const nb of splitStrands ? [] : plottable) {
      clusters.push({
        id: `nbhd:${key}:${nb.label}`,
        lat: nb.coords[0],
        lng: nb.coords[1],
        count: nb.ids.length,
        kind: "neighborhood",
        country: bucket.country,
        region: bucket.region,
        city: bucket.city,
        neighborhood: nb.label,
        profileIds: nb.ids,
      });
    }

    // Everyone not drawn at neighborhood level keeps the city point.
    const cityMembers = splitStrands
      ? bucket.members.map((m) => m.id)
      : [
          ...cityIds,
          ...[...neighborhoods.values()]
            .filter((nb) => nb.ids.length < MIN_CLUSTER)
            .flatMap((nb) => nb.ids),
        ];

    if (cityMembers.length === 0) continue;

    if (cityMembers.length >= MIN_CLUSTER) {
      clusters.push({
        id: key,
        lat: bucket.coords[0],
        lng: bucket.coords[1],
        count: cityMembers.length,
        kind: "city",
        country: bucket.country,
        region: bucket.region,
        city: bucket.city,
        neighborhood: "",
        profileIds: cityMembers,
      });
      continue;
    }
    const rk = `${bucket.country}-${bucket.region}`;
    const overflow = regionOverflow.get(rk) ?? {
      country: bucket.country,
      region: bucket.region,
      ids: [],
      points: [],
    };
    overflow.ids.push(...cityMembers);
    overflow.points.push(bucket.coords);
    regionOverflow.set(rk, overflow);
  }

  const countryOverflow = new Map<
    string,
    { country: string; ids: string[]; points: LatLng[] }
  >();

  for (const [rk, overflow] of regionOverflow) {
    if (overflow.ids.length >= MIN_CLUSTER) {
      const [lat, lng] = centroid(overflow.points);
      clusters.push({
        id: `region:${rk}`,
        lat,
        lng,
        count: overflow.ids.length,
        kind: "region",
        country: overflow.country,
        region: overflow.region,
        city: "",
        neighborhood: "",
        profileIds: overflow.ids,
      });
      continue;
    }
    const co = countryOverflow.get(overflow.country) ?? {
      country: overflow.country,
      ids: [],
      points: [],
    };
    co.ids.push(...overflow.ids);
    co.points.push(...overflow.points);
    countryOverflow.set(overflow.country, co);
  }

  let belowFloorCount = 0;

  for (const [country, overflow] of countryOverflow) {
    if (overflow.ids.length >= MIN_CLUSTER) {
      const [lat, lng] = COUNTRY_CENTERS[country] ?? centroid(overflow.points);
      clusters.push({
        id: `country:${country}`,
        lat,
        lng,
        count: overflow.ids.length,
        kind: "country",
        country,
        region: "",
        city: "",
        neighborhood: "",
        profileIds: overflow.ids,
      });
      continue;
    }
    belowFloorCount += overflow.ids.length;
  }

  clusters.sort((a, b) => b.count - a.count);
  return { clusters, belowFloorCount, unplacedCount };
}

/**
 * Area tracks headcount, so radius tracks its square root — sizing by
 * radius directly would make nine people look nine times three rather
 * than three times.
 */
export function markerRadius(count: number): number {
  return Math.min(38, Math.max(11, Math.sqrt(count) * 7));
}
