import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { locales, defaultLocale, type Locale } from "@/i18n/routing";

// Only the pages a signed-out visitor can actually reach belong here:
// /admin, /profile, /requests, /matches all require a session, and
// /forgot-password and /reset-password carry a token in the URL rather
// than being a page worth indexing on its own.
const PUBLIC_PATHS = ["", "/browse", "/about", "/contact", "/login", "/signup", "/privacy", "/terms"];

function localizedPath(locale: Locale, path: string) {
  // Every locale carries its prefix, English included: routing.ts sets
  // localePrefix: "always", so /browse answers 307 to /en/browse. Listing
  // the unprefixed form would fill the sitemap with redirects, which
  // Search Console reports as "Page with redirect" and which make the
  // crawler resolve a canonical we could simply have given it.
  return `${SITE_URL}/${locale}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: localizedPath(defaultLocale, path),
    lastModified: new Date(),
    alternates: {
      languages: Object.fromEntries(locales.map((locale) => [locale, localizedPath(locale, path)])),
    },
  }));
}
