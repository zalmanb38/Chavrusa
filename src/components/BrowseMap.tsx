"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { markerRadius, type Cluster } from "@/lib/browse-clusters";
import { MARKER_COLORS, tileConfig } from "@/lib/map-tiles";

/**
 * Frames the map on the clusters it's actually showing, and re-frames
 * when the filters change the set. Without this a map of Israel-only
 * results would still open on the whole Atlantic.
 */
const DARK_SCHEME = "(prefers-color-scheme: dark)";

function subscribeToColorScheme(onChange: () => void) {
  const query = window.matchMedia(DARK_SCHEME);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function FitToClusters({ clusters }: { clusters: Cluster[] }) {
  const map = useMap();
  // Refit on a genuine change of markers, not on every parent re-render.
  const signature = clusters.map((c) => c.id).sort().join("|");

  useEffect(() => {
    if (clusters.length === 0) return;
    if (clusters.length === 1) {
      map.setView([clusters[0].lat, clusters[0].lng], 9);
      return;
    }
    map.fitBounds(
      clusters.map((c) => [c.lat, c.lng] as [number, number]),
      { padding: [48, 48], maxZoom: 11 },
    );
    // signature stands in for the cluster set; map identity is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, map]);

  return null;
}

export default function BrowseMap({
  clusters,
  selectedId,
  onSelect,
  labelFor,
}: {
  clusters: Cluster[];
  selectedId: string | null;
  onSelect: (cluster: Cluster) => void;
  labelFor: (cluster: Cluster) => string;
}) {
  const mapRef = useRef<LeafletMap | null>(null);

  // The site takes its theme straight from the OS, so the basemap can
  // follow the same signal rather than needing a setting of its own.
  const dark = useSyncExternalStore(
    subscribeToColorScheme,
    () => window.matchMedia(DARK_SCHEME).matches,
    () => false,
  );

  const tiles = useMemo(() => tileConfig(dark), [dark]);

  return (
    // Leaflet positions its controls and panes with left/right offsets that
    // a Hebrew page's RTL direction would mirror. The map is a geographic
    // surface, not text, so it stays LTR under every locale.
    <div dir="ltr" className="overflow-hidden rounded-2xl border border-border">
      <MapContainer
        ref={mapRef}
        center={[35, -40]}
        zoom={2}
        minZoom={2}
        scrollWheelZoom={false}
        worldCopyJump
        style={{ height: "min(65vh, 520px)", width: "100%" }}
      >
        <TileLayer key={tiles.url} url={tiles.url} attribution={tiles.attribution} />
        <FitToClusters clusters={clusters} />

        {clusters.map((cluster) => {
          const selected = cluster.id === selectedId;
          return (
            <CircleMarker
              key={cluster.id}
              center={[cluster.lat, cluster.lng]}
              radius={markerRadius(cluster.count)}
              pathOptions={{
                color: selected
                  ? MARKER_COLORS.selected.stroke
                  : MARKER_COLORS.base.stroke,
                fillColor: selected
                  ? MARKER_COLORS.selected.fill
                  : MARKER_COLORS.base.fill,
                fillOpacity: selected ? 0.85 : 0.6,
                weight: selected ? 3 : 1.5,
              }}
              eventHandlers={{ click: () => onSelect(cluster) }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                {labelFor(cluster)} · {cluster.count}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
