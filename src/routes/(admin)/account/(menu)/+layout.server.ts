import type { LayoutServerLoad } from '../../../app/$types'

export const load: LayoutServerLoad = async ({ locals }) => {
  // Ensure session is valid
  const { session } = await locals.safeGetSession()
  if (!session) {
    return { bootstrap: null, session }
  }

  // Call bootstrap_session RPC to get actor/context for this user
  const { data, error } = await (locals.supabase as any).rpc('bootstrap_session')
  if (error) {
    console.error('bootstrap_session rpc error', error)
    return { bootstrap: null, session }
  }

  // RPC returns jsonb; server client returns as JS object/array
  const payload = Array.isArray(data) ? data[0] : data

  return { bootstrap: payload, session }
}
