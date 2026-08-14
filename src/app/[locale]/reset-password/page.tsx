"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const searchParams = useSearchParams();

  // The reset-password link lands here with a one-time `code` in the URL.
  // We exchange it for a session directly in the browser (rather than via
  // a server route) so it works regardless of which device/browser cookie
  // state the email was opened in — the exchange only needs the PKCE
  // verifier this same browser stored when the reset was requested.
  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const code = searchParams.get("code");

    async function verify() {
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        if (!cancelled) setVerifying(false);
        return;
      }

      if (!code) {
        if (!cancelled) {
          setVerifying(false);
          setVerifyError(t("resetLinkInvalid"));
        }
        return;
      }

      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      if (!cancelled) {
        setVerifying(false);
        if (exchangeError) setVerifyError(t("resetLinkInvalid"));
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [searchParams, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message || t("genericError"));
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/profile");
      router.refresh();
    }, 1500);
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16 sm:py-24">
      <h1 className="font-serif text-3xl font-medium">
        {t("resetPasswordTitle")}
      </h1>

      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        {verifying ? (
          <p className="text-sm text-muted">{t("verifyingLink")}</p>
        ) : verifyError ? (
          <p className="text-sm text-red-600">
            {verifyError}{" "}
            <Link href="/forgot-password" className="underline">
              {t("requestNewLink")}
            </Link>
          </p>
        ) : success ? (
          <p className="text-sm text-accent">{t("resetPasswordSuccess")}</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              {t("newPassword")}
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              {t("confirmNewPassword")}
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              />
            </label>

            {error && (
              <p className="text-sm text-red-600">
                {error}{" "}
                <Link href="/forgot-password" className="underline">
                  {t("requestNewLink")}
                </Link>
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {t("resetPasswordButton")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
