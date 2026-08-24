// Long-form pages — legal documents, About — live in TypeScript modules
// rather than messages/*.json. They're prose, not interface strings, and
// mixing them in would bloat the translation files past the point of
// being reviewable.

export type ProseBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] };

export interface ProseDoc {
  title: string;
  /**
   * Already formatted for the locale — prose, not a date to parse.
   * Absent on pages where a revision date means nothing, like About.
   */
  lastUpdated?: string;
  blocks: ProseBlock[];
}

/**
 * Splits `**bold**` runs out of a string so the renderer can emit <strong>
 * without dangerouslySetInnerHTML. Odd indices are the emphasised parts.
 */
export function splitBold(text: string): string[] {
  return text.split("**");
}
