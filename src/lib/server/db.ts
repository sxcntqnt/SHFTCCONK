// src/lib/server/db.ts
import { createClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY
} from '$env/static/public';
import {
  PRIVATE_SUPABASE_SERVICE_ROLE
} from '$env/static/private';
import type { Database } from '$lib/types/supabase';

// ─────────────────────────────────────────────────────────────
// 1. ADMIN / SERVICE ROLE CLIENT (Bypasses RLS)
//    → Use ONLY on the server for admin tasks, migrations, sync.
//    → Do NOT expose to the client or pass to browser contexts.
// ─────────────────────────────────────────────────────────────
export const supabaseAdmin = createClient<Database>(
  PUBLIC_SUPABASE_URL,
  PRIVATE_SUPABASE_SERVICE_ROLE,
  {
    auth: {
      persistSession:    false,
      autoRefreshToken:  false,
      detectSessionInUrl: false
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 2. SERVER CLIENT (for +server.ts, +page.server.ts, actions, hooks)
//    → Respects RLS + reads/writes auth session from SvelteKit cookies.
//    → Pass the SvelteKit `cookies` object from the request event.
// ─────────────────────────────────────────────────────────────
export function createSupabaseServerClient(cookies?: any) {
  return createServerClient<Database>(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookies?.get(name)?.value ?? null;
        },
        set(name: string, value: string, options: any) {
          try { cookies?.set(name, value, options); } catch {}
        },
        remove(name: string, options: any) {
          try { cookies?.delete(name, options); } catch {}
        }
      }
    }
  );
}

// ─────────────────────────────────────────────────────────────
// 3. USER-SCOPED SERVER CLIENT (for internal auth provider callbacks)
//
//    Creates a client authenticated as a specific Supabase user
//    via a short-lived access token obtained from
//    supabaseAdmin.auth.admin.createSession({ userId }).
//
//    WHY THIS EXISTS:
//      When AUTH_PROVIDER=internal, there is no Supabase auth
//      session cookie — the user authenticated via the internal
//      auth service. RPCs like bootstrap_session and redeem_invite
//      use auth.uid() in Postgres for RLS and user identification.
//      Without a session, auth.uid() returns null and all
//      user-scoped queries fail silently.
//
//      By passing the admin-created access token as the Authorization
//      header, Postgres sees the correct auth.uid() without needing
//      to change any RPC signatures or RLS policies.
//
//    USAGE (in auth callback only):
//      const { data: { session } } = await supabaseAdmin.auth.admin
//        .createSession({ userId: supabaseUserId })
//      const client = createSupabaseUserScopedClient(session.access_token)
//      await client.rpc('bootstrap_session')  // auth.uid() = supabaseUserId ✓
//
//    → Never use this for general data access. Prefer locals.supabase
//      (cookie-aware) or supabaseAdmin (service role) everywhere else.
// ─────────────────────────────────────────────────────────────
export function createSupabaseUserScopedClient(accessToken: string) {
  return createClient<Database>(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      },
      auth: {
        persistSession:    false,
        autoRefreshToken:  false,
        detectSessionInUrl: false
      }
    }
  );
}

// ─────────────────────────────────────────────────────────────
// 4. BROWSER / CLIENT-SIDE CLIENT (for .svelte components)
//    → Uses PUBLIC anon key only. Never use service role here.
// ─────────────────────────────────────────────────────────────
export function createSupabaseClient() {
  return createBrowserClient<Database>(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY
  );
}

// ─────────────────────────────────────────────────────────────
// Convenience exports (most common use cases)
// ─────────────────────────────────────────────────────────────
// Default server client when you don't need to pass cookies manually
export const supabaseServer = createSupabaseServerClient();

// Default browser client (you can also create it inside components)
export const supabase = createSupabaseClient();