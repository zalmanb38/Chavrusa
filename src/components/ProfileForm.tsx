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
  OTHER_TOPIC,
  AGE_RANGES,
  STUDY_LANGUAGE_CODES,
  FREQUENCIES,
  TIMES_OF_DAY,
  SESSION_LENGTHS,
  frequencyMessageKey,
  timeOfDayMessageKey,
  type StudyLanguageCode,
  levelMessageKey,
  preferenceMessageKey,
  type Profile,
  type LanguageCode,
  type TopicKey,
  type Level,
  type Preference,
} from "@/lib/profile-options";
import type { ProfileContacts } from "@/lib/contacts";
import LocationFields, { type LocationValue } from "@/components/LocationFields";
import { locationRequired } from "@/lib/locations";

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
  initialFullName,
  userId,
}: {
  initialProfile: Profile | null;
  initialContacts: ProfileContacts | null;
  initialFullName: string;
  userId: string;
}) {
  const t = useTranslations("Profile");
  const tCommon = useTranslations("Common");
  const tTopics = useTranslations("Topics");
  const tLocation = useTranslations("Location");
  const tLanguages = useTranslations("Languages");
  const router = useRouter();

  const [name, setName] = useState(initialProfile?.name ?? "");
  const [fullName, setFullName] = useState(initialFullName);
  const [languages, setLanguages] = useState<LanguageCode[]>(
    initialProfile?.languages ?? [],
  );
  const [topics, setTopics] = useState<TopicKey[]>(
    initialProfile?.topics ?? [],
  );
  const [topicOther, setTopicOther] = useState(
    initialProfile?.topic_other ?? "",
  );
  const [level, setLevel] = useState<Level | "">(initialProfile?.level ?? "");
  const [location, setLocation] = useState<LocationValue>({
    country: initialProfile?.country ?? "",
    region: initialProfile?.region ?? "",
    city: initialProfile?.city ?? "",
    neighborhood: initialProfile?.neighborhood ?? "",
    meetingSpot: initialProfile?.meeting_spot ?? "",
  });
  const [preference, setPreference] = useState<Preference>(
    initialProfile?.preference ?? "both",
  );
  const [availability, setAvailability] = useState(
    initialProfile?.availability ?? "",
  );
  const [ageRange, setAgeRange] = useState(initialProfile?.age_range ?? "");
  const [studyLanguages, setStudyLanguages] = useState<StudyLanguageCode[]>(
    initialProfile?.study_languages ?? [],
  );
  const [frequency, setFrequency] = useState(initialProfile?.frequency ?? "");
  const [timeOfDay, setTimeOfDay] = useState(initialProfile?.time_of_day ?? "");
  const [sessionLength, setSessionLength] = useState(
    initialProfile?.session_length ?? "",
  );
  const [blurb, setBlurb] = useState(initialProfile?.blurb ?? "");
  // Sensitive fields default to visible — the point is to let people opt
  // out, not to make them opt in to being findable.
  const [hiddenFields, setHiddenFields] = useState<string[]>(
    initialProfile?.hidden_fields ?? [],
  );
  const [whatsapp, setWhatsapp] = useState(initialContacts?.whatsapp ?? "");
  const [contactPhone, setContactPhone] = useState(
    initialContacts?.contact_phone ?? "",
  );
  const [zoomLink, setZoomLink] = useState(initialContacts?.zoom_link ?? "");

  // Existing profiles had their public name derived from a full name they
  // never chose, so say so once rather than letting a mangled surname sit
  // there unexplained.
  // Only meaningful when there's a derived name sitting there. A brand-new
  // signup has display_name_set false too, but nothing was shortened for
  // them, so the explanation would just be confusing.
  const needsDisplayNamePrompt =
    initialProfile !== null &&
    !initialProfile.display_name_set &&
    (initialProfile.name ?? "").trim() !== "";

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    setError(null);

    // Someone who only meets in person can't be matched without somewhere
    // to meet, so this is the one case where location is compulsory.
    if (
      locationRequired(preference) &&
      (!location.country || !location.city.trim())
    ) {
      setError(tLocation("requiredError"));
      return;
    }

    setSaving(true);

    const supabase = createClient();
    const { error: saveError } = await supabase.from("profiles").upsert({
      id: userId,
      name,
      languages,
      topics,
      topic_other: topics.includes(OTHER_TOPIC) ? topicOther.trim() : "",
      level: level || null,
      city: location.city.trim(),
      country: location.country,
      region: location.region,
      neighborhood: location.neighborhood.trim(),
      meeting_spot: location.meetingSpot.trim(),
      preference,
      availability,
      age_range: ageRange,
      study_languages: studyLanguages,
      frequency,
      time_of_day: timeOfDay,
      session_length: sessionLength,
      blurb: blurb.trim(),
      hidden_fields: hiddenFields,
      // Saving the form is the person confirming their public name,
      // whether they edited the derived one or left it as it stands.
      display_name_set: true,
    });

    if (saveError) {
      setSaving(false);
      setError(saveError.message);
      return;
    }

    const { error: fullNameError } = await supabase
      .from("profile_names")
      .upsert({ id: userId, full_name: fullName.trim() });

    if (fullNameError) {
      setSaving(false);
      setError(fullNameError.message);
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

      {needsDisplayNamePrompt && (
        <div className="flex flex-col gap-1 rounded-2xl border border-primary/60 bg-primary/10 p-4">
          <p className="font-medium">{t("displayNamePromptTitle")}</p>
          <p className="text-sm text-muted">{t("displayNamePromptBody")}</p>
        </div>
      )}

      <label className="flex flex-col gap-1.5 text-sm">
        {t("displayName")}
        <input
          type="text"
          required
          maxLength={60}
          value={name}
          placeholder={t("displayNamePlaceholder")}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <span className="text-xs text-muted">{t("displayNameHint")}</span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        {t("fullName")}
        <input
          type="text"
          maxLength={120}
          value={fullName}
          placeholder={t("fullNamePlaceholder")}
          onChange={(e) => setFullName(e.target.value)}
          className={inputClass}
        />
        <span className="text-xs text-muted">{t("fullNameHint")}</span>
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

        {topics.includes(OTHER_TOPIC) && (
          <label className="flex flex-col gap-1.5 text-sm">
            {t("topicOtherLabel")}
            <input
              type="text"
              maxLength={100}
              value={topicOther}
              placeholder={t("topicOtherPlaceholder")}
              onChange={(e) => setTopicOther(e.target.value)}
              className={inputClass}
            />
          </label>
        )}
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
        {t("ageRange")}{" "}
        <span className="text-xs text-muted">{tLocation("optionalMark")}</span>
        <select
          value={ageRange}
          onChange={(e) => setAgeRange(e.target.value)}
          className={inputClass}
        >
          <option value="">{t("ageRangeUnset")}</option>
          {AGE_RANGES.map((range) => (
            <option key={range} value={range}>
              {range}
            </option>
          ))}
        </select>
        {ageRange && (
          <span className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={!hiddenFields.includes("age_range")}
              onChange={() =>
                setHiddenFields((prev) =>
                  prev.includes("age_range")
                    ? prev.filter((f) => f !== "age_range")
                    : [...prev, "age_range"],
                )
              }
              className="accent-primary"
            />
            {t("showOnProfile")}
          </span>
        )}
        <span className="text-xs text-muted">{t("ageRangeVisibilityHint")}</span>
      </label>

      <fieldset className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-medium">
          {t("studyLanguages")}
        </legend>
        <p className="-mt-2 text-xs text-muted">{t("studyLanguagesHint")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STUDY_LANGUAGE_CODES.map((code) => (
            <label key={code} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={studyLanguages.includes(code)}
                onChange={() => setStudyLanguages((prev) => toggle(prev, code))}
                className="accent-primary"
              />
              {tLanguages(code)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm">
          {t("frequency")}
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className={inputClass}
          >
            <option value="">{t("noPreference")}</option>
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {t(frequencyMessageKey[f])}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          {t("timeOfDay")}
          <select
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value)}
            className={inputClass}
          >
            <option value="">{t("noPreference")}</option>
            {TIMES_OF_DAY.map((tod) => (
              <option key={tod} value={tod}>
                {t(timeOfDayMessageKey[tod])}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          {t("sessionLength")}
          <select
            value={sessionLength}
            onChange={(e) => setSessionLength(e.target.value)}
            className={inputClass}
          >
            <option value="">{t("noPreference")}</option>
            {SESSION_LENGTHS.map((len) => (
              <option key={len} value={len}>
                {t("sessionLengthValue", { minutes: Number(len) })}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        {t("blurb")}{" "}
        <span className="text-xs text-muted">{tLocation("optionalMark")}</span>
        <textarea
          value={blurb}
          maxLength={400}
          rows={3}
          placeholder={t("blurbPlaceholder")}
          onChange={(e) => setBlurb(e.target.value)}
          className={inputClass}
        />
        <span className="text-xs text-muted">{t("blurbHint")}</span>
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

      <LocationFields
        value={location}
        onChange={setLocation}
        required={locationRequired(preference)}
      />

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
