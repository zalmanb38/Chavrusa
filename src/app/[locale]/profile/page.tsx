import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import PhoneVerification from "@/components/PhoneVerification";
import PhotoUpload from "@/components/PhotoUpload";
import AccountLinkedBanner from "@/components/AccountLinkedBanner";
import { signedPhotoUrl, type ProfilePhoto } from "@/lib/photos";
import type { Profile } from "@/lib/profile-options";
import type { ProfileContacts } from "@/lib/contacts";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tAccount = await getTranslations("Account");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
    // redirect() throws; this narrows `user` below without an assertion
    // at every use, which would TypeError rather than redirect if that
    // ever stopped being true.
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, name, languages, study_languages, topics, topic_other, level, city, country, region, neighborhood, meeting_spot, preference, availability, age_range, frequency, time_of_day, session_length, blurb, hidden_fields, display_name_set, is_active, phone, phone_verified",
    )
    .eq("id", user.id)
    .maybeSingle();

  const { data: contacts } = await supabase
    .from("profile_contacts")
    .select("id, whatsapp, contact_phone, zoom_link")
    .eq("id", user.id)
    .maybeSingle();

  const { data: photo } = await supabase
    .from("profile_photos")
    .select(
      "id, storage_path, status, moderation_verdict, moderation_detail, uploaded_at, reviewed_by, reviewed_at, review_note",
    )
    .eq("id", user.id)
    .maybeSingle();

  const photoRow = photo as ProfilePhoto | null;
  // Rejected photos have had their file deleted, so there is nothing left
  // to show — only the outcome and the reviewer's note.
  const photoUrl =
    photoRow && photoRow.status !== "rejected"
      ? await signedPhotoUrl(photoRow.storage_path)
      : null;

  const { data: nameRow } = await supabase
    .from("profile_names")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12 sm:px-8">
      <PhoneVerification
        initialPhone={(profile as { phone: string | null } | null)?.phone ?? null}
        initialVerified={
          (profile as { phone_verified: boolean } | null)?.phone_verified ?? false
        }
      />
      {/* The next screen after an OAuth round-trip, so this is where the
          one-time linking notice lands. */}
      <Suspense fallback={null}>
        <AccountLinkedBanner />
      </Suspense>

      {/* Read-only: the address is the account's identity, changing it is
          an auth operation rather than a profile edit. Shown because
          people forget which address they signed up with — and it is only
          ever your own, never anyone else's, at any match status. */}
      <section className="flex flex-col gap-1 border-t border-border pt-5">
        <h2 className="text-[11.5px] tracking-[0.14em] text-muted uppercase">
          {tAccount("emailLabel")}
        </h2>
        <p dir="ltr" className="text-[15px]">
          {user.email}
        </p>
        <p className="text-xs text-muted">{tAccount("emailHint")}</p>
      </section>

      <PhotoUpload
        initialStatus={photoRow?.status ?? null}
        initialUrl={photoUrl}
        initialNote={photoRow?.review_note ?? ""}
      />
      <ProfileForm
        initialProfile={profile as Profile | null}
        initialContacts={contacts as ProfileContacts | null}
        initialFullName={(nameRow as { full_name: string } | null)?.full_name ?? ""}
        userId={user.id}
      />
    </div>
  );
}
