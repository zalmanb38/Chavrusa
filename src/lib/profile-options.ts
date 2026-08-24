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

export interface Profile {
  id: string;
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
