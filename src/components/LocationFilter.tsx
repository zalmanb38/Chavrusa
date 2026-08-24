"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  COUNTRY_CODES,
  citiesFor,
  hasRegions,
  regionsFor,
} from "@/lib/locations";

const selectClass =
  "rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none";

/**
 * The Browse-side cascade. Filters only on country, region and city — the
 * structured parts everyone fills in the same way. Neighbourhood and
 * meeting spot are free text and vary too much between people to make a
 * dependable filter.
 *
 * Renders named inputs so the surrounding GET form submits them as query
 * parameters, but keeps local state so each level can narrow the next.
 */
export default function LocationFilter({
  initialCountry,
  initialRegion,
  initialCity,
}: {
  initialCountry: string;
  initialRegion: string;
  initialCity: string;
}) {
  const t = useTranslations("Location");

  const [country, setCountry] = useState(initialCountry);
  const [region, setRegion] = useState(initialRegion);
  const [city, setCity] = useState(initialCity);

  const regions = regionsFor(country);
  const cities = citiesFor(country, region);
  const showRegion = hasRegions(country);

  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        {t("country")}
        <select
          name="country"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setRegion("");
            setCity("");
          }}
          className={selectClass}
        >
          <option value="">{t("anyCountry")}</option>
          {COUNTRY_CODES.map((code) => (
            <option key={code} value={code}>
              {t(`country_${code}`)}
            </option>
          ))}
        </select>
      </label>

      {showRegion && (
        <label className="flex flex-col gap-1 text-sm">
          {t("region")}
          <select
            name="region"
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setCity("");
            }}
            className={selectClass}
          >
            <option value="">{t("anyRegion")}</option>
            {regions.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        {t("city")}
        {cities.length > 0 ? (
          <select
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={selectClass}
          >
            <option value="">{t("anyCity")}</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : (
          // No curated list for this combination — and people who typed
          // their own city still need to be findable, so fall back to a
          // partial text match.
          <input
            type="text"
            name="city"
            value={city}
            placeholder={t("cityPlaceholder")}
            onChange={(e) => setCity(e.target.value)}
            className={selectClass}
          />
        )}
      </label>
    </>
  );
}
