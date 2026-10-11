// Basemap tile configuration.
//
// MapTiler when a key is present, Carto's basemap CDN otherwise. The
// fallback exists so a missing key degrades to a working map rather than
// an empty grey box, but it isn't the intended production path — Carto's
// free basemaps are meant for modest use and carry no SLA.
//
// The key is NEXT_PUBLIC_ because tile requests come from the browser;
// there's no way to keep a raster tile key private. MapTiler lets you
// restrict a key to specific origins, which is the actual protection —
// set chavrusalink.com there rather than treating the key as a secret.

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function tileConfig(dark: boolean): { url: string; attribution: string } {
  if (MAPTILER_KEY) {
    return {
      // basic-v2 rather than streets-v2: it keeps the street names,
      // building footprints and transit labels, and drops the POI icon
      // layer. Over Crown Heights the bus-stop pins alone were busier
      // than the clusters they sat under, and a basemap that competes
      // with its own data layer is the problem dataviz had in reverse.
      url: `https://api.maptiler.com/maps/${
        dark ? "basic-v2-dark" : "basic-v2"
      }/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
      attribution: `&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> ${OSM_ATTRIBUTION}`,
    };
  }
  return {
    // Voyager rather than light_all, to match streets-v2's level of
    // detail. There is no equally detailed dark Carto basemap, so dark
    // keeps dark_all and stays the sparser of the two.
    url: dark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: `&copy; <a href="https://carto.com/attributions">CARTO</a> ${OSM_ATTRIBUTION}`,
  };
}

/**
 * Marker colours are literal rather than themed CSS variables: Leaflet
 * writes stroke and fill as SVG presentation attributes, where `var()`
 * doesn't resolve. These are the palette's brass and bottle green, picked
 * to read against both the light and dark basemaps.
 */
export const MARKER_COLORS = {
  // Gold for the selected cluster, slate blue for the rest — the palette's
  // two roles, kept apart: fill versus fill, never mixed in one marker.
  selected: { stroke: "#7a5713", fill: "#c48f2a" },
  base: { stroke: "#12305c", fill: "#1c4b8f" },
} as const;

export const usingFallbackTiles = !MAPTILER_KEY;
