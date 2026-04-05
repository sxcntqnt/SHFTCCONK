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

import type { Database } from '$lib/types/supabase'; // ← Generate this with Supabase CLI

// ─────────────────────────────────────────────────────────────
// 1. ADMIN / SERVICE ROLE CLIENT (Bypasses RLS)
//    → Use ONLY on the server for admin tasks, migrations, etc.
// ─────────────────────────────────────────────────────────────
export const supabaseAdmin = createClient<Database>(
	PUBLIC_SUPABASE_URL,
	PRIVATE_SUPABASE_SERVICE_ROLE,
	{
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false
		}
	}
);

// ─────────────────────────────────────────────────────────────
// 2. SERVER CLIENT (for +server.ts, +page.server.ts, actions, hooks, etc.)
//    → Respects RLS + can use cookies for auth
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
					try {
						cookies?.set(name, value, options);
					} catch {
						// ignore if cookies not available (e.g. during SSR without request)
					}
				},
				remove(name: string, options: any) {
					try {
						cookies?.delete(name, options);
					} catch {}
				}
			}
		}
	);
}

// ─────────────────────────────────────────────────────────────
// 3. BROWSER / CLIENT-SIDE CLIENT (for .svelte components)
//    → Use with PUBLIC anon key only
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