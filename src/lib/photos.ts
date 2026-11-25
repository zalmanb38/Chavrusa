// Profile photo helpers.
//
// Nothing here trusts a stored path on its own: a path is only turned
// into a viewable URL after the caller has established that the viewer is
// entitled to see it. URLs are short-lived and signed, so one that leaks
// stops working rather than becoming a permanent public link.

import { createAdminClient } from "@/lib/supabase/admin";

export const PHOTO_BUCKET = "profile-photos";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Long enough to load a page, short enough that a copied URL is useless. */
const SIGNED_URL_TTL_SECONDS = 120;

export type PhotoStatus = "pending" | "approved" | "rejected";

export interface ProfilePhoto {
  id: string;
  storage_path: string;
  status: PhotoStatus;
  moderation_verdict: string;
  moderation_detail: string;
  uploaded_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string;
}

export function extensionFor(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

/**
 * A signed URL for a stored photo, or null if one can't be produced.
 *
 * Callers must have already checked entitlement — this function does not
 * know who is asking, and will happily sign anything it is handed.
 */
export async function signedPhotoUrl(
  storagePath: string,
): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (error) {
      console.error("Could not sign photo URL", error);
      return null;
    }
    return data?.signedUrl ?? null;
  } catch (error) {
    // A missing service-role key shouldn't blank out a whole page; the
    // placeholder is a reasonable thing to fall back to.
    console.error("Photo signing unavailable", error);
    return null;
  }
}

/**
 * Signed URLs for several stored photos at once, keyed by owner id.
 *
 * Browse lists many people, and one signing round-trip each would make
 * the page's cost a function of how many of them have a photo. Supabase
 * signs a batch in one call, so this does.
 *
 * Entitlement is the caller's business here too: hand it only rows a
 * query under RLS actually returned.
 */
export async function signedPhotoUrls(
  rows: { id: string; storage_path: string }[],
): Promise<Map<string, string>> {
  const byId = new Map<string, string>();
  if (rows.length === 0) return byId;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(
        rows.map((row) => row.storage_path),
        SIGNED_URL_TTL_SECONDS,
      );

    if (error) {
      console.error("Could not sign photo URLs", error);
      return byId;
    }

    // The result comes back in the order the paths went in, and carries
    // its own per-path error — one unsignable file shouldn't blank the
    // other faces on the page.
    (data ?? []).forEach((signed, index) => {
      const owner = rows[index]?.id;
      if (owner && signed?.signedUrl && !signed.error) {
        byId.set(owner, signed.signedUrl);
      }
    });
  } catch (error) {
    console.error("Photo signing unavailable", error);
  }

  return byId;
}
