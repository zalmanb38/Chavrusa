"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  COUNTRY_CODES,
  citiesFor,
  hasRegions,
  regionsFor,
} from "@/lib/locations";
import MultiSelectFilter from "@/components/MultiSelectFilter";

const selectClass =
  "w-full border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none";

// Matches the label voice used by the rest of the filter bar.
const labelClass = "text-[11.5px] tracking-[0.14em] text-muted uppercase";

/**
 * The Browse-side cascade. Filters only on country, region and city — the
 * structured parts everyone fills in the same way. Neighbourhood and
 * meeting spot are free text and vary too much between people to make a
 * dependable filter.
 *
 * Country takes several values; region does not. Region codes are only
 * unique inside a country, so there is no honest combined list to show
 * across two of them — and someone searching two countries at once is
 * casting a wider net on purpose, not asking for a state. Narrow back to
 * one country and the region control returns exactly as it was.
 *
 * Renders named inputs so the surrounding GET form submits them as query
 * parameters, but keeps local state so each level can narrow the next.
 */
export default function LocationFilter({
  initialCountries,
  initialRegion,
  initialCity,
}: {
  initialCountries: string[];
  initialRegion: string;
  initialCity: string;
}) {
  const t = useTranslations("Location");

  const [countries, setCountries] = useState<string[]>(initialCountries);
  const [region, setRegion] = useState(initialRegion);
  const [city, setCity] = useState(initialCity);

  // Exactly one country is what makes a region or a curated city list
  // meaningful. Zero means "anywhere" and several mean "these" — in both
  // cases there is nothing to narrow to.
  const soleCountry = countries.length === 1 ? countries[0] : null;
  const regions = soleCountry ? regionsFor(soleCountry) : [];
  const cities = soleCountry ? citiesFor(soleCountry, region) : [];
  const showRegion = soleCountry !== null && hasRegions(soleCountry);

  return (
    <>
      <MultiSelectFilter
        name="country"
        label={t("country")}
        options={COUNTRY_CODES.map((code) => ({
          value: code,
          label: t(`country_${code}`),
        }))}
        initialSelected={countries}
        emptyLabel={t("anyCountry")}
        onSelectionChange={(next) => {
          setCountries(next);
          // A region chosen under the old country would otherwise be
          // submitted against the new one, where its code means something
          // else or nothing at all.
          setRegion("");
          setCity("");
        }}
      />

      {showRegion && (
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{t("region")}</span>
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

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>{t("city")}</span>
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
          // No curated list for this combination — several countries at
          // once included — and people who typed their own city still
          // need to be findable, so fall back to a partial text match.
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
