import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin-only diagnostic: reports which environment variables the running
 * server can actually see. Secret *values* are never returned — only
 * whether each name resolves, its length, and for non-secret identifiers
 * a short prefix, which is enough to tell one Twilio account from another.
 *
 * The listing of nearby names is the useful part: a variable set in Vercel
 * as "TWILIO_ACCOUNT_SID " or "TWILLIO_ACCOUNT_SID" is invisible to the
 * code and indistinguishable from one that was never set, which is
 * otherwise a very hard thing to see.
 */

// Values here identify a service but don't grant access to it, so a short
// prefix is safe to show and lets you confirm you're on the right account.
const PREFIXABLE = new Set([
  "TWILIO_ACCOUNT_SID",
  "TWILIO_VERIFY_SERVICE_SID",
  "NEXT_PUBLIC_SUPABASE_URL",
  "CONTACT_FROM_EMAIL",
]);

const EXPECTED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_VERIFY_SERVICE_SID",
  "RESEND_API_KEY",
  "CONTACT_FROM_EMAIL",
];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    // 404 rather than 403: don't confirm the endpoint exists.
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const variables = EXPECTED.map((name) => {
    const raw = process.env[name];
    const present = typeof raw === "string" && raw.length > 0;
    const trimmed = raw?.trim() ?? "";

    return {
      name,
      present,
      length: raw?.length ?? 0,
      // A pasted value carrying a stray newline or space is "present" but
      // will fail against the provider, which looks like a wrong secret.
      hasSurroundingWhitespace: present && trimmed.length !== raw!.length,
      prefix:
        present && PREFIXABLE.has(name) ? `${trimmed.slice(0, 8)}…` : null,
    };
  });

  // Names only, never values — so a misspelling stands out next to the
  // name the code is actually looking for.
  const relatedNames = Object.keys(process.env)
    .filter((k) => /twilio|resend|supabase|contact/i.test(k))
    .sort();

  return NextResponse.json({
    vercelEnv: process.env.VERCEL_ENV ?? null,
    deploymentUrl: process.env.VERCEL_URL ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    variables,
    relatedNames,
  });
}
