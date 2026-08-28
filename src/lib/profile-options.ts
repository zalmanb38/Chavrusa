export const LANGUAGE_CODES = ["en", "he", "fr", "es"] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

// Values are stored in the DB verbatim and double as the `Topics.*` /
// `Profile.level*` / `Profile.pref*` translation keys. Order here is the
// order shown to users, so it is deliberate rather than alphabetical.
export const TOPIC_KEYS = [
  "chumash",
  "gemara",
  "chassidus",
  "mishnah",
  "tanya",
  "halacha",
  "rambam",
  "musar",
  "maamorim",
  "sichos",
  "novi",
  "shaarHabitachon",
  "chitas",
  "mesillasYesharim",
  "parsha",
  "other",
] as const;
export type TopicKey = (typeof TOPIC_KEYS)[number];

/** Paired with a free-text value in `profiles.topic_other`. */
export const OTHER_TOPIC: TopicKey = "other";

const TOPIC_KEY_SET = new Set<string>(TOPIC_KEYS);

/**
 * Topics are stored as plain strings, so a row written before the list
 * changed can hold a key that no longer exists. Translating one directly
 * throws, which would take down any page showing that profile — guard
 * every render path with this.
 */
export function isTopicKey(value: string): value is TopicKey {
  return TOPIC_KEY_SET.has(value);
}

export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type Level = (typeof LEVELS)[number];

export const PREFERENCES = ["remote", "in_person", "both"] as const;
export type Preference = (typeof PREFERENCES)[number];

// The first two are stages rather than ages: someone in beis medrash or
// kollel is telling you where they are up to, which is more use to a
// prospective chavrusa than the year they were born.
export const AGE_RANGES = [
  "beis_medrash", "kollel",
  "18-20", "21-23", "24-26", "27-30", "31-35", "36-40",
  "41-50", "51-60", "61-70", "71-80", "81+",
] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

export function isAgeRange(value: string): value is AgeRange {
  return (AGE_RANGES as readonly string[]).includes(value);
}

/**
 * Only the two named entries need translating; a numeric span reads the
 * same in every language and is shown exactly as stored.
 *
 * Deliberately tolerant of values that are no longer in the list. Ranges
 * have been re-bucketed once already, so a profile saved under an older
 * set still holds something like "26-30" — which is perfectly readable,
 * and printing it beats blanking a person's answer because the options
 * moved underneath them.
 */
const AGE_RANGE_MESSAGE_KEY: Record<string, string> = {
  beis_medrash: "ageRangeBeisMedrash",
  kollel: "ageRangeKollel",
};

export function ageRangeLabel(
  range: string,
  t: (key: string) => string,
): string {
  const key = AGE_RANGE_MESSAGE_KEY[range];
  return key ? t(key) : range;
}

/**
 * The language of the text itself, as distinct from the language two
 * people talk in. "original" means Hebrew/Aramaic as printed — someone
 * may want to learn Gemara in the original while discussing it in
 * English, which is why these are two separate fields.
 */
export const STUDY_LANGUAGE_CODES = [
  "original", "en", "he", "yi", "fr", "es",
] as const;
export type StudyLanguageCode = (typeof STUDY_LANGUAGE_CODES)[number];

export const FREQUENCIES = [
  "once_week", "twice_week", "three_week", "daily",
] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const TIMES_OF_DAY = [
  "morning", "afternoon", "evening", "flexible",
] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

/** Minutes, stored as strings so "" can mean "no preference". */
export const SESSION_LENGTHS = ["30", "45", "60", "90", "120"] as const;
export type SessionLength = (typeof SESSION_LENGTHS)[number];

/**
 * Format as it reads in a list, where there is no field label beside it.
 * "Both" is fine under a "Learning preference" heading and meaningless on
 * its own line.
 */
export const preferenceListKey: Record<Preference, string> = {
  remote: "prefRemoteList",
  in_person: "prefInPersonList",
  both: "prefBothList",
};

export const frequencyMessageKey: Record<Frequency, string> = {
  once_week: "freqOnceWeek",
  twice_week: "freqTwiceWeek",
  three_week: "freqThreeWeek",
  daily: "freqDaily",
};

export const timeOfDayMessageKey: Record<TimeOfDay, string> = {
  morning: "todMorning",
  afternoon: "todAfternoon",
  evening: "todEvening",
  flexible: "todFlexible",
};

/**
 * Fields a person may hide from their public profile. Hiding one removes
 * it from display AND from the matching filters — a filter that still
 * matched a hidden value would answer the question the toggle refused.
 *
 * Full name is not here on purpose: it's governed by the match-reveal
 * rule, which is a safety property rather than a preference.
 */
export const HIDEABLE_FIELDS = ["age_range"] as const;
export type HideableField = (typeof HIDEABLE_FIELDS)[number];

export function isHidden(
  profile: { hidden_fields?: string[] | null },
  field: HideableField,
): boolean {
  return (profile.hidden_fields ?? []).includes(field);
}

export interface Profile {
  id: string;
  /**
   * The PUBLIC display name — what Browse shows to everyone. The full
   * name lives in profile_names, which RLS reveals only to a matched
   * partner.
   */
  name: string;
  languages: LanguageCode[];
  topics: TopicKey[];
  topic_other: string;
  level: Level | null;
  city: string;
  country: string;
  region: string;
  neighborhood: string;
  meeting_spot: string;
  preference: Preference;
  availability: string;
  /** "" when the person would rather not say. */
  age_range: string;
  /** The language of the text; `languages` is the language they talk in. */
  study_languages: StudyLanguageCode[];
  frequency: string;
  time_of_day: string;
  session_length: string;
  /** Free text: what they're hoping to find in a partner. */
  blurb: string;
  /** Field names this person has chosen to keep off their public profile. */
  hidden_fields: string[];
  /** False while the public name is still the one derived at migration. */
  display_name_set: boolean;
  is_active: boolean;
}

/**
 * Turns a stored topic list into display labels, substituting the user's
 * own words for "Other" and dropping keys that are no longer offered.
 */
export function topicLabels(
  topics: string[] | null | undefined,
  topicOther: string | null | undefined,
  translate: (key: TopicKey) => string,
): string[] {
  return (topics ?? []).filter(isTopicKey).map((key) => {
    if (key === OTHER_TOPIC) {
      const custom = topicOther?.trim();
      return custom && custom.length > 0 ? custom : translate(key);
    }
    return translate(key);
  });
}

export const preferenceMessageKey: Record<Preference, string> = {
  remote: "prefRemote",
  in_person: "prefInPerson",
  both: "prefBoth",
};

export const levelMessageKey: Record<Level, string> = {
  beginner: "levelBeginner",
  intermediate: "levelIntermediate",
  advanced: "levelAdvanced",
};
