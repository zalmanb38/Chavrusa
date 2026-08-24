import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import AdminNav from "@/components/AdminNav";
import AdminPhotoActions from "@/components/AdminPhotoActions";
import PhotoPlaceholder from "@/components/PhotoPlaceholder";
import { signedPhotoUrl, type ProfilePhoto } from "@/lib/photos";
import { Link } from "@/i18n/navigation";

type QueueRow = ProfilePhoto & { profiles: { name: string } | null };

export default async function AdminPhotosPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { status: statusFilter } = await searchParams;

  const t = await getTranslations("Admin");
  const tPhoto = await getTranslations("Photo");
  const { supabase } = await requireAdmin(locale);

  // Pending first by default — the queue exists to be emptied, and a
  // reviewed photo is only interesting when someone goes looking for it.
  const status =
    statusFilter === "approved" || statusFilter === "rejected"
      ? statusFilter
      : "pending";

  const { data, error } = await supabase
    .from("profile_photos")
    .select(
      "id, storage_path, status, moderation_verdict, moderation_detail, uploaded_at, reviewed_by, reviewed_at, review_note, profiles(name)",
    )
    .eq("status", status)
    .order("uploaded_at", { ascending: true });

  if (error) console.error("Admin photo queue query failed", error);

  const rows = (data ?? []) as unknown as QueueRow[];

  // Rejected rows have had their file removed, so there is nothing to sign.
  const withUrls = await Promise.all(
    rows.map(async (row) => ({
      row,
      url:
        row.status === "rejected"
          ? null
          : await signedPhotoUrl(row.storage_path),
    })),
  );

  const TABS = ["pending", "approved", "rejected"] as const;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-12">
      <h1 className="font-serif text-3xl font-medium">{t("photosTitle")}</h1>
      <AdminNav />

      <p className="text-sm text-muted">{t("photosIntro")}</p>

      <div className="flex gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={{ pathname: "/admin/photos", query: { status: tab } }}
            className={
              tab === status
                ? "rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
                : "rounded-full border border-border px-4 py-1.5 text-sm"
            }
          >
            {tPhoto(`status_${tab}`)}
          </Link>
        ))}
      </div>

      {withUrls.length === 0 ? (
        <p className="text-sm text-muted">{t("photosEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {withUrls.map(({ row, url }) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-start"
            >
              {url ? (
                /* Signed Supabase URLs are short-lived and host-specific,
                   so they don't fit next/image's remotePatterns model. */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt=""
                  className="h-40 w-40 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <PhotoPlaceholder className="h-40 w-40 shrink-0" />
              )}

              <div className="flex flex-1 flex-col gap-2 text-sm">
                <Link
                  href={`/admin/profiles/${row.id}`}
                  className="font-medium underline"
                >
                  {row.profiles?.name || t("unknownUser")}
                </Link>

                <p className="text-xs text-muted">
                  {t("photoUploadedAt")}:{" "}
                  {new Date(row.uploaded_at).toLocaleString(locale)}
                </p>

                <p className="text-xs">
                  {t("photoAutoCheck")}:{" "}
                  <span className="font-medium">
                    {tPhoto(`verdict_${row.moderation_verdict}`)}
                  </span>
                </p>
                {row.moderation_detail && (
                  <p className="text-xs text-muted" dir="ltr">
                    {row.moderation_detail}
                  </p>
                )}

                {row.reviewed_at && (
                  <p className="text-xs text-muted">
                    {t("photoReviewedAt")}:{" "}
                    {new Date(row.reviewed_at).toLocaleString(locale)}
                    {row.review_note ? ` — ${row.review_note}` : ""}
                  </p>
                )}

                <AdminPhotoActions photoId={row.id} status={row.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
