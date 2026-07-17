// src/app.d.ts
//
// Ambient type declarations for SvelteKit
// Enterprise Actor Model Edition

import type { AuthUser, AuthSession } from '$lib/server/auth/types';
import type { UserState } from '$lib/features/auth/services/userState.server';

declare global {
  namespace App {

    // ──────────────────────────────────────────────────────────
    // RequestContext — Geo/location context from Cloudflare headers
    // Populated by locationHandle (never null after the hook runs)
    // ──────────────────────────────────────────────────────────
    interface RequestContext {
      /** ISO 3166-1 alpha-2 country code from Cloudflare, null if unknown/Tor */
      country: string | null;
      /** City name from Cloudflare cf-ipcity header, null if unavailable */
      city: string | null;
      /** Connecting IP from cf-connecting-ip, null if unavailable */
      ip: string | null;
      /**
       * Stable composite key: "{country}:{city}" e.g. "KE:Nairobi"
       * Used as: cache key, analytics dimension, SW prefetch key
       */
      regionKey: string;
      /**
       * Approximate geographic center inferred from city/country.
       * Used to seed the map bootstrap before the user interacts.
       * NOT derived from auth — purely from request headers.
       */
      approxCenter: { lat: number; lng: number };
      /**
       * H3 resolution for the initial bootstrap manifest.
       * 6 = unknown/coarse, 7 = city level (Nairobi default)
       * Client refines this as zoom level changes.
       */
      h3SeedResolution: number;
    }

    // ──────────────────────────────────────────────────────────
    // ContextType — valid runtime contexts a user can occupy
    // ──────────────────────────────────────────────────────────
    type ContextType =
      | "superAdmin"
      | "orgChair"
      | "orgStaff"
      | "crew"
      | "operator"
      | "passenger"
      | "guest";

    // ──────────────────────────────────────────────────────────
    // ActiveContext — resolved runtime context for a request
    // Populated by activateXContext() in hooks.server.ts
    // ──────────────────────────────────────────────────────────
    interface ActiveContext {
      /** The actor ID currently in use for this context */
      actorId?: string;
      /** The resolved type of the active actor */
      actorType?: ContextType;
      /** Flattened permission actions e.g. ['trip:create', 'fleet:view'] */
      permissions: string[];
      /** Temporary/delegated permissions (from delegated_authority table) */
      delegatedPermissions: string[];
      /** Policy group IDs this actor belongs to */
      policyGroups: string[];
      /** Assignments scoped to this actor (driver, conductor, org membership) */
      assignments: unknown[];
      /** Whether the user has an active Stripe paid plan */
      hasPaidPlan: boolean;
      /** The full resolved user state — available for reference */
      userState: UserState;
    }

    // ──────────────────────────────────────────────────────────
    // Locals — available via event.locals in server hooks / load fns
    // ──────────────────────────────────────────────────────────
    interface Locals {
      // ── Auth / session (unified source of truth) ───────────
      // Set by authHandle via auth-service's opaque-token verification
      // (/auth/verify or local session lookup). All downstream handles
      // read ONLY from here — never from raw cookies directly.
      auth: {
        session: AuthSession | null;
        user: AuthUser | null;
        amr: Array<{ method: string }>;
      };

      // ── Profile resolution ──────────────────────────────────
      // Set by sessionSyncHandle via resolveProfileId. This is the ONLY
      // identity value RLS trusts — see pg.ts's withProfileContext, which
      // sets app.current_profile_id from this value on every query.
      // Null does not mean "not logged in" — auth.user above is the
      // source of truth for that; null here means Postgres-side profile
      // resolution hasn't succeeded yet (e.g. Neon unreachable), and
      // routes/load functions that need Postgres data must check for
      // null explicitly rather than assuming it's always set.
      profileId: string | null;

      // ── Actor Model & User State ───────────────────────────
      userState: UserState | null;
      activeContext: ActiveContext | null;

      // ── Geo / Location Context ─────────────────────────────
      // Set by locationHandle. Typed as | null for safety on
      // routes that run before locationHandle (e.g. early CF errors).
      requestContext: RequestContext | null;

      // ── CSRF ───────────────────────────────────────────────
      // Set by csrfHandle on every GET/HEAD/OPTIONS request.
      // Exposed to pages via +layout.server.ts load function.
      csrfToken?: string;
    }

    // ──────────────────────────────────────────────────────────
    // PageData — passed from +page.server.ts / +layout.server.ts
    // to Svelte components via load functions
    // ──────────────────────────────────────────────────────────
    interface PageData {
      session: AuthSession | null;
      user: AuthUser | null;
      bootstrapped?: boolean;

      /** Full resolved identity state */
      userState: UserState | null;

      /** Active runtime context for permission checks and UI gating */
      activeContext: ActiveContext | null;

      /** Request-scoped geo context forwarded from locals.requestContext.
       *  Independent of auth — do not gate identity logic on this. */
      requestContext: RequestContext | null;

      /** CSRF token forwarded from locals — inject into forms as a hidden field */
      csrfToken?: string;
    }


  }
}

export {};
