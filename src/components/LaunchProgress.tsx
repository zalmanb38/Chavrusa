import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import ShareButton from "@/components/ShareButton";

/**
 * The soft-launch progress section.
 *
 * It removes itself. Once the count reaches the goal the section stops
 * rendering, so the push ends on its own rather than waiting on someone
 * to notice and ship a deploy — and the homepage never asks for help
 * reaching a number it has already passed.
 *
 * The count comes from a security-definer function over the same
 * population Browse shows, so the figure here can't claim more members
 * than a visitor would actually find.
 */
const LAUNCH_GOAL = 100;

export default async function LaunchProgress() {
  const t = await getTranslations("Launch");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("active_member_count");

  if (error) {
    // A homepage that can't count is still a homepage. Better to drop the
    // section than to render a progress bar at an invented zero.
    console.error("Member count unavailable", error);
    return null;
  }

  const count = Number(data ?? 0);
  if (count >= LAUNCH_GOAL) return null;

  const remaining = LAUNCH_GOAL - count;
  const percent = Math.round((count / LAUNCH_GOAL) * 100);

  return (
    <section className="mx-auto w-full max-w-[1240px] px-6 pb-20 sm:px-14">
      {/* One column, not a two-up split: the copy and the milestone are one
          read, not a page spread with an island floating on the right. */}
      <div className="max-w-[42em] border-t border-border pt-5">
        <p className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.09em] text-brass-deep uppercase">
          <span className="flex size-6 items-center justify-center bg-brass-tint">
            <GroupIcon className="size-[14px]" />
          </span>
          {t("eyebrow")}
        </p>
        <h2 className="mt-2 max-w-[18em] text-[28px] leading-[1.15] font-semibold text-balance">
          {t("heading")}
        </h2>

        <div className="mt-3 flex flex-col gap-2 text-[16px] leading-[1.5]">
          <p className="text-muted">{t("body1")}</p>
          <p className="font-semibold">{t("body2")}</p>
          <p className="text-muted">{t("body3")}</p>
        </div>

        {/* The milestone itself: a rule, a bar and three numbers. Boxed as
            a card so it reads as the section's one visual anchor instead
            of another row of text. */}
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center bg-brass-tint">
                <MilestoneIcon className="size-[18px] text-brass-deep" />
              </span>
              <div>
                <h3 className="text-[15px] font-semibold">{t("milestoneLabel")}</h3>
                <p className="text-[12.5px] text-muted">{t("milestoneSub")}</p>
              </div>
            </div>
            {/* Not a translated string: the same number in every language. */}
            <span className="text-[26px] leading-none font-bold text-brass-deep">
              {percent}%
            </span>
          </div>

          <div
            className="h-2 w-full bg-background"
            role="progressbar"
            aria-valuenow={count}
            aria-valuemin={0}
            aria-valuemax={LAUNCH_GOAL}
            aria-label={t("goalLine")}
          >
            {/* Floored at a sliver so the bar reads as a bar from the first
                member rather than as an empty track. */}
            <div
              className="h-full bg-brass"
              style={{ width: `${Math.max(percent, 2)}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5 text-[14px]">
              <MemberIcon className="size-[15px] text-brass-deep" />
              {t("joinedCount", { count })}
            </span>
            <span className="text-[14px] font-semibold text-brass-deep">
              {t("toGo", { remaining })}
            </span>
          </div>

          <p className="flex items-center justify-center gap-1.5 border-t border-dashed border-border pt-2.5 text-center text-[12.5px] text-muted">
            <GoalIcon className="size-[13px] text-brass" />
            {t("goalLine")}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="bg-primary px-[26px] py-[14px] text-base font-semibold text-primary-foreground hover:bg-slate-600"
          >
            {t("joinButton")}
          </Link>
          <ShareButton
            tone="ink"
            label={t("shareButton")}
            className="border border-border px-[22px] py-[12.5px]"
          />
        </div>
      </div>
    </section>
  );
}

/* Line-art at ShareIcon's weight and in currentColor, so these read as
   the same hand rather than a second icon set. */

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

function MilestoneIcon({ className }: { className?: string }) {
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
      <path d="M6 21V3" />
      <path d="M6 4.5h11.5l-2.6 3.8 2.6 3.8H6" />
    </svg>
  );
}

/** Two overlapping people, for the "Help Us Grow" eyebrow. */
function GroupIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3.4 2.5-5.6 5.5-5.6s5.5 2.2 5.5 5.6" />
      <circle cx="17.5" cy="9" r="2.5" strokeWidth="1.6" />
      <path d="M14.8 19c0-2.6 1.6-4.4 3.9-4.4 1.9 0 3.3 1.1 3.8 2.9" strokeWidth="1.6" />
    </svg>
  );
}

function GoalIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="3.6" />
    </svg>
  );
}
