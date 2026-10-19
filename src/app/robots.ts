import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Signed-in-only pages and anything with a token in the URL (reset-password,
// forgot-password) aren't useful to index and shouldn't end up cached by a
// crawler. The locale prefix is a wildcard (/*/admin) so one rule covers all
// four languages instead of four.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/*/admin",
        "/*/profile",
        "/*/requests",
        "/*/matches",
        "/*/reset-password",
        "/*/forgot-password",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
