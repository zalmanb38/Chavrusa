"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  COUNTRY_CODES,
  splitPhone,
  type CountryCode,
} from "@/lib/country-codes";
import ErrorNote from "@/components/ErrorNote";

const inputClass =
  "rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-60";

export default function PhoneVerification({
  initialPhone,
  initialVerified,
}: {
  initialPhone: string | null;
  initialVerified: boolean;
}) {
  const t = useTranslations("Phone");
  const router = useRouter();

  const initialSplit = splitPhone(initialPhone);

  const [verified, setVerified] = useState(initialVerified);
  const [verifiedPhone, setVerifiedPhone] = useState(initialPhone ?? "");
  const [changing, setChanging] = useState(false);

  const [dial, setDial] = useState(initialSplit.dial);
  const [national, setNational] = useState(initialSplit.national);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Twilio's own message, shown small beneath ours. The route already
  // returns it; collapsing every failure into one generic line is what
  // made "couldn't send the code" impossible to act on.
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  // Needs a route out rather than just an explanation: nobody can free up
  // a number held by another account on their own.
  const [showContact, setShowContact] = useState(false);

  // The API expects E.164: dial code plus digits only, no spaces, dashes or
  // parentheses, and no leading trunk "0" (common in FR/IL/GB local format).
  const fullPhone = `${dial}${national.replace(/\D/g, "").replace(/^0+/, "")}`;

  async function handleSendCode() {
    setError(null);
    setErrorDetail(null);
    setShowContact(false);
    setSending(true);

    const res = await fetch("/api/phone/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: fullPhone }),
    });
    const data = await res.json();
    setSending(false);

    if (!res.ok) {
      if (res.status === 429) {
        // Round up: "try again in 0 minutes" would be worse than useless.
        const minutes = Math.max(
          1,
          Math.ceil((data.retryAfterSeconds ?? 3600) / 60),
        );
        setError(
          data.error === "daily_limit"
            ? t("dailyLimit")
            : t("rateLimited", { minutes }),
        );
        return;
      }
      if (data.error === "invalid_phone") {
        setError(t("invalidPhone"));
        return;
      }
      setError(t("sendError"));
      setErrorDetail(typeof data.error === "string" ? data.error : null);
      return;
    }
    setCodeSent(true);
  }

  async function handleVerifyCode() {
    setError(null);
    setErrorDetail(null);
    setShowContact(false);
    setVerifying(true);

    const res = await fetch("/api/phone/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: fullPhone, code }),
    });
    const data = await res.json();
    setVerifying(false);

    if (!res.ok) {
      if (data.error === "code_incorrect") {
        setError(t("codeIncorrect"));
        return;
      }
      if (data.error === "phone_in_use") {
        setError(t("phoneInUse"));
        setShowContact(true);
        return;
      }
      setError(t("verifyError"));
      setErrorDetail(typeof data.error === "string" ? data.error : null);
      return;
    }

    setVerified(true);
    setVerifiedPhone(fullPhone);
    setChanging(false);
    setCodeSent(false);
    setCode("");
    router.refresh();
  }

  function countryLabel(c: CountryCode) {
    return `${c.flag} ${c.name} (${c.dial})`;
  }

  if (verified && !changing) {
    return (
      <fieldset className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-medium">{t("title")}</legend>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            <span dir="ltr">{verifiedPhone}</span>{" "}
            <span className="text-xs text-accent">{t("verifiedBadge")}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              const split = splitPhone(verifiedPhone);
              setChanging(true);
              setDial(split.dial);
              setNational(split.national);
              setCodeSent(false);
              setCode("");
              setError(null);
            }}
            className="text-xs text-muted underline"
          >
            {t("changeNumber")}
          </button>
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <legend className="px-1 text-sm font-medium">{t("title")}</legend>
      <p className="-mt-2 text-xs text-muted">{t("hint")}</p>

      <div className="flex flex-col gap-1.5 text-sm">
        {t("phoneLabel")}
        <div className="flex gap-2" dir="ltr">
          <label className="sr-only" htmlFor="phone-country">
            {t("countryLabel")}
          </label>
          <select
            id="phone-country"
            value={dial}
            disabled={codeSent}
            onChange={(e) => setDial(e.target.value)}
            className={`${inputClass} w-32 shrink-0`}
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.iso} value={c.dial} title={countryLabel(c)}>
                {c.flag} {c.dial}
              </option>
            ))}
          </select>
          <input
            type="tel"
            value={national}
            disabled={codeSent}
            placeholder={t("phonePlaceholder")}
            onChange={(e) => setNational(e.target.value)}
            className={`${inputClass} w-full`}
          />
        </div>
      </div>

      {!codeSent ? (
        <button
          type="button"
          onClick={handleSendCode}
          disabled={sending || !national.trim()}
          className="w-fit rounded-sm border border-border px-4 py-2 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
        >
          {sending ? t("sending") : t("sendCode")}
        </button>
      ) : (
        <>
          <p className="text-xs text-muted">
            {t("codeSentTo")} <span dir="ltr">{fullPhone}</span>
          </p>
          <label className="flex flex-col gap-1.5 text-sm">
            {t("codeLabel")}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              placeholder={t("codePlaceholder")}
              onChange={(e) => setCode(e.target.value)}
              className={inputClass}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleVerifyCode}
              disabled={verifying || !code}
              className="w-fit rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {verifying ? t("verifying") : t("verifyCode")}
            </button>
            <button
              type="button"
              onClick={() => {
                setCodeSent(false);
                setCode("");
                setError(null);
              }}
              className="text-xs text-muted underline"
            >
              {t("editNumber")}
            </button>
            <button
              type="button"
              onClick={handleSendCode}
              disabled={sending}
              className="text-xs text-muted underline disabled:opacity-50"
            >
              {t("resendCode")}
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="flex flex-col gap-1">
          <ErrorNote>{error}</ErrorNote>
          {showContact && (
            <Link
              href="/contact"
              className="w-fit text-sm font-medium text-primary underline"
            >
              {t("contactUs")}
            </Link>
          )}
          {errorDetail && (
            <p className="text-xs text-muted" dir="ltr">
              {errorDetail}
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
}
