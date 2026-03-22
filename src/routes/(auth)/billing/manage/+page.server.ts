// src/routes/(app)/account/billing/manage/+page.server.ts
//
// The Stripe version of this file existed solely to create a billing portal
// session and redirect to it. With M-Pesa there is no external portal.
//
// This route now redirects back to /account/billing where payment history
// and plan management live. Keeping the route avoids breaking any existing
// links that point to /account/billing/manage.

import { redirect } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
  const { session } = await safeGetSession()
  if (!session) {
    redirect(303, "/login")
  }
  redirect(303, "/account/billing")
}