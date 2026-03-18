/**
 * src/routes/(auth)/org/join-success/+page.server.ts
 *
 * Simple load — reads org name from URL param set by join action.
 * No DB query needed — just confirmation messaging.
 */

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ url }) => {
  const orgName = url.searchParams.get('org') ?? 'your SACCO'

  return { orgName }
}