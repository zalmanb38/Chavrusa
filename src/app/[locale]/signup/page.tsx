"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import ErrorNote from "@/components/ErrorNote";
import MenOnlyNotice from "@/components/MenOnlyNotice";
import ImageSlot from "@/components/ImageSlot";

export default function SignupPage() {
  const t = useTranslations("Auth");
  const router = useRouter();
  // The browse wall sends people here with where they were going; without
  // this they'd sign in and land somewhere they never asked for.
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/profile";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message || t("genericError"));
      return;
    }

    if (data.session) {
      router.push(next);
      router.refresh();
    } else {
      setInfo(t("checkEmail"));
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col gap-6 px-6 py-16 sm:py-24">
      <ImageSlot
        direction="Stack of seforim with reading glasses on top"
        src="/photos/p9-stack-glasses.jpg"
        alt=""
        height={160}
      />
      <h1 className="text-[2rem] font-semibold sm:text-[34px]">{t("signupTitle")}</h1>

      <MenOnlyNotice variant="signup" />


      <div className="flex flex-col gap-6">
        <GoogleSignInButton next={next} />

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" />
          {t("orUseEmail")}
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            {t("email")}
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            {t("password")}
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
            {t("confirmPassword")}
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

          {error && <ErrorNote>{error}</ErrorNote>}
          {info && <p className="text-sm text-accent">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {t("signupButton")}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-muted">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary underline">
          {t("loginLink")}
        </Link>
      </p>
    </div>
  );
}
