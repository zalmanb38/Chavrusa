// Legal documents live here rather than in messages/*.json: they're
// long-form prose, not interface strings, and mixing them in would bloat
// the translation files past the point of being reviewable.

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] };

export interface LegalDoc {
  title: string;
  /** Already formatted for the locale — these are prose, not dates to parse. */
  lastUpdated: string;
  blocks: LegalBlock[];
}

export interface LegalContent {
  privacy: LegalDoc;
  terms: LegalDoc;
  /**
   * Shown above translated documents. Standard practice for multilingual
   * terms: a translation slip shouldn't be able to change what someone
   * agreed to, so one language is named as authoritative. Absent for en.
   */
  translationNote?: string;
}

/**
 * Splits `**bold**` runs out of a string so the renderer can emit <strong>
 * without dangerouslySetInnerHTML. Odd indices are the emphasised parts.
 */
export function splitBold(text: string): string[] {
  return text.split("**");
}
