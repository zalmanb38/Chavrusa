import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import SessionCard from "@/components/SessionCard";
import ProposeSessionForm from "@/components/ProposeSessionForm";
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

  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("id, name, city")
    .eq("id", otherId)
    .maybeSingle();

  const otherName = otherProfile?.name || "";

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
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold">{otherName}</h1>
        {otherProfile?.city && (
          <p className="text-sm text-black/60 dark:text-white/60">
            {otherProfile.city}
          </p>
        )}
      </div>

      {hasConfirmedSession && (
        <section className="flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
          <h2 className="text-sm font-medium text-green-800 dark:text-green-300">
            {t("contactRevealedTitle")}
          </h2>
          <p className="text-xs text-green-800/80 dark:text-green-300/80">
            {t("contactRevealedHint")}
          </p>
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
            <p className="text-sm text-green-800/80 dark:text-green-300/80">
              {t("contactNoneSet", { name: otherName })}
            </p>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("sessionsTitle")}</h2>
        {sessionRows.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">
            {t("noSessions")}
          </p>
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
