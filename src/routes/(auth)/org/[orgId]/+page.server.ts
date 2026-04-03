// src/routes/(auth)/org/[orgId]/+page.server.ts
//
// /org/[orgId] has no content of its own — dashboard lives at
// /org/[orgId]/dashboard. This redirect ensures links and bookmarks
// pointing to the bare org route land correctly.
//
// The parent +layout.server.ts runs first for the access guard
// and org data load before this redirect fires.

import type { PageServerLoad } from "$lib/types"
import { redirect } from "@sveltejs/kit"

export const load: PageServerLoad = async ({ params }) => {
  throw redirect(303, `/org/${params.orgId}/dashboard`)
}
