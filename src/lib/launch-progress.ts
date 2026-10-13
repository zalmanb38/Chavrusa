import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

const LAUNCH_GOAL = 100;

export type LaunchProgressData = {
  goal: number;
  count: number;
  remaining: number;
  percent: number;
};

/**
 * The soft-launch member count, shared by every place on the homepage
 * that shows it: the popup and the closing-band stats card. Wrapped in
 * React's cache() so both Server Components rendering in the same
 * request share one Supabase round-trip instead of one each.
 *
 * Returns null both on a fetch error and once the goal is met — callers
 * don't need to tell those apart, since in both cases the right thing is
 * to stop showing the push.
 */
export const getLaunchProgress = cache(
  async (): Promise<LaunchProgressData | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("active_member_count");

    if (error) {
      console.error("Member count unavailable", error);
      return null;
    }

    const count = Number(data ?? 0);
    if (count >= LAUNCH_GOAL) return null;

    return {
      goal: LAUNCH_GOAL,
      count,
      remaining: LAUNCH_GOAL - count,
      percent: Math.round((count / LAUNCH_GOAL) * 100),
    };
  },
);
