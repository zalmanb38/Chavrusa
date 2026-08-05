"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LANGUAGE_CODES,
  TOPIC_KEYS,
  LEVELS,
  PREFERENCES,
  levelMessageKey,
  preferenceMessageKey,
  type Profile,
  type LanguageCode,
  type TopicKey,
  type Level,
  type Preference,
} from "@/lib/profile-options";
import type { ProfileContacts } from "@/lib/contacts";

const inputClass =
  "rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none";

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

export default function ProfileForm({
  initialProfile,
  initialContacts,
  userId,
}: {
  initialProfile: Profile | null;
  initialContacts: ProfileContacts | null;
  userId: string;
}) {
  const t = useTranslations("Profile");
  const tCommon = useTranslations("Common");
  const tTopics = useTranslations("Topics");
  const tLanguages = useTranslations("Languages");
  const router = useRouter();

  const [name, setName] = useState(initialProfile?.name ?? "");
  const [languages, setLanguages] = useState<LanguageCode[]>(
    initialProfile?.languages ?? [],
  );
  const [topics, setTopics] = useState<TopicKey[]>(
    initialProfile?.topics ?? [],
  );
  const [level, setLevel] = useState<Level | "">(initialProfile?.level ?? "");
  const [city, setCity] = useState(initialProfile?.city ?? "");
  const [preference, setPreference] = useState<Preference>(
    initialProfile?.preference ?? "both",
  );
  const [availability, setAvailability] = useState(
    initialProfile?.availability ?? "",
  );
  const [whatsapp, setWhatsapp] = useState(initialContacts?.whatsapp ?? "");
  const [contactPhone, setContactPhone] = useState(
    initialContacts?.contact_phone ?? "",
  );
  const [zoomLink, setZoomLink] = useState(initialContacts?.zoom_link ?? "");

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    const supabase = createClient();
    const { error: saveError } = await supabase.from("profiles").upsert({
      id: userId,
      name,
      languages,
      topics,
      level: level || null,
      city,
      preference,
      availability,
    });

    if (saveError) {
      setSaving(false);
      setError(saveError.message);
      return;
    }

    const { error: contactsError } = await supabase
      .from("profile_contacts")
      .upsert({
        id: userId,
        whatsapp,
        contact_phone: contactPhone,
        zoom_link: zoomLink,
      });

    setSaving(false);

    if (contactsError) {
      setError(contactsError.message);
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <h1 className="font-serif text-3xl font-medium">
        {initialProfile?.name ? t("editTitle") : t("title")}
      </h1>
      {!initialProfile?.name && (
        <p className="text-sm text-muted">{t("completeYourProfile")}</p>
      )}

      <label className="flex flex-col gap-1.5 text-sm">
        {t("name")}
        <input
          type="text"
          required
          value={name}
          placeholder={t("namePlaceholder")}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </label>

      <fieldset className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-medium">
          {t("languagesSpoken")}
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LANGUAGE_CODES.map((code) => (
            <label key={code} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={languages.includes(code)}
                onChange={() => setLanguages((prev) => toggle(prev, code))}
                className="accent-primary"
              />
              {tLanguages(code)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-medium">
          {t("topicsOfInterest")}
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TOPIC_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={topics.includes(key)}
                onChange={() => setTopics((prev) => toggle(prev, key))}
                className="accent-primary"
              />
              {tTopics(key)}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm">
        {t("learningLevel")}{" "}
        <span className="text-muted">({tCommon("optional")})</span>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as Level | "")}
          className={`${inputClass} bg-transparent`}
        >
          <option value="">{t("levelUnset")}</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {t(levelMessageKey[l])}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        {t("city")}
        <input
          type="text"
          value={city}
          placeholder={t("cityPlaceholder")}
          onChange={(e) => setCity(e.target.value)}
          className={inputClass}
        />
      </label>

      <fieldset className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-medium">
          {t("learningPreference")}
        </legend>
        <div className="flex flex-wrap gap-4">
          {PREFERENCES.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="preference"
                checked={preference === p}
                onChange={() => setPreference(p)}
                className="accent-primary"
              />
              {t(preferenceMessageKey[p])}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm">
        {t("availability")}
        <textarea
          value={availability}
          placeholder={t("availabilityPlaceholder")}
          onChange={(e) => setAvailability(e.target.value)}
          rows={3}
          className={inputClass}
        />
      </label>

      <fieldset className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
        <legend className="px-1 text-sm font-medium">
          {t("contactSectionTitle")}
        </legend>
        <p className="-mt-2 text-xs text-muted">{t("contactSectionHint")}</p>

        <label className="flex flex-col gap-1.5 text-sm">
          {t("whatsapp")}
          <input
            type="text"
            value={whatsapp}
            placeholder={t("whatsappPlaceholder")}
            onChange={(e) => setWhatsapp(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          {t("contactPhone")}
          <input
            type="text"
            value={contactPhone}
            placeholder={t("contactPhonePlaceholder")}
            onChange={(e) => setContactPhone(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          {t("zoomLink")}
          <input
            type="text"
            value={zoomLink}
            placeholder={t("zoomLinkPlaceholder")}
            onChange={(e) => setZoomLink(e.target.value)}
            className={inputClass}
          />
        </label>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-accent">{t("saveSuccess")}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {tCommon("save")}
      </button>
    </form>
  );
}
