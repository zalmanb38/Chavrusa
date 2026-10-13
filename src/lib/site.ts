/**
 * The canonical public origin. Auth redirects derive their origin from the
 * incoming request, so this is only for places with no request to read —
 * Open Graph tags, canonical links, and links inside outgoing email.
 */
export const SITE_URL = "https://chavrusalink.com";

export const SUPPORT_EMAIL = "info@chavrusalink.com";

/**
 * Where admin-only alerts go: a new report, a photo that needs manual
 * review, the daily signups/connections digest. Same address as
 * SUPPORT_EMAIL today, but kept as its own name rather than reusing that
 * constant directly — the inbox a stranger's contact-form message reaches
 * and the inbox that should page you about a safety report are different
 * concerns even when, for now, they happen to be the same mailbox.
 */
export const ADMIN_ALERT_EMAIL = "info@chavrusalink.com";
