// Legal documents are prose pages with one extra requirement: a named
// authoritative language, so a translation slip can't change what
// somebody agreed to.

import type { ProseBlock, ProseDoc } from "@/lib/prose";

export type LegalBlock = ProseBlock;

/** Legal documents always carry a revision date, unlike prose generally. */
export interface LegalDoc extends ProseDoc {
  lastUpdated: string;
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

export { splitBold } from "@/lib/prose";
