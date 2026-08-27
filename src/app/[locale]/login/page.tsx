"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import ErrorNote from "@/components/ErrorNote";
import ImageSlot from "@/components/ImageSlot";

export default function LoginPage() {
  const t = useTranslations("Auth");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (signInError) {
      setError(signInError.message || t("genericError"));
      return;
    }

    router.push("/profile");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col gap-6 px-6 py-16 sm:py-24">
      <ImageSlot
        direction="Stack of seforim with reading glasses on top"
        src="/photos/p9-stack-glasses.jpg"
        alt=""
        height={160}
      />
      <h1 className="text-[2rem] font-semibold sm:text-[34px]">{t("loginTitle")}</h1>

      <div className="flex flex-col gap-6">
        <GoogleSignInButton />

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" />
          {t("or")}
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            />
          </label>

          <Link
            href="/forgot-password"
            className="-mt-2 self-end text-sm text-primary underline"
          >
            {t("forgotPassword")}
          </Link>

          {error && <ErrorNote>{error}</ErrorNote>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {t("loginButton")}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-muted">
        {t("noAccount")}{" "}
        <Link href="/signup" className="font-medium text-primary underline">
          {t("signupLink")}
        </Link>
      </p>
    </div>
  );
}
