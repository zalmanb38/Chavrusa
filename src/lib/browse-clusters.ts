// Turns a list of browsable profiles into map clusters.
//
// Nobody is ever plotted individually. A city marker needs at least
// MIN_CLUSTER people behind it; below that the profiles roll up to their
// state, then to their country, and anything still under the floor is
// reported as a footer count instead of a marker. A dot over a town of
// one is a pin with extra steps, which is the thing this view exists to
// avoid.
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

export const MIN_CLUSTER = 3;

export interface ClusterInput {
  id: string;
  country: string | null;
  region: string | null;
  city: string | null;
}

export interface Cluster {
  id: string;
  lat: number;
  lng: number;
  count: number;
  kind: "city" | "region" | "country";
  country: string;
  region: string;
  city: string;
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
    { coords: LatLng; country: string; region: string; city: string; ids: string[] }
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
      ids: [],
    };
    bucket.ids.push(p.id);
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
    if (bucket.ids.length >= MIN_CLUSTER) {
      clusters.push({
        id: key,
        lat: bucket.coords[0],
        lng: bucket.coords[1],
        count: bucket.ids.length,
        kind: "city",
        country: bucket.country,
        region: bucket.region,
        city: bucket.city,
        profileIds: bucket.ids,
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
    overflow.ids.push(...bucket.ids);
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
