"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import ErrorNote from "@/components/ErrorNote";

const inputClass =
  "rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none";

/**
 * Changes the address the account signs in with.
 *
 * The displayed address is deliberately not updated on success: nothing
 * has actually changed until the link in the email is clicked, and
 * showing the new one straight away would tell someone their sign-in
 * address had moved when it had not. The confirmation line says what to
 * do instead, and the real swap shows up on the next load after the
 * round-trip.
 *
 * That round-trip is a double one: the project has Supabase's "Secure
 * email change" enabled, so a link goes to both the old address and the
 * new one and the change only lands once both are clicked. The
 * changeEmailSent copy says so in all four locales — if the setting is
 * ever turned off, that copy is what has to change with it.
 *
 * `locale` is passed in rather than read from a hook because the redirect
 * has to name the path the callback returns to, and this is a client
 * component reached from a server one — a string crosses that boundary,
 * a function would not.
 */
export default function ChangeEmailForm({ locale }: { locale: string }) {
  const t = useTranslations("Account");
  const tAuth = useTranslations("Auth");

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const next = encodeURIComponent(`/${locale}/profile?emailChanged=1`);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser(
      { email: email.trim() },
      { emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    );

    setSaving(false);

    if (updateError) {
      // Supabase's own message is the useful one here — "already
      // registered", or the rate limit — so it leads, with the generic
      // line only as a fallback.
      setError(updateError.message || tAuth("genericError"));
      return;
    }

    setSentTo(email.trim());
    setOpen(false);
    setEmail("");
  }

  if (sentTo) {
    return (
      <p className="text-xs text-accent">{t("changeEmailSent", { email: sentTo })}</p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-xs text-slate-600 underline underline-offset-4 hover:text-brass"
      >
        {t("changeEmailLink")}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 pt-1">
      <label className="flex flex-col gap-1.5 text-sm">
        {t("changeEmailLabel")}
        <input
          type="email"
          required
          dir="ltr"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </label>

      {error && <ErrorNote size="xs">{error}</ErrorNote>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {t("changeEmailButton")}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setEmail("");
            setError(null);
          }}
          className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
        >
          {t("changeEmailCancel")}
        </button>
      </div>
    </form>
  );
}
