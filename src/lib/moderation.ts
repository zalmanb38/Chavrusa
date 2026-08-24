// Automated first pass over an uploaded photo.
//
// This is a filter, never an authority. Its only job is to sort uploads
// into "clean enough to let through" and "a person should look at this".
// Every path that isn't a confident pass ends up in the admin queue, and
// nothing here can reject a photo without a human being able to see the
// decision and reverse it.
//
// It fails closed in every direction that matters:
//   * no provider configured  -> 'unconfigured' -> human review
//   * provider errored/timed out -> 'error'     -> human review
//   * provider unsure         -> 'borderline'   -> human review
// So the feature works correctly today, with no API key set, by sending
// everything to a person. Adding a key only makes the clean cases faster.

export type ModerationVerdict =
  | "unconfigured"
  | "clean"
  | "borderline"
  | "rejected"
  | "error";

export interface ModerationResult {
  verdict: ModerationVerdict;
  /** Short human-readable note, shown to the admin reviewing the queue. */
  detail: string;
}

/**
 * Google Cloud Vision's SafeSearch likelihood scale, ordered. Chosen as
 * the first provider because it's a single POST with an API key — no SDK,
 * no IAM, no extra service to run — and its five categories map cleanly
 * onto the three outcomes this queue needs.
 */
const LIKELIHOOD = [
  "VERY_UNLIKELY",
  "UNLIKELY",
  "POSSIBLE",
  "LIKELY",
  "VERY_LIKELY",
] as const;

type Likelihood = (typeof LIKELIHOOD)[number] | "UNKNOWN";

function rank(value: Likelihood): number {
  const index = LIKELIHOOD.indexOf(value as (typeof LIKELIHOOD)[number]);
  // UNKNOWN sorts as POSSIBLE: a category the provider couldn't judge is
  // exactly the case a person should look at.
  return index === -1 ? 2 : index;
}

/** Categories that decide the verdict, and how much of each is tolerated. */
const CATEGORIES = ["adult", "racy", "violence"] as const;

const REJECT_AT = 3; // LIKELY or above
const REVIEW_AT = 2; // POSSIBLE or above

const TIMEOUT_MS = 10_000;

export function moderationConfigured(): boolean {
  return Boolean(process.env.GOOGLE_VISION_API_KEY);
}

export async function moderateImage(
  bytes: ArrayBuffer,
  contentType: string,
): Promise<ModerationResult> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    return {
      verdict: "unconfigured",
      detail: "No moderation provider configured; queued for review.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          requests: [
            {
              image: { content: Buffer.from(bytes).toString("base64") },
              features: [{ type: "SAFE_SEARCH_DETECTION" }],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      return {
        verdict: "error",
        // The provider's own message, not a friendly rewrite of it — a
        // burned quota and a bad key need different fixes.
        detail: `Vision API ${response.status}: ${body.slice(0, 200)}`,
      };
    }

    const json = await response.json();
    const annotation = json?.responses?.[0]?.safeSearchAnnotation as
      | Record<string, Likelihood>
      | undefined;

    if (!annotation) {
      return {
        verdict: "error",
        detail: "Vision API returned no safeSearchAnnotation.",
      };
    }

    const scored = CATEGORIES.map((category) => ({
      category,
      value: annotation[category] ?? "UNKNOWN",
    }));
    const worst = Math.max(...scored.map((s) => rank(s.value)));
    const summary = scored.map((s) => `${s.category}=${s.value}`).join(", ");

    if (worst >= REJECT_AT) return { verdict: "rejected", detail: summary };
    if (worst >= REVIEW_AT) return { verdict: "borderline", detail: summary };
    return { verdict: "clean", detail: summary };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      verdict: "error",
      detail: aborted
        ? `Vision API timed out after ${TIMEOUT_MS}ms.`
        : `Vision API request failed: ${String(error).slice(0, 200)}`,
    };
  } finally {
    clearTimeout(timer);
  }
  // contentType is accepted for future providers that need it declared;
  // Vision infers the format from the bytes.
  void contentType;
}

/**
 * Whether a verdict may skip the queue.
 *
 * Only a confident pass qualifies, and only when auto-approval is switched
 * on. It defaults OFF: a new site would rather have a slow queue than an
 * unreviewed photo, and turning it on should be a decision someone makes
 * once they trust the filter's accuracy on real uploads.
 */
export function mayAutoApprove(verdict: ModerationVerdict): boolean {
  return verdict === "clean" && process.env.PHOTO_AUTO_APPROVE === "true";
}
