// src/app.d.ts
//
// Ambient type declarations for SvelteKit + Supabase
// Enterprise Actor Model Edition
//
// CHANGES from previous version:
//   - Added UserState + ActiveContext to Locals (populated by hooks.server.ts)
//   - Added userState + activeContext + cookies to PageData
//   - Defined ContextType union and ActiveContext interface in App namespace
//   - Locals.user remains validated via getUser() (not cookie session)
//   - activeContext replaces ad-hoc role inference at page level
import type { Session, SupabaseClient, User } from "@supabase/supabase-js"
import type { Database } from "./DatabaseDefinitions"
import type { AuthenticatorAssuranceLevelEntry } from "@supabase/supabase-js"
import type { UserState } from "$lib/features/auth/userState.server"

declare global {
  namespace App {
    // ──────────────────────────────────────────────────────────
    // ContextType — the valid runtime contexts a user can occupy
    // ──────────────────────────────────────────────────────────
    type ContextType =
      | "superAdmin"
      | "orgChair"
      | "orgStaff"
      | "crew"
      | "operator"
      | "passenger"
      | "guest"

    // ──────────────────────────────────────────────────────────
    // ActiveContext — the resolved runtime context for a request
    // Populated by activateXContext() inside hooks.server.ts
    // ──────────────────────────────────────────────────────────
    interface ActiveContext {
      /** The actor ID currently in use for this context */
      actorId?: string
      /** The resolved type of the active actor */
      actorType?: ContextType
      /** Flattened permission actions e.g. ['trip:create', 'fleet:view'] */
      permissions: string[]
      /** Temporary/delegated permissions (from delegated_authority table) */
      delegatedPermissions: string[]
      /** Policy group IDs this actor belongs to */
      policyGroups: string[]
      /** Assignments scoped to this actor (driver, conductor, org membership) */
      assignments: unknown[]
      /** Whether the user has an active Stripe paid plan */
      hasPaidPlan: boolean
      /** The full resolved user state — available for reference but not for DB queries */
      userState: UserState
    }

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
      /** Full resolved identity state — populated by userStateHandle in hooks.server.ts.
       *  Contains profile, actors, assignments, permissions, and paid plan status.
       *  null on public routes or if resolution fails. */
      userState: UserState | null
      /** Resolved runtime context for this request — populated by activateXContext()
       *  inside userStateHandle. Respects the active_context cookie set by the
       *  Context Switcher. null on public routes or pre-verification. */
      activeContext: ActiveContext | null
    }

    // ──────────────────────────────────────────────────────────
    // PageData — from +page.server.ts / +layout.server.ts
    //            to +page.svelte / +layout.svelte
    // ──────────────────────────────────────────────────────────
    interface PageData {
      session: Session | null
      user: User | null
      bootstrapped?: boolean
      /** Passed from root +layout.server.ts — resolved by hooks, not by pages.
       *  Use for onboarding status checks, actor type rendering, and guard logic. */
      userState: UserState | null
      /** The active runtime context — use for permission checks and UI gating.
       *  e.g. data.activeContext?.permissions.includes('fleet:manage') */
      activeContext: ActiveContext | null
      /** Forwarded cookies for client-side Supabase initialisation. */
      cookies: Array<{ name: string; value: string }>
    }

    // interface Error {}
    // interface Platform {}
  }
}
export {}
