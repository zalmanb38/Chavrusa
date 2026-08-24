import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import PhoneVerification from "@/components/PhoneVerification";
import PhotoUpload from "@/components/PhotoUpload";
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
      "id, name, languages, study_languages, topics, topic_other, level, city, country, region, neighborhood, meeting_spot, preference, availability, age_range, frequency, time_of_day, session_length, blurb, hidden_fields, display_name_set, is_active, phone, phone_verified",
    )
    .eq("id", user!.id)
    .maybeSingle();

  const { data: contacts } = await supabase
    .from("profile_contacts")
    .select("id, whatsapp, contact_phone, zoom_link")
    .eq("id", user!.id)
    .maybeSingle();

  const { data: photo } = await supabase
    .from("profile_photos")
    .select(
      "id, storage_path, status, moderation_verdict, moderation_detail, uploaded_at, reviewed_by, reviewed_at, review_note",
    )
    .eq("id", user!.id)
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
      <PhotoUpload
        initialStatus={photoRow?.status ?? null}
        initialUrl={photoUrl}
        initialNote={photoRow?.review_note ?? ""}
      />
      <ProfileForm
        initialProfile={profile as Profile | null}
        initialContacts={contacts as ProfileContacts | null}
        initialFullName={(nameRow as { full_name: string } | null)?.full_name ?? ""}
        userId={user!.id}
      />
    </div>
  );
}
