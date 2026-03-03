// src/app.d.ts
// Ambient type declarations for SvelteKit + Supabase
// Merged & modernized version – includes safeGetSession, user, bootstrapped, etc.

import type { Session, SupabaseClient, User } from "@supabase/supabase-js"
import type { Database } from "./DatabaseDefinitions"  // adjust path if needed
import type { AuthenticatorAssuranceLevelEntry } from "@supabase/supabase-js"  // or AMREntry if aliased

declare global {
  namespace App {
    // ────────────────────────────────────────────────────────────────
    // Locals – available via event.locals in server hooks / server loads
    // ────────────────────────────────────────────────────────────────
    interface Locals {
      // Public Supabase client (uses cookies for auth)
      supabase: SupabaseClient<Database>

      // Service role client (bypasses RLS – use carefully!)
      supabaseServiceRole: SupabaseClient<Database>

      // Safe session helper – validates session + user + MFA/AMR level
      safeGetSession: () => Promise<{
        session: Session | null
        user: User | null
        amr: AuthenticatorAssuranceLevelEntry[] | null  // preferred over AMREntry
      }>

      // Populated by auth guard / load functions
      session: Session | null
      user: User | null
    }

    // ────────────────────────────────────────────────────────────────
    // PageData – shape of data returned from +page.server.ts / +layout.server.ts
    // and passed to +page.svelte / +layout.svelte
    // ────────────────────────────────────────────────────────────────
    interface PageData {
      supabase?: SupabaseClient<Database>          // rarely passed directly
      session: Session | null
      user: User | null
      bootstrapped?: boolean                        // from your bootstrap_session RPC flow
      // Add more app-specific fields here as needed, e.g.:
      // profile?: Database["public"]["Tables"]["profiles"]["Row"] | null
    }

    // ────────────────────────────────────────────────────────────────
    // Optional: extend other interfaces if needed
    // ────────────────────────────────────────────────────────────────
    // interface Error {}
    // interface Platform {}
  }
}

// Required to make this a module (prevents global scope pollution)
export {}