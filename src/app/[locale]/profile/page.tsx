import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import PhoneVerification from "@/components/PhoneVerification";
import type { Profile } from "@/lib/profile-options";
import type { ProfileContacts } from "@/lib/contacts";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, name, languages, topics, level, city, preference, availability, is_active, phone, phone_verified",
    )
    .eq("id", user!.id)
    .maybeSingle();

  const { data: contacts } = await supabase
    .from("profile_contacts")
    .select("id, whatsapp, contact_phone, zoom_link")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-12">
      <PhoneVerification
        initialPhone={(profile as { phone: string | null } | null)?.phone ?? null}
        initialVerified={
          (profile as { phone_verified: boolean } | null)?.phone_verified ?? false
        }
      />
      <ProfileForm
        initialProfile={profile as Profile | null}
        initialContacts={contacts as ProfileContacts | null}
        userId={user!.id}
      />
    </div>
  );
}
