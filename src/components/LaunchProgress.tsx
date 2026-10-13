import { getLaunchProgress } from "@/lib/launch-progress";
import LaunchProgressModal from "@/components/LaunchProgressModal";

/**
 * The soft-launch progress popup, data half.
 *
 * It removes itself. Once the count reaches the goal this stops
 * rendering, so the push ends on its own rather than waiting on someone
 * to notice and ship a deploy — and the homepage never asks for help
 * reaching a number it has already passed.
 *
 * The count itself comes from getLaunchProgress(), shared with the
 * closing-band stats card so the two only cost one Supabase round-trip
 * between them. This stays a Server Component so that call never ships
 * to the client; the interactive popup itself (open state, dismissal
 * memory, escape/backdrop handling) lives in LaunchProgressModal.
 */
export default async function LaunchProgress() {
  const progress = await getLaunchProgress();
  if (!progress) return null;

  return (
    <LaunchProgressModal
      goal={progress.goal}
      count={progress.count}
      remaining={progress.remaining}
      percent={progress.percent}
    />
  );
}
