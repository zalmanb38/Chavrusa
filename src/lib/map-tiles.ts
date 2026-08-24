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
      url: `https://api.maptiler.com/maps/${
        dark ? "dataviz-dark" : "dataviz"
      }/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
      attribution: `&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> ${OSM_ATTRIBUTION}`,
    };
  }
  return {
    url: `https://{s}.basemaps.cartocdn.com/${
      dark ? "dark_all" : "light_all"
    }/{z}/{x}/{y}{r}.png`,
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
  selected: { stroke: "#8a6626", fill: "#b3893c" },
  base: { stroke: "#1b3f2c", fill: "#2f7a55" },
} as const;

export const usingFallbackTiles = !MAPTILER_KEY;
