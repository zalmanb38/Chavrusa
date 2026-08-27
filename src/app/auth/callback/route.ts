import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Handles the redirect back from Supabase after email confirmation or an
// OAuth (e.g. Google) sign-in, exchanging the auth code for a session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const linked = await noteAccountLinking(data?.user?.id, data?.user);
      const destination = linked
        ? `${origin}${next}${next.includes("?") ? "&" : "?"}linked=1`
        : `${origin}${next}`;
      return NextResponse.redirect(destination);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

/**
 * Whether to tell this person their sign-in methods now share an account.
 *
 * Supabase links an OAuth identity to an existing user when the email
 * matches and is verified, which is what 3D asks for — the person never
 * sees "that email is already taken". But it happens silently, so the
 * first time someone who signed up with a password arrives via Google,
 * they should be told once that both routes now reach the same place.
 *
 * Recorded on the profile rather than carried in the URL, because a query
 * parameter would say it again on every subsequent Google sign-in.
 */
async function noteAccountLinking(
  userId: string | undefined,
  user: { identities?: { provider: string }[] | null } | null | undefined,
): Promise<boolean> {
  if (!userId || !user) return false;

  const providers = new Set((user.identities ?? []).map((i) => i.provider));
  if (providers.size < 2) return false;

  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("auth_link_notice_at")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.auth_link_notice_at) return false;

    await admin
      .from("profiles")
      .update({ auth_link_notice_at: new Date().toISOString() })
      .eq("id", userId);

    return true;
  } catch (error) {
    // Never block a sign-in over a banner.
    console.error("Could not record the account-linking notice", error);
    return false;
  }
}
