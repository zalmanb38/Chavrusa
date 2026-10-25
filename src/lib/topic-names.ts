import {
  OTHER_TOPIC,
  isTopicKey,
  type TopicKey,
} from "@/lib/profile-options";
// Subject names are proper nouns, so a person scanning the site wants the
// Hebrew and the transliteration together whatever language the rest of
// the page is in. Both names are read straight out of the message
// catalogues rather than kept in a second list here, so the names stay in
// one place. Importing the catalogues (instead of translating through
// `useTranslations`) is what lets a Client Component show a locale other
// than the one it is rendering in.
import enMessages from "../../messages/en.json";
import heMessages from "../../messages/he.json";

const EN = enMessages.Topics as Record<TopicKey, string>;
const HE = heMessages.Topics as Record<TopicKey, string>;

export function topicNameEn(key: TopicKey): string {
  return EN[key];
}

export function topicNameHe(key: TopicKey): string {
  return HE[key];
}

/**
 * Both names of a subject, side by side, with the page's own direction
 * first so the pair reads outward from the text it sits in rather than
 * being reordered by the bidi algorithm.
 */
export function topicName(key: TopicKey, locale: string): string {
  return locale === "he"
    ? `${HE[key]} · ${EN[key]}`
    : `${EN[key]} · ${HE[key]}`;
}

/**
 * Turns a stored topic list into display labels, substituting the user's
 * own words for "Other" and dropping keys that are no longer offered.
 */
export function topicLabels(
  topics: string[] | null | undefined,
  topicOther: string | null | undefined,
  locale: string,
): string[] {
  return (topics ?? []).filter(isTopicKey).map((key) => {
    if (key === OTHER_TOPIC) {
      const custom = topicOther?.trim();
      return custom && custom.length > 0 ? custom : topicName(key, locale);
    }
    return topicName(key, locale);
  });
}
