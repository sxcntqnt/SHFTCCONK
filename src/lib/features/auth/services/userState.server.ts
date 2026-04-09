// src/lib/features/auth/services/userState.server.ts
//
// Central authority for resolving a user's full identity, capability,
// and operational state. Called exclusively from hooks.server.ts.
//
// NEVER import this in +page.server.ts or +layout.svelte.
// Pages consume the result via event.locals.userState — never re-resolve.
//
// CHANGES FROM v2:
//   - Fixed source string matching to match actual view output:
//       direct     → 'direct'                   (unchanged)
//       group      → 'group:<name>'              (was 'policy_group')
//       delegated  → 'delegated_from:<actorId>'  (was 'delegated')
//   - Replaced stripe_customers with mpesa_customers
//   - hasPaidPlan now checks mpesa_customers.subscription_status = 'active'
//   - Added onboarding_status + kyc_intent to ProfileRow (via migration)
//   - isGuest now also checks onboarding_status = 'GUEST' as belt-and-braces
//   - Guest early-return now preserves onboarding_status for hook redirects

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Tables } from "../../../../DatabaseDefinitions"

// ─────────────────────────────────────────────────────────────────────────────
// Derived row types
// ─────────────────────────────────────────────────────────────────────────────

type ProfileRow = Tables<"profiles">
type ActorRow = Tables<"actors">
type DriverAssignmentRow = Tables<"driver_assignments">
type ConductorAssignmentRow = Tables<"conductor_assignments">
type FleetOwnershipRow = Tables<"fleet_ownership">
type StageAssignmentRow = Tables<"stage_assignments">
type JurisdictionRow = Tables<"actor_jurisdictions">

// ─────────────────────────────────────────────────────────────────────────────
// Source string helpers
//
// The effective_permissions_raw view emits:
//   'direct'                     for actor_permissions rows
//   'group:<policy_group.name>'  for policy_group_permissions rows
//   'delegated_from:<actorId>'   for delegated_authority rows
//
// We never match exact strings on group/delegated — always use startsWith.
// ─────────────────────────────────────────────────────────────────────────────

const isDelegatedSource = (source: string | null): boolean =>
  source?.startsWith("delegated_from:") ?? false

const isDirectOrGroupSource = (source: string | null): boolean =>
  source === "direct" || (source?.startsWith("group:") ?? false)

// ─────────────────────────────────────────────────────────────────────────────
// MpesaCustomerRow — mpesa_customers query result shape
// Defined locally because mpesa_customers was added after DatabaseDefinitions
// was last regenerated — Tables<'mpesa_customers'> does not exist yet.
// ─────────────────────────────────────────────────────────────────────────────

type MpesaCustomerRow = {
  subscription_status: string | null
  is_minor_account: boolean | null
  guardian_phone: string | null
  daily_limit: number | null
  per_transaction_limit: number | null
  send_money_enabled: boolean | null
  lipa_na_mpesa_enabled: boolean | null
  documents_submitted: boolean | null
  documents_due_by: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// EnrichedOrgMember — organization_members joined with organizations.name
// ─────────────────────────────────────────────────────────────────────────────

export type EnrichedOrgMember = {
  actor_id: string
  organization_id: string
  role: string
  org_name: string
}

// ─────────────────────────────────────────────────────────────────────────────
// PermissionEntry — one row from effective_permissions_raw
// ─────────────────────────────────────────────────────────────────────────────

export type PermissionEntry = {
  action: string
  effect: string | null // 'allow' | 'deny'
  level: string | null // 'federal' | 'org' | 'branch' | 'department'
  scope_id: string | null // orgId | branchId | deptId | null (federal)
  source: string | null // 'direct' | 'group:<name>' | 'delegated_from:<id>'
}

// ─────────────────────────────────────────────────────────────────────────────
// ActorContext — per-actor resolved state
// ─────────────────────────────────────────────────────────────────────────────

export type ActorContext = {
  actorId: string
  type: string
  status: string | null

  /** Direct + policy_group permissions (effect: allow/deny) */
  permissions: PermissionEntry[]

  /**
   * Delegated/temporary permissions.
   * Source starts with 'delegated_from:' — expiry + revoke already
   * filtered by the effective_permissions_raw view.
   */
  delegatedPermissions: PermissionEntry[]

  /** Policy group IDs this actor belongs to */
  policyGroupIds: string[]

  /**
   * Jurisdiction entries for this actor.
   * level: 'federal' | 'org' | 'branch' | 'department'
   * scope_id: the org/branch/dept UUID, null for federal.
   * Used by context activate() functions to scope permission checks.
   */
  jurisdictions: JurisdictionRow[]

  /** Org memberships — enriched with org_name from organizations join */
  orgMemberships: EnrichedOrgMember[]

  driverAssignment: DriverAssignmentRow | null
  conductorAssignment: ConductorAssignmentRow | null
  fleetOwnership: FleetOwnershipRow[]
  stageAssignments: StageAssignmentRow[]

  outboundDelegations: {
    to_actor_id: string
    permission_id: string
    expires_at: string
  }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// AssignmentBundle — flat view of all assignments across all actors
// ─────────────────────────────────────────────────────────────────────────────

export type AssignmentBundle = {
  driverAssignments: DriverAssignmentRow[]
  conductorAssignments: ConductorAssignmentRow[]
  orgMemberships: EnrichedOrgMember[]
  fleetOwnership: FleetOwnershipRow[]
  stageAssignments: StageAssignmentRow[]
}

// ─────────────────────────────────────────────────────────────────────────────
// MpesaGoProfile — minor/guardian M-PESA GO account details
// Moved here from contexts/index.ts so passenger.context.ts can import it.
// ─────────────────────────────────────────────────────────────────────────────

export type MpesaGoProfile = {
  isMinorAccount: boolean
  guardianPhone: string | null
  dailyLimit: number | null
  perTransactionLimit: number | null
  sendMoneyEnabled: boolean
  lipaNaMpesaEnabled: boolean
  documentsSubmitted: boolean
  documentsDueBy: string | null // ISO timestamp
  /** True if 30-day document window has expired without submission */
  documentsOverdue: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// UserState — the sealed object stored in event.locals.userState
// ─────────────────────────────────────────────────────────────────────────────

export type UserState = {
  profile: ProfileRow

  /** All actors (active + pending + inactive) */
  actors: ActorRow[]

  /**
   * True when the user has zero active actors OR onboarding_status = 'GUEST'.
   * hooks.server.ts redirects to /onboarding on this flag.
   */
  isGuest: boolean

  /**
   * True when the user has at least one active actor AND
   * onboarding_status = 'ACTIVE'.
   */
  isVerified: boolean

  /** Per-actor resolved contexts — consumed by activateXContext() */
  activeContexts: ActorContext[]

  /** Flat assignment bundle — consumed by the Context Switcher */
  assignments: AssignmentBundle

  /**
   * True when mpesa_customers row exists with
   * subscription_status = 'active'.
   */
  hasPaidPlan: boolean
  mpesaGo: MpesaGoProfile | null
}

// ─────────────────────────────────────────────────────────────────────────────
// resolveUserState()
//
// Call ONLY from hooks.server.ts — never from pages or layouts.
//
// Query strategy:
//   Step 1  — Profile                           (1 query, throws if missing)
//   Step 2  — Actors                            (1 query, all statuses)
//   Step 3  — Early return for guests           (skips all downstream queries)
//   Step 4  — Parallel fetch                    (9 queries, 1 round trip)
//             effective_permissions_raw view
//             actor_policy_groups
//             actor_jurisdictions
//             driver_assignments
//             conductor_assignments
//             organization_members + org name join
//             fleet_ownership
//             stage_assignments
//             mpesa_customers
//   Step 5  — Unwrap null-safe
//   Step 6  — Normalise org members + split permission sources
//   Step 7  — Build per-actor ActorContext[]
//   Step 8  — Return sealed UserState
// ─────────────────────────────────────────────────────────────────────────────

export async function resolveUserState(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UserState> {
  // ── 1. Profile ─────────────────────────────────────────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  if (profileError || !profile) {
    throw new Error(
      `[resolveUserState] Profile not found for userId=${userId}. ` +
        `Supabase error: ${profileError?.message ?? "null result"}`,
    )
  }

  // ── 2. Actors ──────────────────────────────────────────────────────────────
  const { data: actorRows, error: actorsError } = await supabase
    .from("actors")
    .select("*")
    .eq("profile_id", userId)

  if (actorsError) {
    throw new Error(
      `[resolveUserState] Failed to fetch actors for userId=${userId}: ${actorsError.message}`,
    )
  }

  const actors = actorRows ?? []
  const actorIds = actors.map((a) => a.id)

  // Belt-and-braces: guest if no active actors OR onboarding_status is GUEST.
  // After migration, onboarding_status is the authoritative source.
  // The actor check is a safety net for rows created before the migration.
  const hasActiveActor = actors.some((a) => a.status === "active")
  const isGuest =
    !hasActiveActor || (profile as any).onboarding_status === "GUEST"
  const isVerified =
    hasActiveActor && (profile as any).onboarding_status === "ACTIVE"

  // ── 3. Early return for guests ─────────────────────────────────────────────
  // hooks.server.ts reads isGuest and profile.onboarding_status to decide
  // whether to redirect to /onboarding or /onboarding/[kyc_intent].
  if (isGuest) {
    return {
      profile,
      actors,
      isGuest: true,
      isVerified: false,
      activeContexts: [],
      assignments: {
        driverAssignments: [],
        conductorAssignments: [],
        orgMemberships: [],
        fleetOwnership: [],
        stageAssignments: [],
      },
      hasPaidPlan: false,
      mpesaGo: null,
    }
  }

  // ── 4. Parallel fetch ──────────────────────────────────────────────────────
  const [
    permissionsResult,
    policyGroupsResult,
    jurisdictionsResult,
    driverResult,
    conductorResult,
    orgMemberResult,
    fleetResult,
    stageResult,
    outboundResult,
    mpesaResult,
  ] = await Promise.all([
    // effective_permissions_raw view handles:
    //   - direct actor_permissions (source = 'direct')
    //   - policy_group_permissions (source = 'group:<name>')
    //   - delegated_authority filtered by revoked + expiry (source = 'delegated_from:<id>')
    // No separate delegated fetch needed — view already gates it.
    supabase
      .from("effective_permissions_raw")
      .select("actor_id, action, effect, level, scope_id, source")
      .in("actor_id", actorIds),

    // Needed to build policyGroupIds per actor.
    // The view gives permissions but not the group membership list itself.
    supabase
      .from("actor_policy_groups")
      .select("actor_id, group_id")
      .in("actor_id", actorIds),

    // Jurisdiction entries — drive all org/branch scope resolution.
    // Used by every context activate() function.
    supabase
      .from("actor_jurisdictions")
      .select("id, actor_id, level, scope_id, max_vehicles, created_at")
      .in("actor_id", actorIds),

    // Add to Promise.all in resolveUserState:
    supabase
      .from("driver_assignments")
      .select("actor_id, vehicle_id, vehicles(reg_number, id)")
      .in("actor_id", actorIds),

    supabase.from("conductor_assignments").select("*").in("actor_id", actorIds),

    // Join organizations to get org_name in one query rather than N+1.
    // Supabase returns organizations as a nested object: { name: string } | null
    supabase
      .from("organization_members")
      .select("actor_id, organization_id, role, organizations(name)")
      .in("actor_id", actorIds),

    supabase.from("fleet_ownership").select("*").in("actor_id", actorIds),

    supabase.from("stage_assignments").select("*").in("operator_id", actorIds),

    supabase
      .from("delegated_authority")
      .select("from_actor_id, to_actor_id, permission_id, expires_at")
      .in("from_actor_id", actorIds)
      .eq("revoked", false)
      .gt("expires_at", new Date().toISOString()),

    // M-Pesa subscription check — replaces stripe_customers.
    // maybeSingle — row may not exist for non-paying users.
    // In resolveUserState() — replace the mpesa_customers query:
    supabase
      .from("mpesa_customers")
      .select(
        `
    subscription_status,
    is_minor_account,
    guardian_phone,
    daily_limit,
    per_transaction_limit,
    send_money_enabled,
    lipa_na_mpesa_enabled,
    documents_submitted,
    documents_due_by
  `,
      )
      .eq("user_id", userId)
      .maybeSingle(),
  ])

  // ── 5. Unwrap results (null-safe) ──────────────────────────────────────────
  const allPermissions = permissionsResult.data ?? []
  const actorPolicyGroups = policyGroupsResult.data ?? []
  const jurisdictionRows = jurisdictionsResult.data ?? []
  const driverAssignments = driverResult.data ?? []
  const conductorAssigns = conductorResult.data ?? []
  const rawOrgMembers = orgMemberResult.data ?? []
  const fleetOwnership = fleetResult.data ?? []
  const stageAssignments = stageResult.data ?? []
  const outboundRows = outboundResult.data ?? []

  // Build MpesaGoProfile from mpesa_customers row (null if row absent)
  const mpesaRaw = mpesaResult.data as MpesaCustomerRow | null

  // Paid plan: M-Pesa subscription must be explicitly 'active'
  const hasPaidPlan = mpesaRaw?.subscription_status === "active"

  const mpesaGo: MpesaGoProfile | null = mpesaRaw
    ? {
        isMinorAccount: mpesaRaw.is_minor_account ?? false,
        guardianPhone: mpesaRaw.guardian_phone ?? null,
        dailyLimit: mpesaRaw.daily_limit ?? null,
        perTransactionLimit: mpesaRaw.per_transaction_limit ?? null,
        sendMoneyEnabled: mpesaRaw.send_money_enabled ?? false,
        lipaNaMpesaEnabled: mpesaRaw.lipa_na_mpesa_enabled ?? false,
        documentsSubmitted: mpesaRaw.documents_submitted ?? false,
        documentsDueBy: mpesaRaw.documents_due_by ?? null,
        documentsOverdue:
          mpesaRaw.documents_due_by != null &&
          !mpesaRaw.documents_submitted &&
          new Date(mpesaRaw.documents_due_by) < new Date(),
      }
    : null

  // ── 6. Normalise org members ───────────────────────────────────────────────
  // Supabase returns organizations as { name: string } | null from the join.
  const orgMemberships: EnrichedOrgMember[] = rawOrgMembers.map((m) => ({
    actor_id: m.actor_id,
    organization_id: m.organization_id,
    role: m.role,
    org_name: (m.organizations as { name: string } | null)?.name ?? "",
  }))

  // ── 7. Build per-actor ActorContext[] ──────────────────────────────────────
  const activeContexts: ActorContext[] = actors.map((actor) => {
    const actorPerms = allPermissions.filter((p) => p.actor_id === actor.id)

    // Split using source string helpers — view emits 'group:<name>' and
    // 'delegated_from:<id>', never the plain strings the old code assumed.
    const permissions: PermissionEntry[] = actorPerms
      .filter((p) => isDirectOrGroupSource(p.source))
      .map((p) => ({
        action: p.action ?? "",
        effect: p.effect,
        level: p.level,
        scope_id: p.scope_id,
        source: p.source,
      }))

    const delegatedPermissions: PermissionEntry[] = actorPerms
      .filter((p) => isDelegatedSource(p.source))
      .map((p) => ({
        action: p.action ?? "",
        effect: p.effect,
        level: p.level,
        scope_id: p.scope_id,
        source: p.source,
      }))

    const policyGroupIds = actorPolicyGroups
      .filter((apg) => apg.actor_id === actor.id)
      .map((apg) => apg.group_id)

    return {
      actorId: actor.id,
      type: actor.type,
      status: actor.status,
      permissions,
      delegatedPermissions,
      policyGroupIds,
      jurisdictions: jurisdictionRows.filter((j) => j.actor_id === actor.id),
      orgMemberships: orgMemberships.filter((m) => m.actor_id === actor.id),
      driverAssignment:
        driverAssignments.find((d) => d.actor_id === actor.id) ?? null,
      conductorAssignment:
        conductorAssigns.find((c) => c.actor_id === actor.id) ?? null,
      fleetOwnership: fleetOwnership.filter((f) => f.actor_id === actor.id),
      stageAssignments: stageAssignments.filter(
        (s) => s.operator_id === actor.id,
      ),
      outboundDelegations: outboundRows
        .filter((d) => d.from_actor_id === actor.id)
        .map((d) => ({
          to_actor_id: d.to_actor_id,
          permission_id: d.permission_id,
          expires_at: d.expires_at,
        })),
    }
  })

  // ── 8. Return sealed UserState ─────────────────────────────────────────────
  return {
    profile,
    actors,
    isGuest,
    isVerified,
    activeContexts,
    assignments: {
      driverAssignments,
      conductorAssignments: conductorAssigns,
      orgMemberships,
      fleetOwnership,
      stageAssignments,
    },
    hasPaidPlan,
    mpesaGo,
  }
}
