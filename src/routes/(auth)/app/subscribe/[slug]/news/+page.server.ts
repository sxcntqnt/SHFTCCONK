import { error, redirect } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
  const session = locals.session
  const user = locals.user
  if (!session || !user) {
    throw redirect(
      303,
      `/auth/login?redirect=/app/subscribe/${params.slug}/news`,
    )
  }

  const { slug } = params

  // Resolve org
  const { data: orgs, error: oErr } = await (locals.supabase as any)
    .from("organizations")
    .select("id, name, status, metadata, created_at")
    .limit(500)

  if (oErr) throw error(500, "Failed to load organizations")

  const org = (orgs ?? []).find(
    (o: any) => slugify(o.name) === slug || o.id === slug,
  )
  if (!org) throw error(404, "Organization not found")

  // Fetch published news, pinned first, then by date
  const categoryFilter = url.searchParams.get("category")
  let query = (locals.supabase as any)
    .from("org_news")
    .select(
      "id, title, body, category, severity, pinned, route_ids, author_id, created_at, profiles:author_id ( full_name, avatar_url )",
    )
    .eq("organization_id", org.id)
    .eq("published", true)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50)

  if (categoryFilter) {
    query = query.eq("category", categoryFilter)
  }

  const { data: news, error: nErr } = await query
  if (nErr) console.error("org_news subscriber fetch error", nErr)

  // Fetch routes for context
  let routes: any[] = []
  try {
    const { data: stages } = await (locals.supabase as any)
      .from("stage_assignments")
      .select("id, stage_name, route")
      .eq("organization_id", org.id)
    if (stages) routes = stages
  } catch (e) {
    /* ignore */
  }

  // Build route lookup
  const routeMap: Record<string, any> = {}
  for (const r of routes) {
    routeMap[r.id] = r
  }

  // Category counts
  const allNews = news ?? []
  const categoryCounts: Record<string, number> = {}
  for (const n of allNews) {
    categoryCounts[n.category] = (categoryCounts[n.category] || 0) + 1
  }

  // Member count for social proof
  let memberCount = 0
  try {
    const { data: members } = await (locals.supabase as any)
      .from("organization_members")
      .select("actor_id")
      .eq("organization_id", org.id)
    if (members) memberCount = members.length
  } catch (e) {
    /* ignore */
  }

  return {
    session,
    org,
    news: allNews,
    routeMap,
    categoryCounts,
    memberCount,
    currentCategory: categoryFilter,
    slug,
  }
}
