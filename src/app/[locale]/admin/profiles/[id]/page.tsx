import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import AdminNav from "@/components/AdminNav";
import AdminUserActions from "@/components/AdminUserActions";
import {
  preferenceMessageKey,
  levelMessageKey,
  type LanguageCode,
  type TopicKey,
  type Level,
  type Preference,
} from "@/lib/profile-options";

interface FullProfile {
  id: string;
  name: string;
  languages: LanguageCode[];
  topics: TopicKey[];
  level: Level | null;
  city: string;
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

  const { supabase } = await requireAdmin(locale);

  const [
    { data: profile },
    { data: contact },
    { count: reportCount },
    { count: blockCount },
    { data: email },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, name, languages, topics, level, city, preference, availability, phone, phone_verified, is_active, suspended, is_admin, created_at",
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
  ]);

  if (!profile) {
    notFound();
  }

  const p = profile as FullProfile;
  const c = contact as ContactInfo | null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
      <AdminNav />

      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl font-medium">
          {p.name || t("unknownUser")}
        </h1>
        <p className="text-sm text-muted" dir="ltr">
          {(email as string | null) ?? "—"}
        </p>
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
          <p className="text-xs text-muted">{tProfile("city")}</p>
          <p>{p.city || "—"}</p>
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
            {p.topics?.length > 0
              ? p.topics.map((tp) => tTopics(tp)).join(", ")
              : "—"}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <p className="text-xs text-muted">{tProfile("availability")}</p>
          <p>{p.availability || "—"}</p>
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
