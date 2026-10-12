import { createClient } from "@/lib/supabase/server";
import LaunchProgressModal from "@/components/LaunchProgressModal";

/**
 * The soft-launch progress popup, data half.
 *
 * It removes itself. Once the count reaches the goal this stops
 * rendering, so the push ends on its own rather than waiting on someone
 * to notice and ship a deploy — and the homepage never asks for help
 * reaching a number it has already passed.
 *
 * The count comes from a security-definer function over the same
 * population Browse shows, so the figure here can't claim more members
 * than a visitor would actually find.
 *
 * This stays a Server Component so the Supabase call never ships to the
 * client; the interactive popup itself (open state, dismissal memory,
 * escape/backdrop handling) lives in LaunchProgressModal.
 */
const LAUNCH_GOAL = 100;

export default async function LaunchProgress() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("active_member_count");

  if (error) {
    // A homepage that can't count is still a homepage. Better to drop the
    // popup than to show a progress bar at an invented zero.
    console.error("Member count unavailable", error);
    return null;
  }

  const count = Number(data ?? 0);
  if (count >= LAUNCH_GOAL) return null;

  const remaining = LAUNCH_GOAL - count;
  const percent = Math.round((count / LAUNCH_GOAL) * 100);

  return (
    <LaunchProgressModal
      goal={LAUNCH_GOAL}
      count={count}
      remaining={remaining}
      percent={percent}
    />
  );
}
