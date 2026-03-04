// src/app.d.ts
//
// Ambient type declarations for SvelteKit + Supabase
// Federated Governance Edition (Hardened)
//
// CHANGES from previous version:
//   - Locals.user is now reliably populated by authGuardHandle
//     (validated via getUser(), not just cookie session)
//   - PageData.profile typed to match bootstrap_session() output
//   - Removed supabase from PageData (never passed directly to pages,
//     only available via data.supabase from layout load)

import type { Session, SupabaseClient, User } from "@supabase/supabase-js"
import type { Database } from "./DatabaseDefinitions"
import type { AuthenticatorAssuranceLevelEntry } from "@supabase/supabase-js"

declare global {
  namespace App {
    // ──────────────────────────────────────────────────────────
    // Locals — available via event.locals in server hooks / loads
    // ──────────────────────────────────────────────────────────
    interface Locals {
      /** User-scoped Supabase client (anon key + JWT from cookies).
       *  RLS applies — runs as the authenticated user. */
      supabase: SupabaseClient<Database>

      /** Service role client — bypasses RLS entirely.
       *  Use for: invite_tokens INSERT, Stripe webhooks, admin ops.
       *  NEVER expose to the client. */
      supabaseServiceRole: SupabaseClient<Database>

      /** Validates session + user via getUser() + includes MFA/AMR.
       *  More secure than raw getSession() (which only reads cookies). */
      safeGetSession: () => Promise<{
        session: Session | null
        user: User | null
        amr: AuthenticatorAssuranceLevelEntry[] | null
      }>

      /** Populated by authGuardHandle on protected routes.
       *  null on public routes (marketing pages, login, etc). */
      session: Session | null

      /** Validated user object from getUser() — populated alongside session.
       *  null on public routes. Use this instead of session.user for
       *  server-side operations (it's been validated against the auth server). */
      user: User | null
    }

    // ──────────────────────────────────────────────────────────
    // PageData — from +page.server.ts / +layout.server.ts
    //            to +page.svelte / +layout.svelte
    // ──────────────────────────────────────────────────────────
    interface PageData {
      session: Session | null
      user: User | null
      bootstrapped?: boolean
    }

    // interface Error {}
    // interface Platform {}
  }
}

export {}