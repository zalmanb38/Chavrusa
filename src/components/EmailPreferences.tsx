"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import ErrorNote from "@/components/ErrorNote";

/**
 * The one standing email the site sends that is not about something the
 * reader did: "people have joined who learn what you learn".
 *
 * Saves on the flip rather than waiting for the profile form's Save
 * button below it. A notification preference is the one setting people
 * change in a hurry, usually because they want it to stop, and a switch
 * that needs a second click somewhere else to take effect is a switch
 * that did not work.
 */
export default function EmailPreferences({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const t = useTranslations("Account");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleChange(next: boolean) {
    // Moved first so the switch answers the click; put back below if the
    // write is refused, which is the only case where it lied.
    setEnabled(next);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const id = userData.user?.id;

    if (!id) {
      setEnabled(!next);
      setError(t("emailPrefsError"));
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ new_member_emails: next })
      .eq("id", id);

    if (updateError) {
      setEnabled(!next);
      setError(t("emailPrefsError"));
      return;
    }

    setSaved(true);
  }

  return (
    <section className="flex flex-col gap-1.5 border-t border-border pt-5">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => handleChange(e.target.checked)}
          className="accent-primary h-4 w-4 shrink-0"
          aria-describedby="new-member-emails-hint"
        />
        {t("newMemberEmailsLabel")}
      </label>
      <p id="new-member-emails-hint" className="text-xs text-muted">
        {t("newMemberEmailsHint")}
      </p>
      {saved && <p className="text-xs text-accent">{t("emailPrefsSaved")}</p>}
      {error && <ErrorNote>{error}</ErrorNote>}
    </section>
  );
}
