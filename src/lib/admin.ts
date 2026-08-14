import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side gate for every admin route. Signed-out visitors go to login;
 * signed-in non-admins get a 404 (rather than a 403, which would confirm
 * the route exists). Call this before reading any data on an admin page.
 *
 * This is defence in depth, not the only defence: the underlying tables
 * are also protected by RLS policies keyed on public.is_admin(), so even
 * a request that somehow reached the data layer without passing here
 * would come back empty.
 */
export async function requireAdmin(locale: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user!.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    notFound();
  }

  return { supabase, userId: user!.id };
}
