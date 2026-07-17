// src/routes/(auth)/onboarding/+page.server.ts
//
// Intent picker — shown ONLY to self-registering passengers.
//
// WHO LANDS HERE:
//   - New users who signed up directly (no invite)
//   - They see one selectable intent: passenger
//   - ALL other roles (crew, operator, owner, org staff) arrive via
//     invite token which pre-sets kyc_intent — they skip this page
//     entirely and land on /onboarding/[intent] directly
//
// FLOW:
//   New signup → /onboarding (this page, passenger only)
//             → setIntent action → profile.kyc_intent = 'passenger'
//             → /onboarding/passenger (Ballerine kyc_light)
//             → /onboarding/passenger/pending
//             → webhook fires → actor created
//             → /onboarding/passenger/create_profile?rebootstrap=1
//
//   Invite flow → redeem_invite sets kyc_intent on profile
//              → /onboarding/[intent] (skips this page)
//              → Ballerine kyc_full_ntsa
//              → webhook fires → actor created (pending, org approves)
//              → /onboarding/[intent]/create_profile?rebootstrap=1
//
// WHY PASSENGER ONLY FOR SELF-REGISTRATION:
//   Roles (except PASSENGER) are organization-assigned — not user-selected.
//   An operator cannot self-declare as DRIVER. Only an org inviting them
//   can grant that capability. Onboarding = identity completion, not
//   role assignment.

import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";

import {
  SELF_SELECTABLE_INTENTS,
  type SelfSelectIntent,
  intentToDashboard,
} from "$lib/features/onboarding/intents";

import { setIntentSchema } from "$lib/security/onboarding.schema";
import { withProfileContext } from "$lib/server/pg";

export const load: PageServerLoad = async ({ locals }) => {
  const { userState } = locals;

  // AuthGuard + UserStateHandle should already have populated this.
  // If not, treat it as an invalid session.
  if (!userState) {
    throw redirect(303, "/login/sign_in");
  }

  // ── Already verified → send to the correct dashboard ───────────────────
  if (!userState.isGuest) {
    const intent = (userState.profile as any).kyc_intent as string | null;

    throw redirect(
      303,
      intentToDashboard((intent ?? "passenger") as any),
    );
  }

  // ── Mid-flow → continue onboarding ─────────────────────────────────────
  const kycIntent =
    (userState.profile as any).kyc_intent as string | null;

  if (kycIntent) {
    throw redirect(303, `/onboarding/${kycIntent}`);
  }

  // ── Fresh signup ───────────────────────────────────────────────────────
  return {};
};

export const actions: Actions = {
  setIntent: async ({ request, locals }) => {
    const { auth, profileId } = locals;

    if (!auth.user || !profileId) {
      throw redirect(303, "/login/sign_in");
    }

    const formData = await request.formData();

    const raw = {
      intent: formData.get("intent"),
    };

    const parsed = setIntentSchema.safeParse(raw);

    if (!parsed.success) {
      return fail(400, {
        error: parsed.error.flatten().fieldErrors,
      });
    }

    const intent = parsed.data.intent;

    // Only passengers can self-select.
    if (!SELF_SELECTABLE_INTENTS.includes(intent as SelfSelectIntent)) {
      return fail(400, {
        message:
          "Only passenger registration is available here. " +
          "Other roles require an invite from a registered organisation.",
      });
    }

    try {
      await withProfileContext(profileId, async (tx) => {
        const rows = await tx`
          UPDATE profiles
          SET
            kyc_intent = ${intent},
            onboarding_status = 'AWAITING_KYC'
          WHERE id = ${profileId}
          RETURNING id
        `;

        if (rows.length !== 1) {
          throw new Error(
            `Profile ${profileId} not found during onboarding.`,
          );
        }
      });
    } catch (err) {
      console.error(
        "[onboarding] Failed to persist onboarding intent:",
        err,
      );

      return fail(500, {
        message: "Failed to save intent. Please try again.",
      });
    }

    throw redirect(303, `/onboarding/${intent}`);
  },
};
