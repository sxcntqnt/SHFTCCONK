/**
 * src/routes/(auth)/org/[orgId]/+page.server.ts
 *
 * The dashboard content moved to /org/[orgId]/dashboard/
 * after the merge. This redirect ensures any link or bookmark
 * pointing to /org/[orgId] lands in the right place.
 *
 * The layout (+layout.server.ts) still runs for access guard
 * and org context before this redirect fires.
 */

import type { PageServerLoad } from './$types'
import { redirect }            from '@sveltejs/kit'

export const load: PageServerLoad = async ({ params }) => {
  throw redirect(303, `/org/${params.orgId}/dashboard`)
}