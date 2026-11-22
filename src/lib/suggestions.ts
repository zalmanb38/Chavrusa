// Who to suggest to a member, and why.
//
// Everything here is pure: it takes the viewer's own profile and the same
// rows Browse already reads, and returns an ordered, grouped list with the
// overlaps spelled out. No database work and no new columns — a suggestion
// is a reading of profiles that already exist, so it can be recomputed on
// every request and never goes stale.
//
// The output carries the reasons, not just a number. The page's whole job
// is to say WHY two people line up, so the score and the overlap it was
// built from travel together and the UI cannot describe a fit the maths
// did not find.

import {
  LEVELS,
  FREQUENCIES,
  isTopicKey,
  type Level,
  type Profile,
  type TopicKey,
} from "@/lib/profile-options";
import { coordsOf, distanceKm, visibleAgeRange } from "@/lib/browse-filters";

/** The viewer's own row. Same columns Browse already selects. */
export type Viewer = Pick<
  Profile,
  | "id"
  | "topics"
  | "level"
  | "languages"
  | "study_languages"
  | "preference"
  | "frequency"
  | "time_of_day"
  | "session_length"
  | "age_range"
  | "hidden_fields"
  | "country"
  | "region"
  | "city"
  | "neighborhood"
>;

/**
 * The dimensions the strip under each name shows, in the order it shows
 * them. Subject first because the sections are built from it, then the
 * three things people actually ask each other, then place.
 */
export const FIT_DIMENSIONS = [
  "subject",
  "level",
  "when",
  "language",
  "place",
] as const;
export type FitDimension = (typeof FIT_DIMENSIONS)[number];

/**
 * One cell of the strip. `shared` false means the dimension was looked at
 * and the two do not line up — it is drawn as an empty cell rather than
 * left out, so every row has the same five columns and a gap is visible
 * as a gap. `values` are already-formatted display strings.
 */
export interface FitCell {
  dimension: FitDimension;
  shared: boolean;
  /** Message keys / raw values for the page to format; never prose. */
  values: FitValue[];
}

/**
 * What a cell holds, as data rather than text, so the server page can
 * translate it and the Hebrew side gets Hebrew without a second code
 * path.
 */
export type FitValue =
  | { kind: "topic"; topic: TopicKey }
  | { kind: "topicOther"; text: string }
  | { kind: "level"; level: Level }
  | { kind: "frequency"; frequency: string }
  | { kind: "timeOfDay"; timeOfDay: string }
  | { kind: "sessionLength"; minutes: number }
  | { kind: "language"; code: string }
  | { kind: "studyLanguage"; code: string }
  | { kind: "place"; text: string }
  | { kind: "remote" };

export type FitTier = "strong" | "good" | "possible";

export interface Suggestion {
  profile: Profile;
  /** Points earned, kept for ordering and for the explain panel. */
  score: number;
  /** Points that were assessable for this pair. */
  possible: number;
  tier: FitTier;
  cells: FitCell[];
  /** Every subject the two share, viewer's order. */
  sharedTopics: TopicKey[];
}

/** One subject's section on the page. */
export interface SuggestionGroup {
  topic: TopicKey;
  /** Shown, after the per-section cap. */
  suggestions: Suggestion[];
  /** How many share this subject in total, before the cap. */
  total: number;
}

export interface SuggestionResult {
  groups: SuggestionGroup[];
  /** Distinct people suggested, after every cap. */
  shown: number;
  /** People who share a subject but were held back by a cap. */
  heldBack: number;
}

/** Shown per subject before "see all" takes over. */
export const PER_TOPIC = 4;
/** Distinct people on the page, however many subjects the viewer lists. */
export const TOTAL_CAP = 20;

const levelIndex = (level: Level | null): number =>
  level ? LEVELS.indexOf(level) : -1;

const freqIndex = (value: string): number =>
  (FREQUENCIES as readonly string[]).indexOf(value);

function overlap<T>(a: readonly T[] | null, b: readonly T[] | null): T[] {
  if (!a || !b) return [];
  const set = new Set(b);
  return a.filter((value) => set.has(value));
}

/** True when the two could ever actually sit down together. */
function preferencesAgree(a: string, b: string): boolean {
  if (a === "both" || b === "both") return true;
  return a === b;
}

/** Both sides willing to meet in person, so place is worth scoring. */
function placeMatters(a: string, b: string): boolean {
  return a !== "remote" && b !== "remote";
}

interface Scored {
  score: number;
  possible: number;
  cells: FitCell[];
}

/**
 * The scoring model, in one place and deliberately readable: each
 * dimension contributes points out of a maximum, and the tier is the
 * share of the points that were *assessable* rather than of a fixed
 * total. A sparse profile is then rated on what it actually says instead
 * of being punished for the fields its owner left blank.
 */
function scorePair(
  viewer: Viewer,
  candidate: Profile,
  sharedTopics: TopicKey[],
): Scored {
  const cells: FitCell[] = [];
  let score = 0;
  let possible = 0;

  // ── Subject. The anchor: there is no suggestion without one.
  const subjectPoints = Math.min(6, 3 + (sharedTopics.length - 1));
  score += subjectPoints;
  possible += 6;
  cells.push({
    dimension: "subject",
    shared: true,
    values: sharedTopics.map((topic) =>
      topic === "other"
        ? ({ kind: "topicOther", text: candidate.topic_other || "" } as FitValue)
        : ({ kind: "topic", topic } as FitValue),
    ),
  });

  // ── Level. Same is worth most; one step apart still works, and often
  // well — the two directions of "I explain, you ask" are a real pairing.
  const vLevel = levelIndex(viewer.level);
  const cLevel = levelIndex(candidate.level);
  if (vLevel >= 0 && cLevel >= 0) {
    possible += 3;
    const gap = Math.abs(vLevel - cLevel);
    const points = gap === 0 ? 3 : gap === 1 ? 1 : 0;
    score += points;
    cells.push({
      dimension: "level",
      shared: points > 0,
      values:
        points > 0
          ? [{ kind: "level", level: candidate.level as Level }]
          : [],
    });
  } else {
    cells.push({ dimension: "level", shared: false, values: [] });
  }

  // ── When. Frequency, time of day and length together: this is the
  // thing that decides whether a pairing survives its second week.
  const whenValues: FitValue[] = [];
  let whenPoints = 0;
  let whenPossible = 0;

  if (viewer.frequency && candidate.frequency) {
    whenPossible += 2;
    const gap = Math.abs(
      freqIndex(viewer.frequency) - freqIndex(candidate.frequency),
    );
    if (gap === 0) {
      whenPoints += 2;
      whenValues.push({ kind: "frequency", frequency: candidate.frequency });
    } else if (gap === 1) {
      whenPoints += 1;
      whenValues.push({ kind: "frequency", frequency: candidate.frequency });
    }
  }

  if (viewer.time_of_day && candidate.time_of_day) {
    whenPossible += 2;
    const flexible =
      viewer.time_of_day === "flexible" || candidate.time_of_day === "flexible";
    if (viewer.time_of_day === candidate.time_of_day) {
      whenPoints += 2;
      whenValues.push({ kind: "timeOfDay", timeOfDay: candidate.time_of_day });
    } else if (flexible) {
      whenPoints += 1;
      whenValues.push({ kind: "timeOfDay", timeOfDay: candidate.time_of_day });
    }
  }

  if (viewer.session_length && candidate.session_length) {
    whenPossible += 1;
    if (viewer.session_length === candidate.session_length) {
      whenPoints += 1;
      whenValues.push({
        kind: "sessionLength",
        minutes: Number(candidate.session_length),
      });
    }
  }

  score += whenPoints;
  possible += whenPossible;
  cells.push({
    dimension: "when",
    shared: whenValues.length > 0,
    values: whenValues,
  });

  // ── Language. What they would talk in, and what the text is in.
  const languages = overlap(viewer.languages, candidate.languages);
  const studyLanguages = overlap(
    viewer.study_languages,
    candidate.study_languages,
  );
  const languageValues: FitValue[] = [
    ...languages.map((code) => ({ kind: "language", code }) as FitValue),
    ...studyLanguages.map(
      (code) => ({ kind: "studyLanguage", code }) as FitValue,
    ),
  ];
  if (
    (viewer.languages?.length ?? 0) > 0 &&
    (candidate.languages?.length ?? 0) > 0
  ) {
    possible += 2;
    if (languages.length > 0) score += 2;
  }
  if (
    (viewer.study_languages?.length ?? 0) > 0 &&
    (candidate.study_languages?.length ?? 0) > 0
  ) {
    possible += 1;
    if (studyLanguages.length > 0) score += 1;
  }
  cells.push({
    dimension: "language",
    shared: languageValues.length > 0,
    values: languageValues,
  });

  // ── Place. Only scored when both are open to meeting in person;
  // between two people learning remotely, a shared city says nothing
  // about the pairing and would quietly rank half the world lower.
  if (placeMatters(viewer.preference, candidate.preference)) {
    possible += 3;
    let placePoints = 0;
    const sameCountry =
      Boolean(viewer.country) && viewer.country === candidate.country;
    const sameRegion = sameCountry && viewer.region === candidate.region;
    const sameCity =
      sameCountry &&
      Boolean(viewer.city) &&
      viewer.city.toLowerCase() === (candidate.city ?? "").toLowerCase();
    const sameNeighborhood =
      sameCity &&
      Boolean(viewer.neighborhood) &&
      viewer.neighborhood.toLowerCase() ===
        (candidate.neighborhood ?? "").toLowerCase();

    let label = "";
    if (sameNeighborhood) {
      placePoints = 3;
      label = candidate.neighborhood;
    } else if (sameCity) {
      placePoints = 2;
      label = candidate.city;
    } else {
      // Not the same city, but near enough to meet: the coordinates we
      // already carry for the map answer this better than a region code.
      const a = coordsOf(viewer);
      const b = coordsOf(candidate);
      const km = a && b ? distanceKm(a, b) : null;
      if (km !== null && km <= 50) {
        placePoints = 2;
        label = candidate.city;
      } else if (sameRegion) {
        placePoints = 1;
        label = candidate.city || candidate.region;
      }
    }

    score += placePoints;
    cells.push({
      dimension: "place",
      shared: placePoints > 0,
      values: placePoints > 0 ? [{ kind: "place", text: label }] : [],
    });
  } else {
    // Both happy to learn remotely: the cell says so instead of sitting
    // empty, because "it does not matter" is not the same as "no".
    cells.push({
      dimension: "place",
      shared: true,
      values: [{ kind: "remote" }],
    });
  }

  // ── Nobody yet. A small nudge, not a dimension: somebody with no
  // chavrusa at all is the person a suggestion helps most, and without
  // this the list fills with the people who are already busiest.
  if (candidate.match_count === 0) {
    score += 1;
    possible += 1;
  }

  // Age is read but never shown: it decides nothing on its own and a
  // suggestion that explains itself by someone's age reads badly. A
  // shared bracket breaks a tie, and a hidden one is not looked at.
  const vAge = visibleAgeRange(viewer);
  const cAge = visibleAgeRange(candidate);
  if (vAge && cAge) {
    possible += 1;
    if (vAge === cAge) score += 1;
  }

  return { score, possible, cells };
}

function tierOf(score: number, possible: number): FitTier {
  const share = possible > 0 ? score / possible : 0;
  if (share >= 0.7) return "strong";
  if (share >= 0.45) return "good";
  return "possible";
}

/**
 * Builds the page.
 *
 * Hard rules first — no shared subject, no language in common, or one
 * person remote-only and the other in-person-only — because none of those
 * is a weak fit, it is a pairing that cannot happen. Everyone excluded
 * here is still on Browse, where the person can judge for themselves.
 */
export function buildSuggestions(
  viewer: Viewer,
  candidates: Profile[],
): SuggestionResult {
  const viewerTopics = (viewer.topics ?? []).filter(isTopicKey);
  if (viewerTopics.length === 0) {
    return { groups: [], shown: 0, heldBack: 0 };
  }

  const scored: Suggestion[] = [];
  for (const candidate of candidates) {
    if (candidate.id === viewer.id) continue;

    const sharedTopics = viewerTopics.filter((topic) =>
      (candidate.topics ?? []).includes(topic),
    );
    if (sharedTopics.length === 0) continue;

    if (!preferencesAgree(viewer.preference, candidate.preference)) continue;

    const bothNameLanguages =
      (viewer.languages?.length ?? 0) > 0 &&
      (candidate.languages?.length ?? 0) > 0;
    if (
      bothNameLanguages &&
      overlap(viewer.languages, candidate.languages).length === 0
    ) {
      continue;
    }

    const { score, possible, cells } = scorePair(
      viewer,
      candidate,
      sharedTopics,
    );
    scored.push({
      profile: candidate,
      score,
      possible,
      tier: tierOf(score, possible),
      cells,
      sharedTopics,
    });
  }

  // Strongest first, then whoever has no chavrusa yet, then by name so the
  // order is stable between two identical rows.
  scored.sort(
    (a, b) =>
      b.score / b.possible - a.score / a.possible ||
      b.score - a.score ||
      a.profile.match_count - b.profile.match_count ||
      a.profile.name.localeCompare(b.profile.name),
  );

  // One person, one section: whoever would appear under three subjects
  // appears under the first of them in the viewer's own list, which is
  // the order they put their subjects in. Repeating somebody three times
  // makes a short list look long.
  const placed = new Set<string>();
  const totals = new Map<TopicKey, number>();
  const byTopic = new Map<TopicKey, Suggestion[]>();

  for (const suggestion of scored) {
    for (const topic of suggestion.sharedTopics) {
      totals.set(topic, (totals.get(topic) ?? 0) + 1);
    }
    const home = viewerTopics.find((topic) =>
      suggestion.sharedTopics.includes(topic),
    );
    if (!home || placed.has(suggestion.profile.id)) continue;
    placed.add(suggestion.profile.id);
    const list = byTopic.get(home) ?? [];
    list.push(suggestion);
    byTopic.set(home, list);
  }

  let shown = 0;
  let heldBack = 0;
  const groups: SuggestionGroup[] = [];

  for (const topic of viewerTopics) {
    const list = byTopic.get(topic) ?? [];
    if (list.length === 0) continue;

    const room = Math.max(0, TOTAL_CAP - shown);
    const take = list.slice(0, Math.min(PER_TOPIC, room));
    heldBack += list.length - take.length;
    shown += take.length;
    if (take.length === 0) continue;

    groups.push({
      topic,
      suggestions: take,
      total: totals.get(topic) ?? take.length,
    });
  }

  return { groups, shown, heldBack };
}
