/**
 * src/routes/(marketing)/login/+layout.server.ts
 *
 * Server layout for all /login/* pages.
 *
 * Responsibility:
 *   Keep authenticated users out of the login UI by routing them to the
 *   correct next step based on the already-resolved domain state.
 *
 * PIPELINE
 *   authHandle
 *     ↓
 *   sessionSyncHandle
 *     ↓
 *   authGuardHandle
 *     ↓
 *   userStateHandle
 *     ↓
 *   this layout
 *
 * By the time this layout executes:
 *
 *   • locals.auth.user tells us whether a valid authenticated session exists.
 *   • locals.userState represents the authoritative domain state for that
 *     authenticated user.
 *
 * ROUTING CONTRACT
 *
 *   Unauthenticated
 *       → show login pages
 *
 *   Authenticated + guest
 *       → onboarding flow
 *
 *   Authenticated + verified
 *       → role dashboard
 *
 * We intentionally DO NOT route directly to /app/dashboard simply because
 * an authenticated session exists. Authentication proves identity; it does
 * not prove onboarding has completed.
 */

import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

import { intentToDashboard } from "$lib/features/onboarding/intents";

export const load: LayoutServerLoad = async ({
  locals: { auth, userState, csrfToken },
  cookies,
  url,
}) => {
  // ─────────────────────────────────────────────────────────────────────
  // No authenticated session.
  // Stay on the login pages.
  // ─────────────────────────────────────────────────────────────────────
  if (!auth.user) {
    return {
      url: url.origin,
      cookies: cookies.getAll(),
      csrfToken,
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Authenticated but onboarding is incomplete (or userState could not
  // be resolved). Treat both as "continue onboarding".
  //
  // userStateHandle only skips resolution if profile resolution failed,
  // so this is a defensive fallback rather than a normal code path.
  // Never send these users into /app.
  // ─────────────────────────────────────────────────────────────────────
  if (!userState || userState.isGuest) {
    const intent = (userState?.profile as any)?.kyc_intent as string | null;

    throw redirect(
      303,
      intent ? `/onboarding/${intent}` : "/onboarding",
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Fully onboarded.
  // userState.isVerified is the authoritative signal that the user may
  // enter the application.
  // ─────────────────────────────────────────────────────────────────────
  const intent = (userState.profile as any).kyc_intent as string | null;

  throw redirect(
    303,
    intentToDashboard((intent ?? "passenger") as any),
  );
};
