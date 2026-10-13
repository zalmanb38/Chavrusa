import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getLaunchProgress } from "@/lib/launch-progress";

/**
 * The persistent twin of the soft-launch popup.
 *
 * The popup only ever shows once per browser — a dismissal, or simply a
 * repeat visit, means it never appears again, and with it the live
 * member count disappears too. This sits in the closing CTA band
 * instead, where anyone curious can find the same numbers on every
 * visit. It borrows the popup's heading and stat line rather than
 * inventing new copy, but drops the popup's pitch paragraphs — this is
 * a standing fixture of the page, not a one-time interruption, so it
 * stays to the numbers and a single direct way to act on them.
 *
 * Same data source as the popup (getLaunchProgress(), cached per
 * request) and the same rule: once the goal is met, this stops
 * rendering rather than reporting a number the page has already passed.
 */
export default async function LaunchStatsCard() {
  const progress = await getLaunchProgress();
  if (!progress) return null;

  const t = await getTranslations("Launch");
  const { goal, count, remaining, percent } = progress;

  return (
    <div className="flex h-full flex-col justify-center gap-4 border border-ivory/20 bg-ivory/[0.06] p-7">
      <h3 className="text-[17px] leading-[1.3] font-semibold text-ivory">
        {t("heading")}
      </h3>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[13.5px] text-ivory/85">
            <MemberIcon className="size-[13px] text-brass" />
            {t("joinedCount", { count })}
          </span>
          {/* Not a translated string: the same number in every language. */}
          <span className="text-[26px] leading-none font-bold text-brass">
            {percent}%
          </span>
        </div>

        <div
          className="h-[7px] w-full bg-ivory/15"
          role="progressbar"
          aria-valuenow={count}
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-label={t("goalLine")}
        >
          {/* Floored at a sliver so the bar reads as a bar from the first
              member rather than as an empty track. */}
          <div
            className="h-full bg-brass"
            style={{ width: `${Math.max(percent, 2)}%` }}
          />
        </div>

        <p className="text-[13px] text-ivory/75">{t("toGo", { remaining })}</p>
      </div>

      {/* Outlined rather than brass-filled: the band's email form already
          has a solid brass button, and a second one here would compete
          with it for attention instead of reading as a lighter-weight
          second path to the same place. */}
      <Link
        href="/signup"
        className="flex min-h-[44px] items-center justify-center border border-ivory/50 text-[14px] font-semibold text-ivory hover:bg-ivory/10"
      >
        {t("joinButton")}
      </Link>
    </div>
  );
}

/* Matches LaunchProgressModal's MemberIcon exactly, so the two read as
   the same mark wherever they appear. */
function MemberIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c0-3.3 3.1-5.6 7-5.6s7 2.3 7 5.6" />
    </svg>
  );
}
