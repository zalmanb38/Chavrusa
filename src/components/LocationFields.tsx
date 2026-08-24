"use client";

import { useTranslations } from "next-intl";
import {
  COUNTRY_CODES,
  OTHER_VALUE,
  citiesFor,
  hasRegions,
  regionsFor,
} from "@/lib/locations";

export interface LocationValue {
  country: string;
  region: string;
  city: string;
  neighborhood: string;
  meetingSpot: string;
}

const fieldClass =
  "rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none";

/**
 * Country → region → city, each narrowing the next, with free text as the
 * escape hatch at the city level.
 *
 * Changing a level clears the ones below it: a city chosen under New York
 * is meaningless once the country becomes Israel, and leaving it in place
 * would silently save a combination that doesn't exist.
 */
export default function LocationFields({
  value,
  onChange,
  required,
}: {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  required: boolean;
}) {
  const t = useTranslations("Location");

  const regions = regionsFor(value.country);
  const cities = citiesFor(value.country, value.region);
  const showRegion = hasRegions(value.country);
  // Free text stands in wherever the list can't help: no curated cities
  // for this combination, or the person explicitly chose "Other".
  const cityIsFreeText =
    value.country === "OTHER" ||
    (showRegion && value.region === "OTHER") ||
    (value.country !== "" && cities.length === 0) ||
    (value.city !== "" && !cities.includes(value.city));

  return (
    <fieldset className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <legend className="px-1 text-sm font-medium">{t("sectionTitle")}</legend>
      <p className="-mt-2 text-xs text-muted">
        {required ? t("requiredHint") : t("optionalHint")}
      </p>

      <label className="flex flex-col gap-1.5 text-sm">
        {t("country")}
        {required && <span className="sr-only">{t("requiredMark")}</span>}
        <select
          required={required}
          value={value.country}
          onChange={(e) =>
            onChange({
              ...value,
              country: e.target.value,
              region: "",
              city: "",
            })
          }
          className={fieldClass}
        >
          <option value="">{t("selectCountry")}</option>
          {COUNTRY_CODES.map((code) => (
            <option key={code} value={code}>
              {t(`country_${code}`)}
            </option>
          ))}
        </select>
      </label>

      {showRegion && (
        <label className="flex flex-col gap-1.5 text-sm">
          {t("region")}
          <select
            required={required}
            value={value.region}
            onChange={(e) =>
              onChange({ ...value, region: e.target.value, city: "" })
            }
            className={fieldClass}
          >
            <option value="">{t("selectRegion")}</option>
            {regions.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {value.country && (
        <label className="flex flex-col gap-1.5 text-sm">
          {t("city")}
          {cities.length > 0 && !cityIsFreeText ? (
            <select
              required={required}
              value={value.city}
              onChange={(e) =>
                onChange({
                  ...value,
                  city: e.target.value === OTHER_VALUE ? "" : e.target.value,
                })
              }
              className={fieldClass}
            >
              <option value="">{t("selectCity")}</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value={OTHER_VALUE}>{t("cityOther")}</option>
            </select>
          ) : (
            <>
              <input
                type="text"
                required={required}
                maxLength={100}
                value={value.city}
                placeholder={t("cityPlaceholder")}
                onChange={(e) => onChange({ ...value, city: e.target.value })}
                className={fieldClass}
              />
              {cities.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange({ ...value, city: "" })}
                  className="w-fit text-xs text-muted underline"
                >
                  {t("backToCityList")}
                </button>
              )}
            </>
          )}
        </label>
      )}

      <label className="flex flex-col gap-1.5 text-sm">
        {t("neighborhood")}{" "}
        <span className="text-xs text-muted">{t("optionalMark")}</span>
        <input
          type="text"
          maxLength={100}
          value={value.neighborhood}
          placeholder={t("neighborhoodPlaceholder")}
          onChange={(e) => onChange({ ...value, neighborhood: e.target.value })}
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        {t("meetingSpot")}{" "}
        <span className="text-xs text-muted">{t("optionalMark")}</span>
        <input
          type="text"
          maxLength={150}
          value={value.meetingSpot}
          placeholder={t("meetingSpotPlaceholder")}
          onChange={(e) => onChange({ ...value, meetingSpot: e.target.value })}
          className={fieldClass}
        />
        <span className="text-xs text-muted">{t("meetingSpotHint")}</span>
      </label>
    </fieldset>
  );
}
