import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS entirely, so it must only ever be
 * constructed in server-only code (route handlers, server actions) after
 * the caller has been authorised — never in a client component, and never
 * with its key exposed through a NEXT_PUBLIC_ variable.
 *
 * Needed because the profiles_protect_privileged trigger blocks users
 * from writing their own phone_verified flag; the SMS-verification route
 * is the one place a non-admin write to that column is legitimate.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured on the server.",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
