/**
 * One switch for how much weight the site puts on phone verification.
 *
 * Until launch, a phone number is optional: a profile is discoverable as
 * soon as it has a name and the looking switch is on, and the site does
 * not sort people into verified and unverified in anything a member can
 * see. Verification still exists, still works, and is still what the
 * admin panel reports on — it is simply not a gate.
 *
 * The reason is trust in the other direction: a brand-new site asking for
 * a phone number before it has shown anybody anything loses more people
 * at the door than fake accounts it keeps out.
 *
 * Turning it back on is one value. Either set
 * NEXT_PUBLIC_REQUIRE_PHONE_VERIFICATION=true in the Vercel project (and
 * redeploy — NEXT_PUBLIC_* is baked in at build time), or flip the
 * fallback below to true. Everything that depends on it reads this
 * constant, so nothing else has to change:
 *
 *   - Browse only lists verified profiles, and tells an unverified
 *     viewer that nobody can see them back
 *   - the profile page marks the phone step REQUIRED, in the warning
 *     styling, with the notice about staying hidden
 *
 * Counts are the one thing it does not reach: subject_counts(),
 * active_member_count() and discoverable_learner_count() count every
 * named, active member either way (migration 0033). They are membership
 * figures, and a number that fell when the rule changed would report the
 * opposite of what happened.
 */
export const PHONE_VERIFICATION_REQUIRED =
  process.env.NEXT_PUBLIC_REQUIRE_PHONE_VERIFICATION === "true";

/**
 * The membership figure at which the plan is to require it again — the
 * same 100 the homepage progress band counts towards. Documentation, not
 * a trigger: profiles disappearing from Browse the moment a hundredth
 * member signed up is not something to have happen unattended.
 */
export const PHONE_VERIFICATION_MEMBER_GOAL = 100;
