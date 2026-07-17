// src/lib/server/pg.ts
//
// Direct Postgres access layer — REPLACES Supabase-js for any query that
// needs to run as a specific identity under RLS.
//
// WHY THIS EXISTS:
//   auth-service is now the sole system of record for identity (opaque
//   atk_/rtk_ tokens, verified via /auth/verify or local session lookup —
//   never a Supabase-issued JWT). Postgres no longer has any way to
//   authenticate a request itself, and we deliberately do NOT want it to —
//   minting a Supabase JWT just to satisfy auth.uid() would reintroduce an
//   unrevocable credential, which is exactly what auth-service's move to
//   opaque tokens was meant to eliminate.
//
//   Instead, RLS trusts a Postgres session variable (app.current_profile_id)
//   set by THIS layer, after the caller has already verified the session
//   against auth-service. Postgres's authentication boundary is now
//   "can you open a connection with these credentials" — the identity
//   boundary is enforced entirely in this file. Nothing above this layer
//   should ever construct its own Postgres connection.
//
// SECURITY INVARIANT — READ BEFORE EDITING:
//   withProfileContext() must NEVER be callable with a profileId that
//   hasn't been independently verified. It does not re-verify anything
//   itself — callers (hooks, +server.ts, +page.server.ts) are responsible
//   for having already resolved profileId via a trusted path (see
//   sync.ts's resolveProfileId, called only after authHandle validates the
//   session). This file has no session-checking logic by design — adding
//   any would just be a second, easier-to-bypass copy of the real check.

import postgres from 'postgres'
import { env } from '$env/dynamic/private'

// Single pooled connection, module-scoped — reused across requests.
// SvelteKit's server is long-lived (not per-request like serverless), so
// this is safe and avoids reconnect overhead on every request.
//
// NEON-SPECIFIC NOTES (database is Neon, not Supabase Postgres — Supabase
// is now execution-layer-only, see Supabase.ts):
//   - DATABASE_URL should point at Neon's pooled connection endpoint (the
//     hostname with the `-pooler` suffix) unless this host has a direct
//     route that bypasses PgBouncer. Neon's pooler runs in PgBouncer
//     transaction mode by default.
//   - Because of that, prepare: false is required below — prepared
//     statements are bound to a specific backend connection, which
//     transaction-mode pooling doesn't guarantee across statements outside
//     a single transaction. Without this, expect intermittent
//     "prepared statement does not exist" errors under load.
//   - ssl is required — Neon rejects unencrypted connections.
//   - If DATABASE_URL is ever pointed at Neon's *unpooled* endpoint instead
//     (e.g. for a migration runner that needs session-level guarantees),
//     prepare: false is unnecessary but harmless.
const sql = postgres(env.DATABASE_URL, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  ssl: 'require',
  prepare: false,
})

export type Sql = typeof sql
/**
 * Run `fn` inside a transaction with app.current_profile_id set for the
 * duration of that transaction only (SET LOCAL — automatically reverts at
 * COMMIT/ROLLBACK, never leaks to the next query on a pooled connection).
 *
 * Use this for ANY query that touches an RLS-protected table on behalf of
 * a specific user. profileId MUST come from a value already verified
 * upstream (event.locals.profileId, set by sessionSyncHandle) — never from
 * a raw request parameter.
 */
export async function withProfileContext<T>(
  profileId: string,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_profile_id', ${profileId}, true)`
    return fn(tx)
  })
}

/**
 * Run `fn` with NO app.current_profile_id set — used only by resolveProfileId's
 * identity_accounts lookup/insert, which by definition runs before a
 * profileId exists to scope to.
 *
 * IMPORTANT — this does NOT bypass RLS. The connecting role (app_backend,
 * or whatever you've named it) is a plain non-superuser role with ordinary
 * table grants, same shape as Supabase's own service_role. What makes this
 * work is a small set of policies scoped specifically TO that role:
 *   - identity_accounts: full access (it's an internal join table, never
 *     queried directly by end users)
 *   - profiles: an INSERT policy with WITH CHECK (true) for first-login
 *     stub creation, plus normal SELECT/UPDATE policies scoped by
 *     get_current_profile_id() for everything else
 * See the migration that created these policies for the exact definitions.
 * If you add new RLS-protected tables this role needs to touch, add a
 * policy TO that role explicitly — don't reach for BYPASSRLS as a shortcut.
 */
export async function withServiceRoleTx<T>(
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => fn(tx))
}

export { sql }
