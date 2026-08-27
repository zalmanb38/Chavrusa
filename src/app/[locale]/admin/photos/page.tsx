import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import AdminNav from "@/components/AdminNav";
import AdminPhotoActions from "@/components/AdminPhotoActions";
import PhotoPlaceholder from "@/components/PhotoPlaceholder";
import { signedPhotoUrl, type ProfilePhoto } from "@/lib/photos";
import { Link } from "@/i18n/navigation";

type QueueRow = ProfilePhoto;

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

  // Names are fetched separately rather than embedded. profile_photos has
  // two foreign keys to profiles — `id` and `reviewed_by` — so a bare
  // `profiles(name)` embed is ambiguous and PostgREST rejects it outright
  // (PGRST201). A second query sidesteps relationship inference entirely.
  const { data, error } = await supabase
    .from("profile_photos")
    .select(
      "id, storage_path, status, moderation_verdict, moderation_detail, uploaded_at, reviewed_by, reviewed_at, review_note",
    )
    .eq("status", status)
    .order("uploaded_at", { ascending: true });

  if (error) console.error("Admin photo queue query failed", error);

  const rows = (data ?? []) as unknown as QueueRow[];

  const { data: owners, error: ownersError } = rows.length
    ? await supabase
        .from("profiles")
        .select("id, name")
        .in(
          "id",
          rows.map((row) => row.id),
        )
    : { data: [], error: null };

  if (ownersError) console.error("Admin photo owner lookup failed", ownersError);

  // Counts for every status, not just the one being viewed. An empty tab
  // is ambiguous on its own — it can't distinguish "none rejected" from
  // "the row didn't end up rejected" — and the totals settle that at a
  // glance rather than needing a database query to find out.
  const [pendingCount, approvedCount, rejectedCount] = await Promise.all(
    (["pending", "approved", "rejected"] as const).map(async (s) => {
      const { count } = await supabase
        .from("profile_photos")
        .select("id", { count: "exact", head: true })
        .eq("status", s);
      return count ?? 0;
    }),
  );

  const countFor = {
    pending: pendingCount,
    approved: approvedCount,
    rejected: rejectedCount,
  } as const;

  const nameById = new Map(
    ((owners ?? []) as { id: string; name: string }[]).map((o) => [o.id, o.name]),
  );

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
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-6 py-12 sm:px-10">
      <h1 className="text-[2rem] font-semibold sm:text-[34px]">{t("photosTitle")}</h1>
      <AdminNav />

      <p className="text-sm text-muted">{t("photosIntro")}</p>

      <div className="flex gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={{ pathname: "/admin/photos", query: { status: tab } }}
            className={
              tab === status
                ? "rounded-sm bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
                : "rounded-sm border border-border px-4 py-1.5 text-sm"
            }
          >
            {tPhoto(`status_${tab}`)} ({countFor[tab]})
          </Link>
        ))}
      </div>

      {/*
        A failed query and an empty queue are not the same thing, and
        showing "nothing here" for both is how this bug hid in the first
        place. Say which one it is.
      */}
      {error ? (
        <p className="rounded-2xl border border-border bg-surface p-5 text-sm">
          {t("photosQueryFailed")}
        </p>
      ) : withUrls.length === 0 ? (
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
                  {nameById.get(row.id) || t("unknownUser")}
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
