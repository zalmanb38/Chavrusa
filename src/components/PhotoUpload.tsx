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
  initialPublic,
}: {
  initialStatus: PhotoStatus | null;
  initialUrl: string | null;
  initialNote: string;
  /** Whether other members may see this photo on Browse. */
  initialPublic: boolean;
}) {
  const t = useTranslations("Photo");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<PhotoStatus | null>(initialStatus);
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(initialPublic);

  /**
   * The choice is applied straight away rather than on a Save button:
   * there is no form around this card, and a privacy setting that looks
   * set but isn't saved is the worst of the three states.
   *
   * It moves in the UI first and rolls back if the write fails, so
   * turning it off reads as instant — which is the direction where
   * waiting is least acceptable.
   */
  async function setVisibility(next: boolean) {
    const previous = isPublic;
    setIsPublic(next);
    setError(null);
    try {
      const response = await fetch("/api/photos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo_public: next }),
      });
      if (!response.ok) {
        setIsPublic(previous);
        setError(t("visibilityFailed"));
        return;
      }
      router.refresh();
    } catch {
      setIsPublic(previous);
      setError(t("visibilityFailed"));
    }
  }

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
    <section className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">{t("title")}</h2>
        <p className="text-xs text-muted">{t("hint")}</p>
      </div>

      <div className="flex items-center gap-3">
        {preview ? (
          /* Signed Supabase URLs are short-lived and host-specific, so
             they don't fit next/image's remotePatterns model. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={t("yourPhotoAlt")}
            className="h-16 w-16 shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <PhotoPlaceholder className="h-16 w-16 shrink-0" />
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
              className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? t("uploading") : status ? t("replace") : t("choose")}
            </button>

            {status && (
              <button
                type="button"
                disabled={busy}
                onClick={remove}
                className="rounded-sm border border-border px-4 py-2 text-sm disabled:opacity-60"
              >
                {t("remove")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Always, whether or not there is a photo on the card. This is a
          standing privacy choice rather than a step in uploading: it has
          to be findable when somebody comes to the page to change their
          mind, and a setting that appears and disappears with the photo
          is one they would have to go and upload something to read. */}
      <fieldset className="mt-1 flex flex-col gap-2 border-t border-border pt-3">
        <legend className="text-xs font-medium">{t("visibilityTitle")}</legend>
        {(
          [
            { value: false, label: t("private"), hint: t("privateHint") },
            { value: true, label: t("public"), hint: t("publicHint") },
          ] as const
        ).map((option) => (
          <label
            key={String(option.value)}
            className="flex items-start gap-2.5 text-xs"
          >
            <input
              type="radio"
              name="photo_public"
              className="mt-0.5 shrink-0 accent-primary"
              checked={isPublic === option.value}
              onChange={() => setVisibility(option.value)}
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{option.label}</span>
              <span className="text-muted">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

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
