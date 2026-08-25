"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import PhotoPlaceholder from "@/components/PhotoPlaceholder";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  type PhotoStatus,
} from "@/lib/photos";
import ErrorNote from "@/components/ErrorNote";

/**
 * The owner's view of their own photo.
 *
 * Deliberately shows the pending/rejected state rather than hiding it:
 * someone who uploaded a photo and sees nothing happen will upload it
 * again, and a queue full of duplicates helps nobody.
 */
export default function PhotoUpload({
  initialStatus,
  initialUrl,
  initialNote,
}: {
  initialStatus: PhotoStatus | null;
  initialUrl: string | null;
  initialNote: string;
}) {
  const t = useTranslations("Photo");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<PhotoStatus | null>(initialStatus);
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);

    if (
      !ALLOWED_PHOTO_TYPES.includes(
        file.type as (typeof ALLOWED_PHOTO_TYPES)[number],
      )
    ) {
      setError(t("badType"));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError(t("tooLarge"));
      return;
    }

    setBusy(true);
    const body = new FormData();
    body.append("photo", file);

    try {
      const response = await fetch("/api/photos", { method: "POST", body });
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Surface which check failed rather than one generic line — a file
        // that's too big and a file of the wrong type need different fixes.
        setError(
          json.error === "too_large"
            ? t("tooLarge")
            : json.error === "bad_type"
              ? t("badType")
              : t("uploadFailed"),
        );
        return;
      }

      setStatus(json.status as PhotoStatus);
      setPreview(URL.createObjectURL(file));
      router.refresh();
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/photos", { method: "DELETE" });
      setStatus(null);
      setPreview(null);
      router.refresh();
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">{t("title")}</h2>
        <p className="text-xs text-muted">{t("hint")}</p>
      </div>

      <div className="flex items-start gap-4">
        {preview ? (
          /* Signed Supabase URLs are short-lived and host-specific, so
             they don't fit next/image's remotePatterns model. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={t("yourPhotoAlt")}
            className="h-28 w-28 rounded-2xl object-cover"
          />
        ) : (
          <PhotoPlaceholder className="h-28 w-28" />
        )}

        <div className="flex flex-col gap-2">
          {status === "pending" && (
            <p className="text-xs text-muted">{t("statusPending")}</p>
          )}
          {status === "approved" && (
            <p className="text-xs text-muted">{t("statusApproved")}</p>
          )}
          {status === "rejected" && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted">{t("statusRejected")}</p>
              {initialNote && (
                <p className="text-xs text-muted">
                  {t("reviewNote")}: {initialNote}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? t("uploading") : status ? t("replace") : t("choose")}
            </button>

            {status && (
              <button
                type="button"
                disabled={busy}
                onClick={remove}
                className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-60"
              >
                {t("remove")}
              </button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_PHOTO_TYPES.join(",")}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />

      {error && <ErrorNote>{error}</ErrorNote>}
    </section>
  );
}
