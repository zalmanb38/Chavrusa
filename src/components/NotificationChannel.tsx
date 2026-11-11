"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import ErrorNote from "@/components/ErrorNote";
import type { NotificationChannel as Channel } from "@/lib/notifications";

const CHANNELS: Channel[] = ["email", "sms", "both"];

const CHANNEL_LABEL: Record<Channel, string> = {
  email: "channelEmail",
  sms: "channelSms",
  both: "channelBoth",
};

/**
 * How a member chooses to be reached.
 *
 * Sits directly under the phone box on the profile page, because the two
 * text options depend on the number in it. That is deliberate: a
 * verified number is optional while the community is getting started,
 * and this is the first thing on the site that gives somebody a reason
 * of their own to verify one.
 *
 * Saves on change rather than behind a button. There is one value here
 * and no way to get it half-right, so a Save button would only add a
 * step somebody can forget to take.
 */
export default function NotificationChannel({
  initialChannel,
  phone,
  phoneVerified,
  countryAllowed,
  optedOut,
}: {
  initialChannel: Channel;
  phone: string | null;
  phoneVerified: boolean;
  /** Whether texts are offered to this number's country at all. */
  countryAllowed: boolean;
  /** They replied STOP to a text. */
  optedOut: boolean;
}) {
  const t = useTranslations("Notifications");

  const [channel, setChannel] = useState<Channel>(initialChannel);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cleared the moment they choose a text option: that choice is a fresh
  // opt-in, and the database lifts the flag on the same transition, so
  // the card must not go on saying texts are off.
  const [showOptedOut, setShowOptedOut] = useState(optedOut);

  const hasNumber = Boolean(phone && phone.trim());
  // A number can carry the verified flag with no number behind it — an
  // admin can set the flag by hand — and there is nothing to text in
  // that case.
  const textAvailable = phoneVerified && hasNumber && countryAllowed;

  async function choose(next: Channel) {
    if (next === channel) return;

    const previous = channel;
    setChannel(next);
    setSaved(false);
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setChannel(previous);
      setSaving(false);
      setError(t("saveError"));
      return;
    }

    // The consent timestamp and the opt-out flag are not sent: the
    // trigger in migration 0034 derives both from the channel, so that
    // when somebody agreed to be texted is a record rather than a field.
    const { error: saveError } = await supabase
      .from("notification_preferences")
      .upsert({ id: user.id, channel: next }, { onConflict: "id" });

    setSaving(false);

    if (saveError) {
      setChannel(previous);
      setError(t("saveError"));
      return;
    }

    if (next === "sms" || next === "both") setShowOptedOut(false);
    setSaved(true);
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <legend className="flex flex-wrap items-center gap-2 px-1 text-sm font-medium">
        {t("title")}
      </legend>
      <p className="-mt-2 text-sm text-muted">{t("hint")}</p>

      <div className="flex flex-col gap-2">
        {CHANNELS.map((option) => {
          const needsNumber = option !== "email" && !textAvailable;

          return (
            <label
              key={option}
              className={`flex flex-wrap items-center gap-2 text-sm ${
                needsNumber ? "text-muted" : ""
              }`}
            >
              <input
                type="radio"
                name="notification-channel"
                value={option}
                checked={channel === option}
                disabled={needsNumber || saving}
                onChange={() => choose(option)}
                className="accent-primary disabled:opacity-50"
              />
              {t(CHANNEL_LABEL[option])}
              {needsNumber && (
                <span className="text-xs text-muted">
                  {countryAllowed ? t("needsVerified") : t("countryUnavailable")}
                </span>
              )}
            </label>
          );
        })}
      </div>

      {/* Three different things to say under the choices, and only ever
          one of them: what we will do, what is stopping us, or what they
          themselves turned off. */}
      {showOptedOut ? (
        <p className="text-sm text-muted">{t("optedOut")}</p>
      ) : !textAvailable ? (
        <p className="text-sm text-muted">
          {countryAllowed ? t("verifyPrompt") : t("countryUnavailableHint")}
        </p>
      ) : (
        <p className="text-sm text-muted">
          {t("sentTo")} <span dir="ltr">{phone}</span>. {t("stopNote")}
        </p>
      )}

      {/* Quiet, and only after something happened: the choice is one
          click and the confirmation should not outweigh it. */}
      {(saving || saved) && (
        <p aria-live="polite" className="text-xs text-muted">
          {saving ? t("saving") : t("saved")}
        </p>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
    </fieldset>
  );
}
