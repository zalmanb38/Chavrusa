"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

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

  const [verified, setVerified] = useState(initialVerified);
  const [verifiedPhone, setVerifiedPhone] = useState(initialPhone ?? "");
  const [changing, setChanging] = useState(false);

  const [phone, setPhone] = useState(initialPhone ?? "");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode() {
    setError(null);
    setSending(true);

    const res = await fetch("/api/phone/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setSending(false);

    if (!res.ok) {
      setError(data.error === "invalid_phone" ? t("invalidPhone") : t("sendError"));
      return;
    }
    setCodeSent(true);
  }

  async function handleVerifyCode() {
    setError(null);
    setVerifying(true);

    const res = await fetch("/api/phone/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    const data = await res.json();
    setVerifying(false);

    if (!res.ok) {
      setError(
        data.error === "code_incorrect" ? t("codeIncorrect") : t("verifyError"),
      );
      return;
    }

    setVerified(true);
    setVerifiedPhone(phone);
    setChanging(false);
    setCodeSent(false);
    setCode("");
    router.refresh();
  }

  if (verified && !changing) {
    return (
      <fieldset className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-medium">{t("title")}</legend>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            {verifiedPhone}{" "}
            <span className="text-xs text-accent">{t("verifiedBadge")}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setChanging(true);
              setPhone(verifiedPhone);
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

      <label className="flex flex-col gap-1.5 text-sm">
        {t("phoneLabel")}
        <input
          type="tel"
          value={phone}
          disabled={codeSent}
          placeholder={t("phonePlaceholder")}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
        />
      </label>

      {!codeSent ? (
        <button
          type="button"
          onClick={handleSendCode}
          disabled={sending || !phone}
          className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
        >
          {sending ? t("sending") : t("sendCode")}
        </button>
      ) : (
        <>
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
              className="w-fit rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {verifying ? t("verifying") : t("verifyCode")}
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

      {error && <p className="text-sm text-red-600">{error}</p>}
    </fieldset>
  );
}
