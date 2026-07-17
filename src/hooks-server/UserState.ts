/**
 * src/hooks-server/UserState.ts
 *
 * THE BRAIN — resolves domain state for authenticated users.
 *
 * Responsibilities:
 *   • Resolve the authenticated user's complete domain state.
 *   • Keep users inside onboarding until onboarding is complete.
 *   • Activate the user's operational context after verification.
 *
 * ROUTING CONTRACT
 *
 *   auth.user == null
 *       → handled earlier by authGuardHandle
 *
 *   userState == null
 *       → allow request to continue (profile resolution failed)
 *
 *   userState.isGuest
 *       → onboarding
 *
 *   !userState.isVerified
 *       → onboarding
 *
 *   userState.isVerified
 *       → application
 *
 * resolveUserState() is the single authority that decides whether a user
 * is considered a guest or fully verified. No other layer should attempt
 * to infer onboarding completion independently.
 *
 * Identity source:
 *   event.locals.auth.user
 *
 * Database identity:
 *   event.locals.profileId
 *
 * Placement:
 *   LAST in the request pipeline.
 */

import {
  redirect,
  isRedirect,
  type Handle,
} from "@sveltejs/kit";

import type { App } from "../../app";

import { withProfileContext } from "$lib/server/pg";
import { resolveUserState } from "$lib/features/auth/services/userState.server";
import { activateXContext } from "$lib/features/auth/contexts/context.template";

// ─────────────────────────────────────────────────────────────────────────────
// Route helpers
// ─────────────────────────────────────────────────────────────────────────────

const PUBLIC_PATHS = [
  "/login",
  "/verify",
  "/auth/callback",
  "/auth/confirm",
] as const;

const ONBOARDING_PREFIX = "/onboarding";

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname.startsWith(p));

const isOnboardingPath = (pathname: string) =>
  pathname.startsWith(ONBOARDING_PREFIX);

// ─────────────────────────────────────────────────────────────────────────────
// Handle
// ─────────────────────────────────────────────────────────────────────────────

export const userStateHandle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;
  const user = event.locals.auth.user;

  // Public pages never require domain resolution.
  if (!user || isPublicPath(pathname)) {
    return resolve(event);
  }

  const { profileId } = event.locals;

  // sessionSyncHandle already logged the root cause.
  // We deliberately do not guess a profile id or fabricate a userState.
  if (!profileId) {
    console.error(
      "[hooks:userStateHandle] Skipping resolution — no profileId for user:",
      user.id,
    );

    return resolve(event);
  }

  try {
    const state = await withProfileContext(profileId, (tx) =>
      resolveUserState(tx, profileId),
    );

    event.locals.userState = state;

    const profile = state.profile as any;

    const kycIntent = profile.kyc_intent as string | null;
    const kycStatus = profile.kyc_status as string | null;
    const onboardingStatus =
      profile.onboarding_status as string | null;

    // ───────────────────────────────────────────────────────────────────
    // Guest trap
    //
    // Guests are authenticated users who have not yet completed
    // onboarding. They may never enter /app.
    // ───────────────────────────────────────────────────────────────────

    if (state.isGuest && !isOnboardingPath(pathname)) {
      throw redirect(
        303,
        kycIntent
          ? `/onboarding/${kycIntent}`
          : "/onboarding",
      );
    }

    // ───────────────────────────────────────────────────────────────────
    // KYC still running
    // ───────────────────────────────────────────────────────────────────

    if (
      !state.isVerified &&
      onboardingStatus === "AWAITING_KYC" &&
      kycStatus === "pending" &&
      !isOnboardingPath(pathname)
    ) {
      throw redirect(
        303,
        `/onboarding/${kycIntent ?? "passenger"}`,
      );
    }

    // ───────────────────────────────────────────────────────────────────
    // KYC rejected
    // ───────────────────────────────────────────────────────────────────

    if (
      !state.isVerified &&
      kycStatus === "rejected" &&
      !isOnboardingPath(pathname)
    ) {
      throw redirect(
        303,
        `/onboarding/${kycIntent ?? "passenger"}?retry=true`,
      );
    }

    // ───────────────────────────────────────────────────────────────────
    // Verified users only.
    // Resolve their active operational context.
    // ───────────────────────────────────────────────────────────────────

    if (state.isVerified) {
      const preferredContext = (
        event.cookies.get("active_context") ?? "passenger"
      ) as App.ContextType;

      const preferredOrgId =
        event.cookies.get("active_org_id") ?? undefined;

      let activeContext = activateXContext(
        state,
        preferredContext,
        {
          orgId: preferredOrgId,
        },
      );

      // Never leave activeContext unset.
      if (!activeContext) {
        activeContext = activateXContext(
          state,
          "passenger",
        );
      }

      event.locals.activeContext = activeContext;
    }
  } catch (err) {
    // Redirects are part of normal control flow.
    if (isRedirect(err)) {
      throw err;
    }

    console.error(
      "[hooks:userStateHandle] Resolution failed:",
      err,
    );
  }

  return resolve(event);
};
