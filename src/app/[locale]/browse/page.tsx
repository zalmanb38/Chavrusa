import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  LANGUAGE_CODES,
  TOPIC_KEYS,
  PREFERENCES,
  preferenceMessageKey,
  levelMessageKey,
  type Profile,
  type LanguageCode,
  type TopicKey,
  type Preference,
} from "@/lib/profile-options";
import ConnectButton from "@/components/ConnectButton";
import ReportButton from "@/components/ReportButton";
import BlockButton from "@/components/BlockButton";
import { buildConnectStatusMap, type ConnectRequestRow } from "@/lib/connect";

const selectClass =
  "rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none";

type SearchParams = {
  language?: string;
  topic?: string;
  city?: string;
  preference?: string;
};

export default async function BrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const filters = await searchParams;

  const t = await getTranslations("Browse");
  const tProfile = await getTranslations("Profile");
  const tTopics = await getTranslations("Topics");
  const tLanguages = await getTranslations("Languages");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  // RLS only hides profiles from people who blocked *you*; profiles you've
  // blocked yourself are excluded from Browse here at the query level so
  // your own Blocked-users list can still read their name to display it.
  const { data: blocks } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", user!.id);
  const blockedIds = (blocks ?? []).map((b) => b.blocked_id);

  // TODO(launch): add `.eq("phone_verified", true)` here to hide
  // unverified profiles from Browse, per the original safety spec.
  // Deliberately left off for now (2026-08) so existing/early testers
  // aren't hidden before phone verification is widely adopted — turn
  // this on once the site is ready to go live.
  let query = supabase
    .from("profiles")
    .select(
      "id, name, languages, topics, level, city, preference, availability, is_active",
    )
    .neq("id", user!.id)
    .eq("is_active", true)
    .not("name", "eq", "");

  if (blockedIds.length > 0) {
    query = query.not("id", "in", `(${blockedIds.join(",")})`);
  }

  if (filters.language) {
    query = query.contains("languages", [filters.language]);
  }
  if (filters.topic) {
    query = query.contains("topics", [filters.topic]);
  }
  if (filters.city) {
    query = query.ilike("city", `%${filters.city}%`);
  }
  if (filters.preference === "remote" || filters.preference === "in_person") {
    query = query.in("preference", [filters.preference, "both"]);
  }

  const { data: profiles } = await query.order("created_at", {
    ascending: false,
  });

  const { data: connectRequests } = await supabase
    .from("connect_requests")
    .select("id, requester_id, recipient_id, status")
    .or(`requester_id.eq.${user!.id},recipient_id.eq.${user!.id}`);

  const connectStatusMap = buildConnectStatusMap(
    (connectRequests ?? []) as ConnectRequestRow[],
    user!.id,
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 font-serif text-3xl font-medium">{t("title")}</h1>

      <form className="mb-8 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          {t("filterLanguage")}
          <select
            name="language"
            defaultValue={filters.language ?? ""}
            className={selectClass}
          >
            <option value="">{t("all")}</option>
            {LANGUAGE_CODES.map((code) => (
              <option key={code} value={code}>
                {tLanguages(code)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("filterTopic")}
          <select
            name="topic"
            defaultValue={filters.topic ?? ""}
            className={selectClass}
          >
            <option value="">{t("all")}</option>
            {TOPIC_KEYS.map((key) => (
              <option key={key} value={key}>
                {tTopics(key)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("filterCity")}
          <input
            type="text"
            name="city"
            defaultValue={filters.city ?? ""}
            className={selectClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("filterPreference")}
          <select
            name="preference"
            defaultValue={filters.preference ?? ""}
            className={selectClass}
          >
            <option value="">{t("all")}</option>
            {PREFERENCES.map((p) => (
              <option key={p} value={p}>
                {tProfile(preferenceMessageKey[p])}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="col-span-2 w-fit rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground sm:col-span-4"
        >
          {t("title")}
        </button>
      </form>

      {!profiles || profiles.length === 0 ? (
        <p className="text-sm text-muted">{t("noResults")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {(profiles as Profile[]).map((profile) => (
            <li
              key={profile.id}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif text-lg font-medium">
                  {profile.name}
                </h2>
                {profile.city && (
                  <span className="text-sm text-muted">{profile.city}</span>
                )}
              </div>

              {profile.topics?.length > 0 && (
                <p className="text-sm">
                  {profile.topics.map((tp: TopicKey) => tTopics(tp)).join(", ")}
                </p>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                {profile.languages?.length > 0 && (
                  <span>
                    {profile.languages
                      .map((l: LanguageCode) => tLanguages(l))
                      .join(", ")}
                  </span>
                )}
                <span>{tProfile(preferenceMessageKey[profile.preference as Preference])}</span>
                {profile.level && <span>{tProfile(levelMessageKey[profile.level])}</span>}
              </div>

              <ConnectButton
                currentUserId={user!.id}
                recipientId={profile.id}
                initialStatus={
                  connectStatusMap.get(profile.id)?.status ?? "none"
                }
                requestId={connectStatusMap.get(profile.id)?.requestId ?? null}
              />

              <div className="flex flex-col items-start gap-2 pt-1">
                <div className="flex gap-3">
                  <ReportButton
                    currentUserId={user!.id}
                    reportedId={profile.id}
                  />
                  <BlockButton
                    currentUserId={user!.id}
                    blockedId={profile.id}
                    blockedName={profile.name}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
