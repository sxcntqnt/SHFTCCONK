// src/lib/server/db.ts
import { createClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import ws from 'ws';
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
// ─────────────────────────────────────────────────────────────
export const supabaseAdmin = createClient<Database>(
  PUBLIC_SUPABASE_URL,
  PRIVATE_SUPABASE_SERVICE_ROLE,
  {
    auth: {
      persistSession:    false,
      autoRefreshToken:  false,
      detectSessionInUrl: false
    },
    realtime: {
      transport: ws
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 2. SERVER CLIENT (for +server.ts, +page.server.ts, actions, hooks)
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
      },
      realtime: {
        transport: ws
      }
    }
  );
}

// ─────────────────────────────────────────────────────────────
// 3. USER-SCOPED SERVER CLIENT (for internal auth provider callbacks)
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
      },
      realtime: {
        transport: ws
      }
    }
  );
}

export function createSupabaseAnonClient() {
  return createClient<Database>(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
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
// ─────────────────────────────────────────────────────────────
export function createSupabaseClient() {
  return createBrowserClient<Database>(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      realtime: {
        transport: typeof window === 'undefined' ? ws : undefined
      }
    }
  );
}

// ─────────────────────────────────────────────────────────────
// Convenience exports
// ─────────────────────────────────────────────────────────────
export const supabaseServer = createSupabaseServerClient();
export const supabase = createSupabaseClient();
