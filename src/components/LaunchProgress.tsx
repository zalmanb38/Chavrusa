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
      <div className="border-t border-border pt-6">
        <p className="text-[11.5px] tracking-[0.14em] text-muted uppercase">
          {t("eyebrow")}
        </p>
        <h2 className="mt-2 max-w-[18em] text-[30px] leading-tight font-semibold text-balance">
          {t("heading")}
        </h2>
      </div>

      <div className="mt-8 grid gap-x-[34px] gap-y-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col gap-4">
          <p className="max-w-[34em] text-[16px] leading-relaxed text-muted">
            {t("body1")}
          </p>
          <p className="max-w-[34em] text-[16px] leading-relaxed text-muted">
            {t("body2")}
          </p>
          <p className="max-w-[34em] text-[16px] leading-relaxed text-muted">
            {t("body3")}
          </p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
            <Link
              href="/signup"
              className="bg-primary px-[26px] py-[14px] text-base font-semibold text-primary-foreground hover:bg-slate-600"
            >
              {t("joinButton")}
            </Link>
            <ShareButton tone="ink" label={t("shareButton")} />
          </div>
        </div>

        {/* The milestone itself: a rule, a bar and three numbers. Boxing it
            would make it a widget sitting on the page rather than a part
            of it. */}
        <div className="flex flex-col gap-4 border-t-2 border-brass pt-5 lg:border-t-0 lg:border-s lg:border-border lg:ps-10 lg:pt-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div className="flex flex-col gap-0.5">
              <MilestoneIcon className="mb-1 size-[22px] text-brass" />
              <h3 className="text-[19px] font-semibold">{t("milestoneLabel")}</h3>
              <p className="text-[13.5px] text-muted">{t("milestoneSub")}</p>
            </div>
            {/* Not a translated string: the same number in every language. */}
            <span className="text-[34px] leading-none text-brass">
              {percent}%
            </span>
          </div>

          <div
            className="h-2 w-full bg-surface"
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
            <span className="flex items-center gap-2 text-[15px]">
              <MemberIcon className="size-[18px] text-brass-deep" />
              {t("joinedCount", { count })}
            </span>
            <span className="text-[15px] text-brass-deep">
              {t("toGo", { remaining })}
            </span>
          </div>

          <p className="flex items-center gap-2 border-t border-border pt-3 text-[13.5px] text-muted">
            <GoalIcon className="size-[18px]" />
            {t("goalLine")}
          </p>
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
