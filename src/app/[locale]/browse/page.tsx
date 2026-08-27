import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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
  type Preference,
  type Frequency,
  type TimeOfDay,
} from "@/lib/profile-options";
import {
  PROFILE_COLUMNS,
  proximityOptions,
  activeFilterChips,
  applyLocalFilters,
  applyQueryFilters,
  coordsOf,
  countAdvancedFilters,
  toValues,
  type BrowseFilters,
} from "@/lib/browse-filters";
import LocationFilter from "@/components/LocationFilter";
import BrowseCard from "@/components/BrowseCard";
import ImageSlot from "@/components/ImageSlot";
import BrowseWall from "@/components/BrowseWall";
import MultiSelectFilter from "@/components/MultiSelectFilter";
import BrowseMapView from "@/components/BrowseMapView";
import {
  buildConnectStatusMap,
  type ConnectRequestRow,
  type ConnectStatus,
} from "@/lib/connect";

// "Label — the only chrome voice": 11.5px, wide tracking, uppercase.
const filterLabelClass =
  "text-[11.5px] tracking-[0.14em] text-muted uppercase";

const selectClass =
  "w-full border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none";


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
  const tLocation = await getTranslations("Location");
  const mapView = filters.view === "map";
  // Everything except the view itself, so each toggle link carries the
  // current filters rather than resetting them.
  const { view: _view, ...filterQuery } = filters;
  void _view;
  const advancedFilterCount = countAdvancedFilters(filters);
  const selectedAges = toValues(filters.age);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A signed-out visitor gets the wall rather than a redirect: being
  // bounced to a login form says nothing about what is behind it, and the
  // real count is the most honest argument the page has.
  if (!user) {
    // Through a function, not the table: a signed-out visitor cannot read
    // profiles under RLS, so a direct count here would always be zero —
    // and a wall whose whole argument is a real number must not invent it.
    const { data: count, error: countError } = await supabase.rpc(
      "discoverable_learner_count",
    );
    if (countError) console.error("Browse wall count failed", countError);

    return <BrowseWall learnerCount={Number(count ?? 0)} />;
  }

  // RLS only hides profiles from people who blocked *you*; profiles you've
  // blocked yourself are excluded from Browse here at the query level so
  // your own Blocked-users list can still read their name to display it.
  const [
    { data: blocks, error: blocksError },
    { data: viewer, error: viewerError },
  ] = await Promise.all([
    supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id),
    supabase
      .from("profiles")
      .select("phone_verified, country, region, city")
      .eq("id", user.id)
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

  // Miles for someone in the US, kilometres for everyone else; the URL
  // carries kilometres either way.
  const proximity = proximityOptions(viewer?.country, filters.near);

  // Only phone-verified people are discoverable, per the safety spec:
  // a verified number is what makes a bad actor costly to replace after
  // being blocked or suspended. phone_verified can only be set by the
  // SMS route (service role) or an admin — the profiles trigger reverts
  // a user's own write to it — so this can't be self-granted.
  let query = supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .neq("id", user.id)
    .eq("is_active", true)
    .eq("phone_verified", true)
    .not("name", "eq", "");

  if (blockedIds.length > 0) {
    query = query.not("id", "in", `(${blockedIds.join(",")})`);
  }

  // Every filter lives in one module so the list and the map cannot drift
  // apart — they render the same array, filtered once.
  query = applyQueryFilters(query, filters);

  const { data: rows, error: rowsError } = await query.order("created_at", {
    ascending: false,
  });

  // PROFILE_COLUMNS is a runtime constant, so PostgREST can't infer the
  // row shape from it the way it does for a literal select string.
  const { profiles, unplaceableExcluded } = applyLocalFilters(
    (rows ?? []) as unknown as Profile[],
    filters,
    viewerCoords,
  );

  const { data: connectRequests, error: connectError } = await supabase
    .from("connect_requests")
    .select("id, requester_id, recipient_id, status")
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);

  // A failed query yields null data, which reads downstream as "nobody
  // matched" — indistinguishable from an empty result. Log it so a broken
  // query shows up as a broken query rather than an empty page.
  for (const [label, queryError] of [
    ["blocks", blocksError],
    ["viewer", viewerError],
    ["profiles", rowsError],
    ["connect_requests", connectError],
  ] as const) {
    if (queryError) {
      console.error(`Browse: ${label} query failed`, queryError);
    }
  }

  const connectStatusMap = buildConnectStatusMap(
    (connectRequests ?? []) as ConnectRequestRow[],
    user.id,
  );

  // Both views are client components, and a Map doesn't survive the
  // server/client boundary — hand them a plain object instead.
  const connectStatuses: Record<
    string,
    { status: ConnectStatus; requestId: string | null }
  > = Object.fromEntries(connectStatusMap);

  // The design's empty state quantifies the way out — "widening the
  // search finds N learners" — which needs the unfiltered total, not just
  // the knowledge that this query found nothing.
  let totalDiscoverable = profiles.length;
  if (profiles.length === 0) {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .neq("id", user.id)
      .eq("is_active", true)
      .eq("phone_verified", true)
      .not("name", "eq", "");
    totalDiscoverable = count ?? 0;
  }

  const filterChips = activeFilterChips(filters, {
    topic: (v: string) => tTopics(v),
    language: (v: string) => tLanguages(v),
    studyLanguage: (v: string) => tLanguages(v),
    preference: (v: string) => tProfile(preferenceMessageKey[v as Preference]),
    frequency: (v: string) => tProfile(frequencyMessageKey[v as Frequency]),
    timeOfDay: (v: string) => tProfile(timeOfDayMessageKey[v as TimeOfDay]),
    sessionLength: (v: string) => tProfile("sessionLengthValue", { minutes: Number(v) }),
    country: (v: string) => tLocation(`country_${v}`),
  });

  return (
    <div className="mx-auto w-full max-w-[1240px] px-6 sm:px-11">
      {/* ── Header block ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4 pt-9 pb-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-[2rem] font-semibold sm:text-[40px]">
            {t("title")}
          </h1>
          <p className="text-[13.5px] text-muted">
            {t("resultCount", { count: profiles.length })}
          </p>
        </div>

        {/* List / Map as a segmented control on a hairline. */}
        <div className="flex border border-border">
          {(["list", "map"] as const).map((view) => {
            const active = (view === "map") === mapView;
            const query = view === "map" ? { ...filterQuery, view } : filterQuery;
            return (
              <Link
                key={view}
                href={{ pathname: "/browse", query }}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    : "px-4 py-2 text-sm hover:bg-surface"
                }
              >
                {tMap(view === "map" ? "mapView" : "listView")}
              </Link>
            );
          })}
        </div>
      </div>

      {!viewerVerified && (
        <div className="mb-6 flex flex-col gap-2 border-s-2 border-brass bg-surface p-4">
          <p className="font-semibold">{t("notVisibleTitle")}</p>
          <p className="text-sm text-muted">{t("notVisibleBody")}</p>
          <Link
            href="/profile"
            className="w-fit bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-slate-600"
          >
            {t("verifyNow")}
          </Link>
        </div>
      )}

      {/* ── Sidebar + results ──────────────────────────────────────── */}
      <div className="flex flex-col pb-16">
<form className="flex flex-col gap-5 border-t border-border py-6">
          <label className="flex flex-col gap-1.5">
            <span className={filterLabelClass}>{t("filterKeyword")}</span>
            <input
              type="search"
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder={t("filterKeywordPlaceholder")}
              className={selectClass}
            />
          </label>

          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1.5">
            <span className={filterLabelClass}>{t("filterTopic")}</span>
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

            <label className="flex flex-col gap-1.5">
            <span className={filterLabelClass}>{t("filterLanguage")}</span>
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

            <label className="flex flex-col gap-1.5">
            <span className={filterLabelClass}>{t("filterPreference")}</span>
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

            <LocationFilter
              initialCountry={filters.country ?? ""}
              initialRegion={filters.region ?? ""}
              initialCity={filters.city ?? ""}
            />
          </div>

          {/*
            A plain <details> rather than a client component: it needs no
            JavaScript, keeps the GET form intact, and is a disclosure
            widget the browser already knows how to make accessible.

            Opened by default whenever one of the filters inside is active,
            so an applied filter is never hidden behind a closed section —
            that would leave people wondering why their results look odd.
          */}
          <details className="group border-t border-border pt-4" open={advancedFilterCount > 0}>
            <summary className="cursor-pointer text-sm font-medium select-none">
              <span className="group-open:hidden">
                {t("moreFilters")}
                {advancedFilterCount > 0 && ` (${advancedFilterCount})`}
              </span>
              <span className="hidden group-open:inline">{t("fewerFilters")}</span>
            </summary>

            <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1.5">
            <span className={filterLabelClass}>{t("filterStudyLanguage")}</span>
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

  <MultiSelectFilter
                name="age"
                label={t("filterAge")}
                options={AGE_RANGES.map((range) => ({
                  value: range,
                  label: range,
                }))}
                initialSelected={selectedAges}
                emptyLabel={t("all")}
              />

              <label className="flex flex-col gap-1.5">
            <span className={filterLabelClass}>{t("filterFrequency")}</span>
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

              <label className="flex flex-col gap-1.5">
            <span className={filterLabelClass}>{t("filterTimeOfDay")}</span>
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

              <label className="flex flex-col gap-1.5">
            <span className={filterLabelClass}>{t("filterSessionLength")}</span>
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

              {/*
                With no coordinates for the viewer's own city there is no
                origin to measure from. Show why, and where to fix it —
                a disabled dropdown just looks broken.
              */}
              {viewerCoords ? (
                <label className="flex flex-col gap-1.5">
            <span className={filterLabelClass}>{t("filterNear")}</span>
                  <select
                    name="near"
                    defaultValue={filters.near ?? ""}
                    className={selectClass}
                  >
                    <option value="">{t("all")}</option>
                    {proximity.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {proximity.unit === "mi"
                          ? t("withinMiles", { miles: option.amount })
                          : t("withinKm", { km: option.amount })}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-4">
                  <span>{t("filterNear")}</span>
                  <p className="text-xs text-muted">
                    {t("nearNeedsCity")}{" "}
                    <Link href="/profile" className="underline">
                      {t("nearSetCityLink")}
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </details>

          {mapView && <input type="hidden" name="view" value="map" />}

          <button
            type="submit"
            className="w-fit rounded-sm bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            {t("applyFilters")}
          </button>
        </form>

        <main className="flex flex-col gap-5 border-t border-border pt-6">
          {filterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12.5px] text-muted">
                {t("filteringBy")}
              </span>
              {filterChips.map((chip) => (
                <Link
                  key={`${chip.key}-${chip.value}`}
                  href={{ pathname: "/browse", query: chip.without }}
                  className="flex items-center gap-2 bg-slate-100 px-2.5 py-1 text-[13px] text-slate-700 hover:bg-slate-200"
                >
                  {chip.label}
                  <span aria-hidden>×</span>
                  <span className="sr-only">{t("removeFilter")}</span>
                </Link>
              ))}
              <Link
                href="/browse"
                className="text-[13px] text-slate-600 underline hover:text-brass"
              >
                {t("clearAll")}
              </Link>
            </div>
          )}

          {unplaceableExcluded > 0 && (
            <p className="text-xs text-muted">
              {t("nearExcluded", { count: unplaceableExcluded })}
            </p>
          )}

          {profiles.length === 0 ? (
            /*
              One sentence saying what happened, one saying what fixes it,
              and exactly one action — the design's rule for empty states.
              No illustration, no apology.
            */
            <div className="flex max-w-[34em] flex-col items-start gap-4 py-6">
              <ImageSlot
                direction="A chumash with a bookmark ribbon"
                src="/photos/p5-chumash-ribbon.jpg"
                alt=""
                height={200}
              />
              <h2 className="text-[24px] font-semibold">
                {filterChips.length > 0
                  ? t("emptyFilteredTitle")
                  : t("emptyTitle")}
              </h2>
              <p className="text-[15px] text-muted">
                {filterChips.length > 0
                  ? t("emptyFilteredBody", { count: totalDiscoverable })
                  : t("emptyBody")}
              </p>
              {filterChips.length > 0 && (
                <Link
                  href="/browse"
                  className="bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-slate-600"
                >
                  {t("widenSearch")}
                </Link>
              )}
            </div>
          ) : mapView ? (
            <BrowseMapView
              profiles={profiles}
              currentUserId={user.id}
              connectStatuses={connectStatuses}
            />
          ) : (
            <ul className="flex flex-col">
              {profiles.map((profile) => (
                <BrowseCard
                  key={profile.id}
                  profile={profile}
                  currentUserId={user.id}
                  connectStatus={connectStatuses[profile.id]?.status ?? "none"}
                  requestId={connectStatuses[profile.id]?.requestId ?? null}
                  showName
                />
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
}
