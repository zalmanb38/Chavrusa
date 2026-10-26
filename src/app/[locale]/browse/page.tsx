import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  LANGUAGE_CODES,
  STUDY_LANGUAGE_CODES,
  TOPIC_KEYS,
  isTopicKey,
  PREFERENCES,
  AGE_RANGES,
  ageRangeLabel,
  FREQUENCIES,
  TIMES_OF_DAY,
  SESSION_LENGTHS,
  preferenceMessageKey,
  frequencyMessageKey,
  timeOfDayMessageKey,
  type Profile,
  type TopicKey,
  type Preference,
  type Frequency,
  type TimeOfDay,
} from "@/lib/profile-options";
import { topicName } from "@/lib/topic-names";
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
  type ConnectInfo,
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
  const tLanguages = await getTranslations("Languages");
  const tMap = await getTranslations("Map");
  const tLocation = await getTranslations("Location");
  // A stored value from an older subject list is shown as it was saved
  // rather than crashing the page on a missing name.
  const topicLabel = (key: string) =>
    isTopicKey(key) ? topicName(key, locale) : key;
  const mapView = filters.view === "map";
  // Everything except the view itself, so each toggle link carries the
  // current filters rather than resetting them.
  const { view: _view, ...filterQuery } = filters;
  void _view;
  const advancedFilterCount = countAdvancedFilters(filters);
  const selectedAges = toValues(filters.age);
  const selectedTopics = toValues(filters.topic);
  const selectedLanguages = toValues(filters.language);
  const selectedStudyLanguages = toValues(filters.studyLanguage);
  const selectedPreferences = toValues(filters.preference);
  const selectedFrequencies = toValues(filters.frequency);
  const selectedTimesOfDay = toValues(filters.timeOfDay);
  const selectedSessionLengths = toValues(filters.sessionLength);
  const selectedCountries = toValues(filters.country);

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
    const [
      { data: count, error: countError },
      { data: counts, error: countsError },
    ] = await Promise.all([
      supabase.rpc("discoverable_learner_count"),
      // The wall's preview is real subjects with real numbers, read the
      // same way and for the same reason: it is the only anonymous slice
      // of Browse a signed-out visitor may see.
      supabase.rpc("subject_counts"),
    ]);
    if (countError) console.error("Browse wall count failed", countError);
    if (countsError) console.error("Browse wall subjects failed", countsError);

    // Four cards, the best-attended subjects first. Anything that is not
    // a subject we still offer is dropped rather than shown by its raw
    // key, and a subject nobody has listed never reaches the page.
    const subjects = ((counts ?? []) as { topic: string; learners: number }[])
      .filter((row) => isTopicKey(row.topic) && Number(row.learners) > 0)
      .map((row) => ({
        topic: row.topic as TopicKey,
        learners: Number(row.learners),
      }))
      .sort((a, b) => b.learners - a.learners)
      .slice(0, 4);

    return (
      <BrowseWall learnerCount={Number(count ?? 0)} subjects={subjects} />
    );
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
      .select("phone_verified, is_looking, country, region, city")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const blockedIds = (blocks ?? []).map((b) => b.blocked_id);

  // Browsing still works while unverified, but nobody can see you back —
  // so say so here rather than leaving someone to wonder why no requests
  // ever arrive.
  const viewerVerified = viewer?.phone_verified ?? false;

  // Someone who switched themselves off is still welcome to browse, but
  // the switch is on another page and its effect shows up here as silence.
  // Say it where the silence is.
  const viewerLooking = viewer?.is_looking ?? true;

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
    // The person's own switch, and not negotiable from the filter panel:
    // somebody who has taken themselves off Browse is off it, the way
    // is_active works for an account an admin has hidden.
    .eq("is_looking", true)
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
    .select("id, requester_id, recipient_id, status, updated_at")
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
  const connectStatuses: Record<string, ConnectInfo> =
    Object.fromEntries(connectStatusMap);

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
      .eq("is_looking", true)
      .eq("phone_verified", true)
      .not("name", "eq", "");
    totalDiscoverable = count ?? 0;
  }

  // The list is in two parts, and the order is the point: whoever is free
  // comes first, and the people already learning sit at the end under a
  // heading that says so. They stay on the page — one chavrusa for Gemara
  // is no reason to be unreachable about Chumash — but nobody has to read
  // past them to find somebody unattached.
  //
  // The map gets no sections: there is no "bottom" of a map, so there the
  // card says it for itself.
  const freeToStart = profiles.filter((p) => p.match_count === 0);
  const alreadyLearning = profiles.filter((p) => p.match_count > 0);

  const filterChips = activeFilterChips(filters, {
    topic: (v: string) => topicLabel(v),
    language: (v: string) => tLanguages(v),
    studyLanguage: (v: string) => tLanguages(v),
    preference: (v: string) => tProfile(preferenceMessageKey[v as Preference]),
    frequency: (v: string) => tProfile(frequencyMessageKey[v as Frequency]),
    timeOfDay: (v: string) => tProfile(timeOfDayMessageKey[v as TimeOfDay]),
    sessionLength: (v: string) => tProfile("sessionLengthValue", { minutes: Number(v) }),
    country: (v: string) => tLocation(`country_${v}`),
    // One value, "1", so the chip is named after the filter rather than
    // after what it holds.
    notMatched: () => t("filterNotMatched"),
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

      {/* The same shape as the unverified notice above, and for the same
          reason: an empty inbox is indistinguishable from a quiet week
          unless the page says which it is. Unlike that one, this is a
          choice the person made — so it reads as a reminder, not a
          warning. */}
      {!viewerLooking && (
        <div className="mb-6 flex flex-col gap-2 border-s-2 border-brass bg-surface p-4">
          <p className="font-semibold">{t("notLookingTitle")}</p>
          <p className="text-sm text-muted">{t("notLookingBody")}</p>
          <Link
            href="/profile"
            className="w-fit bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-slate-600"
          >
            {t("notLookingFix")}
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
            <MultiSelectFilter
              name="topic"
              label={t("filterTopic")}
              options={TOPIC_KEYS.map((key) => ({
                value: key,
                label: topicLabel(key),
              }))}
              initialSelected={selectedTopics}
              emptyLabel={t("all")}
            />

            <MultiSelectFilter
              name="language"
              label={t("filterLanguage")}
              options={LANGUAGE_CODES.map((code) => ({
                value: code,
                label: tLanguages(code),
              }))}
              initialSelected={selectedLanguages}
              emptyLabel={t("all")}
            />

            {/* "Both" is a real answer on a profile but never a filter:
                someone open to either already answers both boxes, so as a
                filter value it selected everyone — which is what leaving
                this empty means. */}
            <MultiSelectFilter
              name="preference"
              label={t("filterPreference")}
              options={PREFERENCES.filter((p) => p !== "both").map((p) => ({
                value: p,
                label: tProfile(preferenceMessageKey[p]),
              }))}
              initialSelected={selectedPreferences}
              emptyLabel={t("all")}
            />

            <LocationFilter
              initialCountries={selectedCountries}
              initialRegion={filters.region ?? ""}
              initialCity={filters.city ?? ""}
            />
          </div>

          {/*
            Off by default, deliberately. Showing only unmatched people is
            a reasonable thing to want, but as a default it would hide
            everyone who has found one chavrusa and is looking for a
            second — which is the case this whole feature exists to keep
            open.

            A bare checkbox with no value: present in the query means on,
            which is also what makes the "clear all" link and the chips
            above the results work on it without a special case.
          */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="notMatched"
              value="1"
              defaultChecked={Boolean(filters.notMatched)}
              className="accent-primary"
            />
            {t("filterNotMatched")}
          </label>

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
              <MultiSelectFilter
                name="studyLanguage"
                label={t("filterStudyLanguage")}
                options={STUDY_LANGUAGE_CODES.map((code) => ({
                  value: code,
                  label: tLanguages(code),
                }))}
                initialSelected={selectedStudyLanguages}
                emptyLabel={t("all")}
              />

  <MultiSelectFilter
                name="age"
                label={t("filterAge")}
                options={AGE_RANGES.map((range) => ({
                  value: range,
                  label: ageRangeLabel(range, tProfile),
                }))}
                initialSelected={selectedAges}
                emptyLabel={t("all")}
              />

              <MultiSelectFilter
                name="frequency"
                label={t("filterFrequency")}
                options={FREQUENCIES.map((f) => ({
                  value: f,
                  label: tProfile(frequencyMessageKey[f]),
                }))}
                initialSelected={selectedFrequencies}
                emptyLabel={t("all")}
              />

              <MultiSelectFilter
                name="timeOfDay"
                label={t("filterTimeOfDay")}
                options={TIMES_OF_DAY.map((tod) => ({
                  value: tod,
                  label: tProfile(timeOfDayMessageKey[tod]),
                }))}
                initialSelected={selectedTimesOfDay}
                emptyLabel={t("all")}
              />

              <MultiSelectFilter
                name="sessionLength"
                label={t("filterSessionLength")}
                options={SESSION_LENGTHS.map((len) => ({
                  value: len,
                  label: tProfile("sessionLengthValue", { minutes: Number(len) }),
                }))}
                initialSelected={selectedSessionLengths}
                emptyLabel={t("all")}
              />

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
            <>
              {freeToStart.length > 0 && (
                <ul className="flex flex-col">
                  {freeToStart.map((profile) => (
                    <BrowseCard
                      key={profile.id}
                      profile={profile}
                      currentUserId={user.id}
                      connectStatus={connectStatuses[profile.id]?.status ?? "none"}
                      requestId={connectStatuses[profile.id]?.requestId ?? null}
                      retryAfter={connectStatuses[profile.id]?.retryAfter ?? null}
                      showName
                    />
                  ))}
                </ul>
              )}

              {alreadyLearning.length > 0 && (
                <section className="flex flex-col gap-1 pt-6">
                  {/* Section voice, not a second page heading: the same
                      quiet uppercase label the filters use, so the list
                      below it reads as a continuation rather than a
                      different kind of result. */}
                  <h2 className={filterLabelClass}>
                    {t("matchedSectionTitle")}
                  </h2>
                  <p className="text-[13px] text-muted">
                    {t("matchedSectionBody")}
                  </p>
                  <ul className="mt-2 flex flex-col">
                    {alreadyLearning.map((profile) => (
                      <BrowseCard
                        key={profile.id}
                        profile={profile}
                        currentUserId={user.id}
                        connectStatus={connectStatuses[profile.id]?.status ?? "none"}
                        requestId={connectStatuses[profile.id]?.requestId ?? null}
                        retryAfter={connectStatuses[profile.id]?.retryAfter ?? null}
                        showName
                      />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
