import type { ProseDoc } from "@/lib/prose";
import { en } from "./en";
import { he } from "./he";
import { fr } from "./fr";
import { es } from "./es";

const BY_LOCALE: Record<string, ProseDoc> = { en, he, fr, es };

/** Falls back to English rather than 404ing on an unexpected locale. */
export function getAboutContent(locale: string): ProseDoc {
  return BY_LOCALE[locale] ?? en;
}
