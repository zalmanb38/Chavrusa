"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import ErrorNote from "@/components/ErrorNote";

const buttonClass =
  "rounded-full border border-border px-3.5 py-1.5 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50";

export default function AdminUserActions({
  profileId,
  isActive,
  isSuspended,
  isVerified,
  isAdminUser,
}: {
  profileId: string;
  isActive: boolean;
  isSuspended: boolean;
  isVerified: boolean;
  isAdminUser: boolean;
}) {
  const t = useTranslations("Admin");
  const router = useRouter();

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function update(
    action: string,
    patch: Record<string, boolean>,
  ) {
    setLoading(action);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", profileId);

    setLoading(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    setLoading("delete");
    setError(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", profileId);

    setLoading(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.push("/admin/users");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-base font-medium">{t("actionsTitle")}</h2>

      {isAdminUser && (
        <p className="text-xs text-muted">{t("adminUserNotice")}</p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => update("active", { is_active: !isActive })}
          disabled={loading !== null}
          className={buttonClass}
        >
          {isActive ? t("deactivateProfile") : t("reactivateProfile")}
        </button>

        <button
          type="button"
          onClick={() => update("verified", { phone_verified: !isVerified })}
          disabled={loading !== null}
          className={buttonClass}
        >
          {isVerified ? t("unverifyProfile") : t("verifyProfile")}
        </button>

        <button
          type="button"
          onClick={() => update("suspended", { suspended: !isSuspended })}
          disabled={loading !== null || isAdminUser}
          className={
            isSuspended
              ? buttonClass
              : `${buttonClass} border-clay/40 text-clay hover:bg-clay/5`
          }
        >
          {isSuspended ? t("unsuspendUser") : t("suspendUser")}
        </button>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        {confirmingDelete ? (
          <div className="flex flex-col gap-2">
            <ErrorNote size="xs">{t("deleteConfirmQuestion")}</ErrorNote>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading !== null}
                className="rounded-full bg-clay px-3.5 py-1.5 text-sm font-semibold text-ivory disabled:opacity-50"
              >
                {t("deleteConfirmButton")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-full px-3.5 py-1.5 text-sm text-muted"
              >
                {t("cancelButton")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            disabled={loading !== null || isAdminUser}
            className="w-fit text-xs text-clay underline disabled:opacity-50"
          >
            {t("deleteProfile")}
          </button>
        )}
        <p className="text-xs text-muted">{t("deleteHint")}</p>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
}
