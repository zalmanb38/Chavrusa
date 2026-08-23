import type { LegalContent } from "@/lib/legal";
import { en } from "./en";
import { he } from "./he";
import { fr } from "./fr";
import { es } from "./es";

const BY_LOCALE: Record<string, LegalContent> = { en, he, fr, es };

/** Falls back to English rather than 404ing on an unexpected locale. */
export function getLegalContent(locale: string): LegalContent {
  return BY_LOCALE[locale] ?? en;
}
