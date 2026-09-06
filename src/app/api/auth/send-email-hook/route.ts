import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { sendEmail } from "@/lib/email";
import {
  renderEmailHtml,
  renderEmailText,
  type EmailContent,
} from "@/lib/email-template";

/**
 * Supabase's Send Email hook: every authentication email the platform
 * would otherwise send itself arrives here instead, so confirmations and
 * password resets look like the rest of the site's mail rather than
 * Supabase's defaults.
 *
 * Supabase calls this directly, with no user session — the signature is
 * the only thing that says the request is genuine, so an unverified body
 * is never read, let alone acted on.
 */

// Anything outside this list is accepted and dropped. Supabase can start
// sending action types we have no copy for (reauthentication, the various
// *_notification kinds), and answering 200 lets it consider those
// delivered instead of retrying a hook that will never handle them.
const HANDLED = ["signup", "recovery", "email_change"] as const;
type HandledAction = (typeof HANDLED)[number];

interface HookUser {
  email?: string | null;
  new_email?: string | null;
  user_metadata?: { locale?: string | null } | null;
}

interface HookEmailData {
  token?: string;
  token_hash?: string;
  token_new?: string;
  token_hash_new?: string;
  redirect_to?: string;
  email_action_type?: string;
  site_url?: string;
}

interface HookPayload {
  user?: HookUser;
  email_data?: HookEmailData;
}

/** Which of the four messages a single delivery is. */
type MessageKind = "signup" | "recovery" | "emailChangeCurrent" | "emailChangeNew";

interface Delivery {
  to: string;
  tokenHash: string;
  kind: MessageKind;
}

/**
 * Supabase's own verify endpoint, which consumes the token and then
 * redirects to `redirect_to` — the existing /auth/callback route, which
 * needs no changes because it still receives exactly what it did before.
 *
 * Built through URL rather than string concatenation: redirect_to carries
 * a query string of its own, and pasting that into a query string
 * unencoded would truncate it at its first ampersand.
 */
function verifyUrl(tokenHash: string, type: string, redirectTo: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");

  const url = new URL("/auth/v1/verify", base);
  url.searchParams.set("token", tokenHash);
  url.searchParams.set("type", type);
  url.searchParams.set("redirect_to", redirectTo);
  return url.toString();
}

/**
 * Supabase hands the secret over as `v1,whsec_<base64>`. The library
 * strips a `whsec_` prefix itself but knows nothing about the `v1,`, so
 * that part comes off here.
 */
function hookSecret(): string {
  const raw = process.env.SUPABASE_SEND_EMAIL_HOOK_SECRET;
  if (!raw) throw new Error("SUPABASE_SEND_EMAIL_HOOK_SECRET is not configured");
  return raw.replace(/^v1,/, "");
}

export async function POST(request: Request) {
  // The raw text, not request.json(): the signature is over the exact
  // bytes sent, and a parse-and-restringify round trip does not reliably
  // reproduce them.
  const body = await request.text();

  let payload: HookPayload;
  try {
    const headers = Object.fromEntries(request.headers.entries());
    payload = new Webhook(hookSecret()).verify(body, headers) as HookPayload;
  } catch (error) {
    // Deliberately terse: an attacker probing this endpoint learns only
    // that it rejected them, and the detail goes to the log instead.
    console.error("send-email-hook: signature verification failed", error);
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const user = payload.user;
  const data = payload.email_data;
  const action = data?.email_action_type;

  if (!user || !data || !action) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (!(HANDLED as readonly string[]).includes(action)) {
    return NextResponse.json({ skipped: action });
  }

  const type = action as HandledAction;
  const redirectTo = data.redirect_to || data.site_url;

  if (!redirectTo) {
    console.error(`send-email-hook: ${type} arrived with no redirect target`);
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const deliveries = planDeliveries(type, user, data);

  if (deliveries.length === 0) {
    console.error(`send-email-hook: ${type} produced no deliverable address`);
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const locale = preferredLocale(user);
  const t = await getTranslations({ locale, namespace: "AuthEmail" });

  for (const delivery of deliveries) {
    const content = buildContent(delivery, t, {
      currentEmail: user.email ?? "",
      newEmail: user.new_email ?? "",
      url: verifyUrl(delivery.tokenHash, type, redirectTo),
    });

    const result = await sendEmail({
      to: delivery.to,
      subject: t(`${delivery.kind}Subject`),
      text: renderEmailText(content, locale),
      html: renderEmailHtml(content, locale),
    });

    if (!result.sent) {
      // Unlike the notification emails, this one is the whole action: a
      // confirmation that never arrives leaves someone locked out with
      // nothing to retry. Failing the hook surfaces it at the point the
      // person is still standing there, and lets Supabase retry.
      console.error(
        `send-email-hook: ${delivery.kind} not sent (${result.reason})`,
      );
      return NextResponse.json({ error: "send_failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ sent: deliveries.length });
}

/**
 * Who gets an email, and which token goes to them.
 *
 * The email_change mapping is reversed from what the field names suggest,
 * and Supabase's own documentation says so — the names were kept for
 * backward compatibility. `token_hash_new` is the token for the CURRENT
 * address; `token_hash` is the token for the NEW one. Getting this the
 * intuitive way round sends each person the other's link, which is why it
 * is spelled out here rather than left to the reader.
 *
 * Both hashes present is the signal that "Secure email change" is on and
 * two emails are wanted. With it off, Supabase populates one pair and
 * only the new address is written to.
 */
function planDeliveries(
  type: HandledAction,
  user: HookUser,
  data: HookEmailData,
): Delivery[] {
  const current = user.email?.trim() ?? "";
  const next = user.new_email?.trim() ?? "";

  if (type !== "email_change") {
    if (!current || !data.token_hash) return [];
    return [
      {
        to: current,
        tokenHash: data.token_hash,
        kind: type === "signup" ? "signup" : "recovery",
      },
    ];
  }

  const secureChange = Boolean(data.token_hash && data.token_hash_new);

  if (secureChange) {
    const deliveries: Delivery[] = [];
    if (current) {
      deliveries.push({
        to: current,
        tokenHash: data.token_hash_new!,
        kind: "emailChangeCurrent",
      });
    }
    if (next) {
      deliveries.push({
        to: next,
        tokenHash: data.token_hash!,
        kind: "emailChangeNew",
      });
    }
    return deliveries;
  }

  // Secure change off: whichever pair Supabase filled in, addressed to
  // the new inbox.
  const tokenHash = data.token_hash || data.token_hash_new;
  const to = next || current;
  if (!tokenHash || !to) return [];
  return [{ to, tokenHash, kind: "emailChangeNew" }];
}

/**
 * Locales whose AuthEmail copy has actually been written. next-intl
 * renders a missing key as its own path, so a locale listed here without
 * translations would send someone an email subject reading
 * "AuthEmail.signupSubject". Add a locale to this list in the same commit
 * that adds its strings, never before.
 */
const TRANSLATED: readonly string[] = ["en"];

/**
 * Recorded on the user at sign-up. Anyone who signed up before that
 * existed has no locale, and the default is the honest answer for them —
 * guessing from an Accept-Language header Supabase never sends would not
 * be better.
 */
function preferredLocale(user: HookUser): string {
  const stored = user.user_metadata?.locale;
  if (!hasLocale(routing.locales, stored)) return routing.defaultLocale;
  return TRANSLATED.includes(stored) ? stored : routing.defaultLocale;
}

function buildContent(
  delivery: Delivery,
  t: (key: string, values?: Record<string, string>) => string,
  context: { currentEmail: string; newEmail: string; url: string },
): EmailContent {
  const { kind } = delivery;

  const paragraphs = [t(`${kind}Body`)];
  if (kind === "emailChangeCurrent" || kind === "emailChangeNew") {
    paragraphs.push(
      t("emailChangeAddresses", {
        current: context.currentEmail,
        next: context.newEmail,
      }),
    );
  }

  return {
    heading: t(`${kind}Heading`),
    paragraphs,
    action: { label: t(`${kind}Action`), url: context.url },
    footnote: t(`${kind}Footnote`),
  };
}
