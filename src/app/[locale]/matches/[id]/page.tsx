import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import SessionCard from "@/components/SessionCard";
import ProposeSessionForm from "@/components/ProposeSessionForm";
import ReportButton from "@/components/ReportButton";
import PhotoPlaceholder from "@/components/PhotoPlaceholder";
import UnmatchButton from "@/components/UnmatchButton";
import MessageThread from "@/components/MessageThread";
import { MESSAGE_COLUMNS, type Message } from "@/lib/messages";
import { PROFILE_DETAIL_FIELDS } from "@/lib/browse-filters";
import ProfileDetails, {
  type ProfileDetailFields,
} from "@/components/ProfileDetails";
import { signedPhotoUrl, type ProfilePhoto } from "@/lib/photos";
import BlockButton from "@/components/BlockButton";
import type { StudySession } from "@/lib/sessions";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Schedule");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }
  const userId = user!.id;

  const { data: match } = await supabase
    .from("connect_requests")
    .select("id, requester_id, recipient_id, status")
    .eq("id", id)
    .maybeSingle();

  if (
    !match ||
    match.status !== "accepted" ||
    (match.requester_id !== userId && match.recipient_id !== userId)
  ) {
    notFound();
  }

  const otherId =
    match.requester_id === userId ? match.recipient_id : match.requester_id;

  // The same columns Browse and an incoming request select. A match should
  // show more of someone than a stranger can see, and this page was
  // showing less.
  const { data: otherProfileRow } = await supabase
    .from("profiles")
    .select(PROFILE_DETAIL_FIELDS)
    .eq("id", otherId)
    .maybeSingle();

  // A select built from a shared constant is not a string literal, so the
  // client cannot infer the row shape from it — the same cast the requests
  // page makes for the same reason.
  const otherProfile = otherProfileRow as unknown as
    | (ProfileDetailFields & { id: string; name: string })
    | null;

  const otherName = otherProfile?.name || "";

  // The match itself is what unlocks the full name — RLS on profile_names
  // enforces that, so an empty result here means "not entitled" or "never
  // filled in", and either way there's nothing to show.
  const { data: otherNameRow } = await supabase
    .from("profile_names")
    .select("full_name")
    .eq("id", otherId)
    .maybeSingle();

  const otherFullName =
    (otherNameRow as { full_name: string } | null)?.full_name?.trim() || "";

  // RLS on profile_photos already requires BOTH an accepted match and an
  // approved photo, so an empty result here means "not entitled, not
  // approved, or never uploaded" — all of which render the same way.
  const { data: partnerPhoto } = await supabase
    .from("profile_photos")
    .select("id, storage_path, status")
    .eq("id", otherId)
    .maybeSingle();

  const partnerPhotoRow = partnerPhoto as Pick<
    ProfilePhoto,
    "id" | "storage_path" | "status"
  > | null;
  const partnerPhotoUrl =
    partnerPhotoRow?.status === "approved"
      ? await signedPhotoUrl(partnerPhotoRow.storage_path)
      : null;

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("connect_request_id", id)
    .order("created_at", { ascending: true });

  if (messagesError) console.error("Message thread query failed", messagesError);

  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("id, connect_request_id, proposed_by, scheduled_at, status, note")
    .eq("connect_request_id", id)
    .order("scheduled_at", { ascending: true });

  const sessionRows = (sessions ?? []) as StudySession[];
  const hasConfirmedSession = sessionRows.some((s) => s.status === "confirmed");

  const contacts = hasConfirmedSession
    ? (
        await supabase
          .from("profile_contacts")
          .select("whatsapp, contact_phone, zoom_link")
          .eq("id", otherId)
          .maybeSingle()
      ).data
    : null;

  const hasAnyContactInfo =
    !!contacts && (contacts.whatsapp || contacts.contact_phone || contacts.zoom_link);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12 sm:px-8">
      <div className="flex items-start gap-4">
        {partnerPhotoUrl ? (
          /* Signed Supabase URLs are short-lived and host-specific, so
             they don't fit next/image's remotePatterns model. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={partnerPhotoUrl}
            alt=""
            className="h-24 w-24 shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <PhotoPlaceholder className="h-24 w-24 shrink-0" />
        )}

      <div className="flex flex-col gap-2">
        <h1 className="text-[2rem] font-semibold sm:text-[34px]">{otherName}</h1>
        {otherFullName && otherFullName !== otherName && (
          <p className="text-sm text-muted">
            {t("fullNameLabel", { name: otherFullName })}
          </p>
        )}
        {otherProfile?.city && (
          <p className="text-sm text-muted">{otherProfile.city}</p>
        )}

        {otherProfile && (
          <ProfileDetails profile={otherProfile} />
        )}

        <div className="flex gap-3">
          <ReportButton
            currentUserId={userId}
            reportedId={otherId}
            connectRequestId={id}
          />
          <BlockButton
            currentUserId={userId}
            blockedId={otherId}
            blockedName={otherName}
            redirectAfter="/requests"
          />
        </div>
        <UnmatchButton
          requestId={id}
          partnerName={otherName}
          redirectAfter="/requests"
        />
      </div>
      </div>

      <MessageThread
        requestId={id}
        initialMessages={(messages ?? []) as unknown as Message[]}
        viewerId={userId}
        partnerName={otherName}
      />

      {hasConfirmedSession && (
        <section className="flex flex-col gap-2 rounded-2xl border border-accent/25 bg-accent/10 p-5">
          <h2 className="text-sm font-medium text-accent">
            {t("contactRevealedTitle")}
          </h2>
          <p className="text-xs text-accent/80">{t("contactRevealedHint")}</p>
          {hasAnyContactInfo ? (
            <dl className="mt-1 flex flex-col gap-1 text-sm">
              {contacts?.whatsapp && (
                <div className="flex gap-2">
                  <dt className="font-medium">{t("contactWhatsappLabel")}:</dt>
                  <dd>{contacts.whatsapp}</dd>
                </div>
              )}
              {contacts?.contact_phone && (
                <div className="flex gap-2">
                  <dt className="font-medium">{t("contactPhoneLabel")}:</dt>
                  <dd>{contacts.contact_phone}</dd>
                </div>
              )}
              {contacts?.zoom_link && (
                <div className="flex gap-2">
                  <dt className="font-medium">{t("contactZoomLabel")}:</dt>
                  <dd className="break-all">{contacts.zoom_link}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-accent/80">
              {t("contactNoneSet", { name: otherName })}
            </p>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("sessionsTitle")}</h2>
        {sessionRows.length === 0 ? (
          <p className="text-sm text-muted">{t("noSessions")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sessionRows.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                currentUserId={userId}
                otherUserName={otherName}
              />
            ))}
          </ul>
        )}
      </section>

      <ProposeSessionForm connectRequestId={id} currentUserId={userId} />
    </div>
  );
}
