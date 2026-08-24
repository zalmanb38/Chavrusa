"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { buildClusters, MIN_CLUSTER, type Cluster } from "@/lib/browse-clusters";
import { regionsFor } from "@/lib/locations";
import { usingFallbackTiles } from "@/lib/map-tiles";
import type { Profile } from "@/lib/profile-options";
import type { ConnectStatus } from "@/lib/connect";
import BrowseCard from "@/components/BrowseCard";

// Leaflet reaches for `window` as soon as it loads, so the map can only
// exist in the browser.
const BrowseMap = dynamic(() => import("@/components/BrowseMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[min(65vh,520px)] animate-pulse rounded-2xl border border-border bg-surface" />
  ),
});

export default function BrowseMapView({
  profiles,
  currentUserId,
  connectStatuses,
}: {
  profiles: Profile[];
  currentUserId: string;
  connectStatuses: Record<string, { status: ConnectStatus; requestId: string | null }>;
}) {
  const t = useTranslations("Map");
  const tLocation = useTranslations("Location");

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { clusters, belowFloorCount, unplacedCount } = useMemo(
    () => buildClusters(profiles),
    [profiles],
  );

  const labelFor = (cluster: Cluster) => {
    if (cluster.kind === "city") return cluster.city;
    if (cluster.kind === "region") {
      const region = regionsFor(cluster.country).find(
        (r) => r.code === cluster.region,
      );
      return region?.name ?? tLocation(`country_${cluster.country}`);
    }
    return tLocation(`country_${cluster.country}`);
  };

  const selected = clusters.find((c) => c.id === selectedId) ?? null;
  const selectedProfiles = selected
    ? profiles.filter((p) => selected.profileIds.includes(p.id))
    : [];

  // Everyone the map can't draw, whether that's a missing location or a
  // group below the floor. Reported honestly rather than silently dropped.
  const offMapCount = belowFloorCount + unplacedCount;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        {t("intro", { min: MIN_CLUSTER })}
      </p>

      {clusters.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
          {t("noClusters")}
        </p>
      ) : (
        <BrowseMap
          clusters={clusters}
          selectedId={selectedId}
          onSelect={(cluster) => setSelectedId(cluster.id)}
          labelFor={labelFor}
        />
      )}

      {offMapCount > 0 && (
        <p className="text-xs text-muted">
          {t("offMap", { count: offMapCount })}
        </p>
      )}

      {usingFallbackTiles && (
        <p className="text-xs text-muted">{t("fallbackTiles")}</p>
      )}

      {selected && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-xl font-medium">
              {t("areaHeading", {
                area: labelFor(selected),
                count: selected.count,
              })}
            </h2>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-sm text-muted underline"
            >
              {t("clearSelection")}
            </button>
          </div>
          <p className="text-xs text-muted">{t("namesHidden")}</p>
          <ul className="flex flex-col gap-4">
            {selectedProfiles.map((profile) => (
              <BrowseCard
                key={profile.id}
                profile={profile}
                currentUserId={currentUserId}
                connectStatus={connectStatuses[profile.id]?.status ?? "none"}
                requestId={connectStatuses[profile.id]?.requestId ?? null}
                showName={false}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
