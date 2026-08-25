// One definition of "who matches these filters", used once per request.
//
// The list and the map are two renderings of a single filtered array, so
// they cannot disagree by construction — there is no second query to keep
// in step. This module exists so that stays true as filters are added:
// anything new goes in here, not into one view.
//
// Filtering happens in two passes because it has to. Most of it is a
// database query. Proximity isn't: city coordinates are static data in
// the app, not columns in Postgres, so distance is computed here over the
// rows the query returned. Both passes run before either view renders.

import { CITY_COORDS, coordKey, type LatLng } from "@/lib/city-coords";
import { isHidden, type Profile } from "@/lib/profile-options";

export interface BrowseFilters {
  language?: string;
  studyLanguage?: string;
  topic?: string;
  country?: string;
  region?: string;
  city?: string;
  near?: string;
  /** Repeatable: several ranges widen the search rather than narrowing it. */
  age?: string | string[];
  frequency?: string;
  timeOfDay?: string;
  sessionLength?: string;
  q?: string;
  preference?: string;
  view?: string;
}

/**
 * A checkbox group submits one parameter per box, so a filter that allows
 * several values arrives as a string, an array, or nothing at all.
 */
export function toValues(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
}

// Distance is always stored in kilometres, whatever the viewer sees.
// One canonical unit means the maths has no conversions in it and a
// shared Browse link means the same thing to whoever opens it — a US
// reader just sees that same distance labelled in miles.
export const MILES_TO_KM = 1.609344;

const PROXIMITY_KM = [25, 50, 100, 250, 500] as const;
const PROXIMITY_MILES = [10, 25, 50, 100, 250] as const;

export interface ProximityOption {
  /** Kilometres — what goes in the URL. */
  value: string;
  /** The number to show, in whichever unit the viewer reads. */
  amount: number;
}

/**
 * Miles for the US and the UK — both measure road distance that way —
 * and kilometres everywhere else.
 */
const MILE_COUNTRIES = new Set(["US", "GB"]);

export function usesMiles(country: string | null | undefined): boolean {
  return country ? MILE_COUNTRIES.has(country) : false;
}

export function proximityOptions(
  country: string | null | undefined,
  current?: string,
): { unit: "mi" | "km"; options: ProximityOption[] } {
  const unit = usesMiles(country) ? "mi" : "km";
  const options: ProximityOption[] =
    unit === "mi"
      ? PROXIMITY_MILES.map((miles) => ({
          value: String(Math.round(miles * MILES_TO_KM)),
          amount: miles,
        }))
      : PROXIMITY_KM.map((km) => ({ value: String(km), amount: km }));

  // A link shared by someone whose unit differs carries a distance that
  // isn't on this list. Keep it as an option rather than letting the
  // control read "Any" while a filter is quietly applied.
  if (current && !options.some((o) => o.value === current)) {
    const km = Number(current);
    if (Number.isFinite(km) && km > 0) {
      return {
        unit,
        options: [
          { value: current, amount: unit === "mi" ? Math.round(km / MILES_TO_KM) : km },
          ...options,
        ],
      };
    }
  }

  return { unit, options };
}

export const PROFILE_COLUMNS =
  "id, name, languages, study_languages, topics, topic_other, level, city, " +
  "country, region, neighborhood, meeting_spot, preference, availability, " +
  "age_range, frequency, time_of_day, session_length, blurb, hidden_fields, " +
  "is_active";

/**
 * The chainable subset of the Supabase query builder this module uses.
 * Declared structurally so the accumulation below stays type-checked
 * without importing the builder's full generic signature.
 */
interface FilterableQuery<Self> {
  eq(column: string, value: unknown): Self;
  in(column: string, values: unknown[]): Self;
  ilike(column: string, pattern: string): Self;
  contains(column: string, value: unknown): Self;
  not(column: string, operator: string, value: unknown): Self;
}

/**
 * Everything Postgres can answer. Only phone-verified, active, unblocked
 * profiles are discoverable — see the safety note in the Browse page.
 */
export function applyQueryFilters<T extends FilterableQuery<T>>(
  query: T,
  filters: BrowseFilters,
): T {
  let q = query;

  if (filters.language) q = q.contains("languages", [filters.language]);
  if (filters.studyLanguage) {
    q = q.contains("study_languages", [filters.studyLanguage]);
  }
  if (filters.topic) q = q.contains("topics", [filters.topic]);

  // Country and region come from fixed lists so they match exactly. City
  // can also be free text where the curated list didn't cover someone, so
  // it stays a partial match.
  if (filters.country) q = q.eq("country", filters.country);
  if (filters.region) q = q.eq("region", filters.region);
  if (filters.city) q = q.ilike("city", `%${filters.city}%`);

  // A hidden field must not be filterable: matching on a value someone
  // chose to hide would answer the very question the toggle refused.
  const ages = toValues(filters.age);
  if (ages.length > 0) {
    q = q.in("age_range", ages).not("hidden_fields", "cs", "{age_range}");
  }

  if (filters.frequency) q = q.eq("frequency", filters.frequency);
  if (filters.timeOfDay) q = q.eq("time_of_day", filters.timeOfDay);
  if (filters.sessionLength) q = q.eq("session_length", filters.sessionLength);
  if (filters.q) q = q.ilike("blurb", `%${filters.q}%`);

  if (filters.preference === "remote" || filters.preference === "in_person") {
    q = q.in("preference", [filters.preference, "both"]);
  }

  return q;
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function coordsOf(profile: {
  country?: string | null;
  region?: string | null;
  city?: string | null;
}): LatLng | null {
  if (!profile.country || !profile.city) return null;
  return (
    CITY_COORDS[
      coordKey(profile.country, profile.region ?? "", profile.city)
    ] ?? null
  );
}

/**
 * The pass the database can't do: distance from the viewer's own city.
 *
 * Someone whose city we have no coordinates for is dropped from a
 * proximity search rather than kept — "near me" that silently includes
 * unplaceable people isn't answering the question either.
 */
export interface LocalFilterResult {
  profiles: Profile[];
  /**
   * How many were dropped for having no placeable city. Surfaced rather
   * than swallowed: a proximity search that quietly discards people looks
   * identical to one that found nobody.
   */
  unplaceableExcluded: number;
}

export function applyLocalFilters(
  profiles: Profile[],
  filters: BrowseFilters,
  viewerCoords: LatLng | null,
): LocalFilterResult {
  const radius = filters.near ? Number(filters.near) : 0;
  if (!radius || !viewerCoords) {
    return { profiles, unplaceableExcluded: 0 };
  }

  let unplaceableExcluded = 0;
  const kept = profiles.filter((profile) => {
    const coords = coordsOf(profile);
    if (coords === null) {
      unplaceableExcluded++;
      return false;
    }
    return distanceKm(viewerCoords, coords) <= radius;
  });

  return { profiles: kept, unplaceableExcluded };
}

/**
 * The filters kept behind "more filters". Counting them drives both the
 * badge and whether the section starts open — an applied filter should
 * never be hidden inside a closed panel.
 */
export const ADVANCED_FILTER_KEYS = [
  "studyLanguage",
  "age",
  "frequency",
  "timeOfDay",
  "sessionLength",
  "near",
] as const satisfies readonly (keyof BrowseFilters)[];

export function countAdvancedFilters(filters: BrowseFilters): number {
  // An empty array is truthy, so multi-value filters need counting by
  // their contents rather than by whether the key is present.
  return ADVANCED_FILTER_KEYS.filter((key) => toValues(filters[key]).length > 0)
    .length;
}

/** Age is shown only when its owner hasn't hidden it. */
export function visibleAgeRange(profile: {
  age_range: string;
  hidden_fields?: string[] | null;
}): string {
  return isHidden(profile, "age_range") ? "" : profile.age_range;
}


/** One removable chip in the "Filtering by" row above the results. */
export interface FilterChip {
  key: string;
  value: string;
  label: string;
  /** The same query with this one filter dropped — the chip's "×" target. */
  without: Record<string, string | string[]>;
}

/**
 * Turns the active filters into chips.
 *
 * Every filter that narrows the results gets one, so the row is a true
 * account of why a result set looks the way it does — which matters most
 * when it looks emptier than expected. `view` is excluded: it changes how
 * results are drawn, not which ones there are.
 */
export function activeFilterChips(
  filters: BrowseFilters,
  labellers: Partial<Record<keyof BrowseFilters, (value: string) => string>>,
): FilterChip[] {
  const chips: FilterChip[] = [];

  for (const [key, raw] of Object.entries(filters)) {
    if (key === "view" || !raw) continue;

    const values = toValues(raw as string | string[]);
    for (const value of values) {
      const label =
        labellers[key as keyof BrowseFilters]?.(value) ?? value;

      // Dropping one value of a multi-value filter leaves the rest in place.
      const remaining = values.filter((v) => v !== value);
      const without: Record<string, string | string[]> = {};
      for (const [k, v] of Object.entries(filters)) {
        if (!v) continue;
        if (k === key) {
          if (remaining.length > 0) without[k] = remaining;
        } else {
          without[k] = v as string | string[];
        }
      }

      chips.push({ key, value, label, without });
    }
  }

  return chips;
}
