// src/app.d.ts
//
// Ambient type declarations for SvelteKit
// Enterprise Actor Model Edition

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./DatabaseDefinitions";
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
      // ── Supabase clients ───────────────────────────────────
      // Created by supabaseHandle. Still required for data access
      // (resolveUserState, service-role operations) even though
      // session resolution has moved to authHandle + AuthProvider.
      // These are DATA clients, not auth clients.
      supabase: SupabaseClient<Database>;
      supabaseServiceRole: SupabaseClient<Database>;

      // ── Auth / session (unified source of truth) ───────────
      // Set by authHandle via AuthProvider (internal or supabase).
      // All downstream handles read ONLY from here — never from
      // raw cookies or the supabase client directly.
      auth: {
        session: AuthSession | null;
        user: AuthUser | null;
        amr: Array<{ method: string }>;
      };

      // ── Actor Model & User State ───────────────────────────
      userState: UserState | null;
      activeContext: ActiveContext | null;

      // ── Geo / Location Context ─────────────────────────────
      // Set by locationHandle. Typed as | null for safety on
      // routes that run before locationHandle (e.g. early CF errors).
      requestContext: RequestContext | null;
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

      /** Forwarded cookies for client-side Supabase initialization */
      cookies: Array<{ name: string; value: string }>;
    }
  }
}

export {};