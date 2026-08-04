export const LANGUAGE_CODES = ["en", "he", "fr", "es"] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

// Values are stored in the DB verbatim and double as the `Topics.*` /
// `Profile.level*` / `Profile.pref*` translation keys.
export const TOPIC_KEYS = [
  "chumash",
  "gemara",
  "mishnah",
  "yadHachazakah",
  "musar",
  "halacha",
  "tanach",
  "hashkafa",
] as const;
export type TopicKey = (typeof TOPIC_KEYS)[number];

export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type Level = (typeof LEVELS)[number];

export const PREFERENCES = ["remote", "in_person", "both"] as const;
export type Preference = (typeof PREFERENCES)[number];

export interface Profile {
  id: string;
  name: string;
  languages: LanguageCode[];
  topics: TopicKey[];
  level: Level | null;
  city: string;
  preference: Preference;
  availability: string;
  is_active: boolean;
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
