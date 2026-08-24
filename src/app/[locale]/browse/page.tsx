import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  LANGUAGE_CODES,
  STUDY_LANGUAGE_CODES,
  TOPIC_KEYS,
  PREFERENCES,
  AGE_RANGES,
  FREQUENCIES,
  TIMES_OF_DAY,
  SESSION_LENGTHS,
  preferenceMessageKey,
  frequencyMessageKey,
  timeOfDayMessageKey,
  type Profile,
} from "@/lib/profile-options";
import {
  PROFILE_COLUMNS,
  PROXIMITY_RADII,
  applyLocalFilters,
  applyQueryFilters,
  coordsOf,
  type BrowseFilters,
} from "@/lib/browse-filters";
import LocationFilter from "@/components/LocationFilter";
import BrowseCard from "@/components/BrowseCard";
import BrowseMapView from "@/components/BrowseMapView";
import {
  buildConnectStatusMap,
  type ConnectRequestRow,
  type ConnectStatus,
} from "@/lib/connect";

const selectClass =
  "rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none";


export default async function BrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<BrowseFilters>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const filters = await searchParams;

  const t = await getTranslations("Browse");
  const tProfile = await getTranslations("Profile");
  const tTopics = await getTranslations("Topics");
  const tLanguages = await getTranslations("Languages");
  const tMap = await getTranslations("Map");
  const mapView = filters.view === "map";
  // Everything except the view itself, so each toggle link carries the
  // current filters rather than resetting them.
  const { view: _view, ...filterQuery } = filters;
  void _view;

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
  const [{ data: blocks }, { data: viewer }] = await Promise.all([
    supabase.from("blocks").select("blocked_id").eq("blocker_id", user!.id),
    supabase
      .from("profiles")
      .select("phone_verified, country, region, city")
      .eq("id", user!.id)
      .maybeSingle(),
  ]);
  const blockedIds = (blocks ?? []).map((b) => b.blocked_id);

  // Browsing still works while unverified, but nobody can see you back —
  // so say so here rather than leaving someone to wonder why no requests
  // ever arrive.
  const viewerVerified = viewer?.phone_verified ?? false;

  // "Near me" is measured from the viewer's own city. Without one there's
  // no origin to measure from, so the option is offered but explained.
  const viewerCoords = viewer ? coordsOf(viewer) : null;

  // Only phone-verified people are discoverable, per the safety spec:
  // a verified number is what makes a bad actor costly to replace after
  // being blocked or suspended. phone_verified can only be set by the
  // SMS route (service role) or an admin — the profiles trigger reverts
  // a user's own write to it — so this can't be self-granted.
  let query = supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .neq("id", user!.id)
    .eq("is_active", true)
    .eq("phone_verified", true)
    .not("name", "eq", "");

  if (blockedIds.length > 0) {
    query = query.not("id", "in", `(${blockedIds.join(",")})`);
  }

  // Every filter lives in one module so the list and the map cannot drift
  // apart — they render the same array, filtered once.
  query = applyQueryFilters(query, filters);

  const { data: rows } = await query.order("created_at", {
    ascending: false,
  });

  // PROFILE_COLUMNS is a runtime constant, so PostgREST can't infer the
  // row shape from it the way it does for a literal select string.
  const profiles = applyLocalFilters(
    (rows ?? []) as unknown as Profile[],
    filters,
    viewerCoords,
  );

  const { data: connectRequests } = await supabase
    .from("connect_requests")
    .select("id, requester_id, recipient_id, status")
    .or(`requester_id.eq.${user!.id},recipient_id.eq.${user!.id}`);

  const connectStatusMap = buildConnectStatusMap(
    (connectRequests ?? []) as ConnectRequestRow[],
    user!.id,
  );

  // Both views are client components, and a Map doesn't survive the
  // server/client boundary — hand them a plain object instead.
  const connectStatuses: Record<
    string,
    { status: ConnectStatus; requestId: string | null }
  > = Object.fromEntries(connectStatusMap);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 font-serif text-3xl font-medium">{t("title")}</h1>

      {!viewerVerified && (
        <div className="mb-6 flex flex-col gap-2 rounded-2xl border border-primary/60 bg-primary/10 p-4">
          <p className="font-medium">{t("notVisibleTitle")}</p>
          <p className="text-sm text-muted">{t("notVisibleBody")}</p>
          <Link
            href="/profile"
            className="w-fit rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {t("verifyNow")}
          </Link>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {(["list", "map"] as const).map((view) => {
          const active = (view === "map") === mapView;
          const query = view === "map" ? { ...filterQuery, view } : filterQuery;
          return (
            <Link
              key={view}
              href={{ pathname: "/browse", query }}
              className={
                active
                  ? "rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
                  : "rounded-full border border-border px-4 py-1.5 text-sm"
              }
            >
              {tMap(view === "map" ? "mapView" : "listView")}
            </Link>
          );
        })}
      </div>

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

        <LocationFilter
          initialCountry={filters.country ?? ""}
          initialRegion={filters.region ?? ""}
          initialCity={filters.city ?? ""}
        />

        <label className="flex flex-col gap-1 text-sm">
          {t("filterStudyLanguage")}
          <select
            name="studyLanguage"
            defaultValue={filters.studyLanguage ?? ""}
            className={selectClass}
          >
            <option value="">{t("all")}</option>
            {STUDY_LANGUAGE_CODES.map((code) => (
              <option key={code} value={code}>
                {tLanguages(code)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("filterAge")}
          <select
            name="age"
            defaultValue={filters.age ?? ""}
            className={selectClass}
          >
            <option value="">{t("all")}</option>
            {AGE_RANGES.map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </select>
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

        <label className="flex flex-col gap-1 text-sm">
          {t("filterFrequency")}
          <select
            name="frequency"
            defaultValue={filters.frequency ?? ""}
            className={selectClass}
          >
            <option value="">{t("all")}</option>
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {tProfile(frequencyMessageKey[f])}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("filterTimeOfDay")}
          <select
            name="timeOfDay"
            defaultValue={filters.timeOfDay ?? ""}
            className={selectClass}
          >
            <option value="">{t("all")}</option>
            {TIMES_OF_DAY.map((tod) => (
              <option key={tod} value={tod}>
                {tProfile(timeOfDayMessageKey[tod])}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("filterSessionLength")}
          <select
            name="sessionLength"
            defaultValue={filters.sessionLength ?? ""}
            className={selectClass}
          >
            <option value="">{t("all")}</option>
            {SESSION_LENGTHS.map((len) => (
              <option key={len} value={len}>
                {tProfile("sessionLengthValue", { minutes: Number(len) })}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("filterNear")}
          <select
            name="near"
            defaultValue={filters.near ?? ""}
            disabled={!viewerCoords}
            className={selectClass}
          >
            <option value="">{t("all")}</option>
            {PROXIMITY_RADII.map((km) => (
              <option key={km} value={km}>
                {t("withinKm", { km: Number(km) })}
              </option>
            ))}
          </select>
        </label>

        <label className="col-span-2 flex flex-col gap-1 text-sm sm:col-span-4">
          {t("filterKeyword")}
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder={t("filterKeywordPlaceholder")}
            className={selectClass}
          />
        </label>

        {!viewerCoords && (
          <p className="col-span-2 text-xs text-muted sm:col-span-4">
            {t("nearNeedsCity")}
          </p>
        )}

        {mapView && <input type="hidden" name="view" value="map" />}

        <button
          type="submit"
          className="col-span-2 w-fit rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground sm:col-span-4"
        >
          {t("title")}
        </button>
      </form>

      {profiles.length === 0 ? (
        <p className="text-sm text-muted">{t("noResults")}</p>
      ) : mapView ? (
        <BrowseMapView
          profiles={profiles}
          currentUserId={user!.id}
          connectStatuses={connectStatuses}
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {profiles.map((profile) => (
            <BrowseCard
              key={profile.id}
              profile={profile}
              currentUserId={user!.id}
              connectStatus={connectStatuses[profile.id]?.status ?? "none"}
              requestId={connectStatuses[profile.id]?.requestId ?? null}
              showName
            />
          ))}
        </ul>
      )}
    </div>
  );
}
