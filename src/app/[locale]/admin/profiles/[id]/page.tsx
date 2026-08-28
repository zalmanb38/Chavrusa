import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import AdminNav from "@/components/AdminNav";
import AdminUserActions from "@/components/AdminUserActions";
import {
  ageRangeLabel,
  preferenceMessageKey,
  levelMessageKey,
  topicLabels,
  type LanguageCode,
  type TopicKey,
  type Level,
  type Preference,
} from "@/lib/profile-options";
import { formatLocation } from "@/lib/locations";

interface FullProfile {
  id: string;
  name: string;
  languages: LanguageCode[];
  topics: TopicKey[];
  topic_other: string;
  level: Level | null;
  age_range: string;
  hidden_fields: string[];
  blurb: string;
  city: string;
  country: string;
  region: string;
  neighborhood: string;
  meeting_spot: string;
  preference: Preference;
  availability: string;
  phone: string | null;
  phone_verified: boolean;
  is_active: boolean;
  suspended: boolean;
  is_admin: boolean;
  created_at: string;
}

interface ContactInfo {
  whatsapp: string;
  contact_phone: string;
  zoom_link: string;
}

export default async function AdminProfileDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin");
  const tProfile = await getTranslations("Profile");
  const tTopics = await getTranslations("Topics");
  const tLanguages = await getTranslations("Languages");
  const tLocation = await getTranslations("Location");

  const { supabase } = await requireAdmin(locale);

  const [
    { data: profile },
    { data: contact },
    { count: reportCount },
    { count: blockCount },
    { data: email },
    { data: nameRow },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, name, languages, study_languages, topics, topic_other, level, age_range, frequency, time_of_day, session_length, blurb, hidden_fields, city, country, region, neighborhood, meeting_spot, preference, availability, phone, phone_verified, is_active, suspended, is_admin, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("profile_contacts")
      .select("whatsapp, contact_phone, zoom_link")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("reported_id", id),
    supabase
      .from("blocks")
      .select("id", { count: "exact", head: true })
      .eq("blocked_id", id),
    supabase.rpc("admin_get_user_email", { user_id: id }),
    supabase
      .from("profile_names")
      .select("full_name")
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (!profile) {
    notFound();
  }

  const p = profile as FullProfile;
  const c = contact as ContactInfo | null;

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-6 py-12 sm:px-10">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[2rem] font-semibold sm:text-[34px]">
            {p.name || t("unknownUser")}
          </h1>
          <p className="text-sm text-muted" dir="ltr">
            {(email as string | null) ?? "—"}
          </p>
        </div>
        <AdminNav />
      </div>

      <div className="-mt-2 flex flex-wrap gap-2 text-xs">
        <span
          className={`rounded-sm border px-2 py-0.5 ${
            p.phone_verified
              ? "border-accent/40 text-accent"
              : "border-border text-muted"
          }`}
        >
          {p.phone_verified ? t("badgeVerified") : t("badgeUnverified")}
        </span>
        {p.suspended && (
          <span className="rounded-sm border border-clay/40 px-2 py-0.5 text-clay">
            {t("badgeSuspended")}
          </span>
        )}
        {!p.is_active && !p.suspended && (
          <span className="rounded-sm border border-border px-2 py-0.5 text-muted">
            {t("inactiveBadge")}
          </span>
        )}
        {p.is_admin && (
          <span className="rounded-sm border border-primary/50 px-2 py-0.5 text-primary">
            {t("badgeAdmin")}
          </span>
        )}
      </div>

      <AdminUserActions
        profileId={p.id}
        isActive={p.is_active}
        isSuspended={p.suspended}
        isVerified={p.phone_verified}
        isAdminUser={p.is_admin}
      />

      <section className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl border border-border bg-surface p-5 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">{t("statusLabel")}</p>
          <p>
            {p.suspended
              ? t("badgeSuspended")
              : p.is_active
                ? t("activeStatus")
                : t("inactiveBadge")}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">{t("joinedLabel")}</p>
          <p>{new Date(p.created_at).toLocaleDateString(locale)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">{t("reportCountLabel")}</p>
          <p>{reportCount ?? 0}</p>
        </div>
        <div>
          <p className="text-xs text-muted">{t("blockCountLabel")}</p>
          <p>{blockCount ?? 0}</p>
        </div>
        <div>
          <p className="text-xs text-muted">{tLocation("sectionTitle")}</p>
          <p>
            {formatLocation(p, (code) => tLocation(`country_${code}`)) || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">{tLocation("meetingSpot")}</p>
          <p>{p.meeting_spot || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted">{tProfile("fullName")}</p>
          <p>
            {(nameRow as { full_name: string } | null)?.full_name || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">{tProfile("ageRange")}</p>
          <p>
            {p.age_range ? ageRangeLabel(p.age_range, tProfile) : "—"}
            {p.age_range && (p.hidden_fields ?? []).includes("age_range") && (
              <span className="text-muted"> · {t("hiddenByUser")}</span>
            )}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">{tProfile("learningLevel")}</p>
          <p>{p.level ? tProfile(levelMessageKey[p.level]) : "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted">{tProfile("learningPreference")}</p>
          <p>{tProfile(preferenceMessageKey[p.preference])}</p>
        </div>
        <div>
          <p className="text-xs text-muted">{tProfile("languagesSpoken")}</p>
          <p>
            {p.languages?.length > 0
              ? p.languages.map((l) => tLanguages(l)).join(", ")
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">{tProfile("topicsOfInterest")}</p>
          <p>
            {topicLabels(p.topics, p.topic_other, tTopics).join(", ") || "—"}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <p className="text-xs text-muted">{tProfile("availability")}</p>
          <p>{p.availability || "—"}</p>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <p className="text-xs text-muted">{tProfile("blurb")}</p>
          <p>{p.blurb || "—"}</p>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 text-sm">
        <h2 className="text-base font-medium">{t("contactSectionTitle")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted">{tProfile("whatsapp")}</p>
            <p>{c?.whatsapp || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">{tProfile("contactPhone")}</p>
            <p>
              {p.phone || c?.contact_phone || "—"}{" "}
              {p.phone && (
                <span className="text-xs text-muted">
                  {p.phone_verified
                    ? t("phoneVerified")
                    : t("phoneNotVerified")}
                </span>
              )}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted">{tProfile("zoomLink")}</p>
            <p>{c?.zoom_link || "—"}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
