import { defineRouting } from "next-intl/routing";

export const locales = ["en", "he", "fr", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  he: "עברית",
  fr: "Français",
  es: "Español",
};

export const rtlLocales: readonly Locale[] = ["he"];

export function isRtl(locale: string): boolean {
  return (rtlLocales as readonly string[]).includes(locale);
}

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});
