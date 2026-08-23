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

  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  // The underlying provider message, shown small under ours. Without it a
  // failure here is indistinguishable from any other, which made this bug
  // hard to place twice over.
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    function succeed() {
      if (cancelled) return;
      setVerifying(false);
      setVerifyError(null);
      setErrorDetail(null);
    }

    function fail(detail?: string) {
      if (cancelled) return;
      setVerifying(false);
      setVerifyError(t("resetLinkInvalid"));
      setErrorDetail(detail ?? null);
    }

    // Implicit-flow links put the session — and any error — in the URL
    // fragment, which never reaches the server.
    const hash = new URLSearchParams(
      typeof window === "undefined" ? "" : window.location.hash.replace(/^#/, ""),
    );

    // With detectSessionInUrl on (the default), the client may consume the
    // fragment itself before our code runs. Catch that via the event rather
    // than racing it.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) succeed();
    });

    async function verify() {
      // Supabase reports its own failures on the URL — an expired or
      // already-used link lands here, not in an exception.
      const urlError =
        searchParams.get("error_description") ??
        searchParams.get("error") ??
        hash.get("error_description") ??
        hash.get("error");
      if (urlError) return fail(urlError);

      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) return succeed();

      // PKCE: the code is exchanged using a verifier this browser stored
      // when the reset was requested.
      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        return exchangeError ? fail(exchangeError.message) : succeed();
      }

      // Token-hash links, which the recommended SSR email template emits.
      const tokenHash = searchParams.get("token_hash") ?? searchParams.get("token");
      if (tokenHash) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        return otpError ? fail(otpError.message) : succeed();
      }

      // Implicit flow, if the client didn't already pick it up.
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        return sessionError ? fail(sessionError.message) : succeed();
      }

      // Nothing usable on the URL. Give onAuthStateChange a moment in case
      // the client is still parsing the fragment, then give up.
      setTimeout(async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session) succeed();
        else fail("no_token_in_url");
      }, 600);
    }

    verify();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
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
    const { error: updateError } = await supabase.auth.updateUser({ password });
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
          <div className="flex flex-col gap-2">
            <p className="text-sm text-red-600">
              {verifyError}{" "}
              <Link href="/forgot-password" className="underline">
                {t("requestNewLink")}
              </Link>
            </p>
            {errorDetail && (
              <p className="text-xs text-muted" dir="ltr">
                {errorDetail}
              </p>
            )}
          </div>
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
