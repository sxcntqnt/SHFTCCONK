// src/routes/(auth)/admin/+layout.ts
//
// Admin section layout.
// Guard: requireAdminAccess → checks admin.full or admin.users at federal.
// This checks actual permissions, not just actor type — an ADMIN actor
// with revoked permissions gets blocked. The guard also auto-switches
// to the ADMIN actor if the user has one but it's not currently active.
//
// Data: loads pending actor requests count + recent audit summary.
// Individual pages (dashboard, audit_logs, actor_requests) load their
// own detailed data — this just provides summary counts for nav badges.

// src/routes/(auth)/admin/+layout.ts
import type { LayoutLoad } from "./$types";
import { requireAdminAccess } from "$lib/security/authGuard";

export const load: LayoutLoad = async (event) => {
  // Blocks non-admins (or users without active ADMIN actor)
  await requireAdminAccess(event);

  const parent = await event.parent();
  const { supabase, session, user } = parent;

  const [
    { count: pendingRequestCount = 0 },
    { count: recentAuditCount = 0 },
  ] = await Promise.all([
    supabase
      .from("actor_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  return {
    supabase,
    session,
    user,
    pendingRequestCount,
    recentAuditCount,
  };
};