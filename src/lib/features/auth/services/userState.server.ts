// src/lib/features/auth/services/userState.server.ts
//
// Central authority for resolving a user's full identity, capability,
// and operational state. Called exclusively from hooks.server.ts.
//
// NEVER import this in +page.server.ts or +layout.svelte.
// Pages consume the result via event.locals.userState — never re-resolve.
//
// CHANGES FROM SUPABASE VERSION:
//   - Takes a postgres.js transaction (already scoped via withProfileContext)
//     instead of a SupabaseClient. Caller (UserState.ts hook) is responsible
//     for wrapping the call: withProfileContext(profileId, tx => resolveUserState(tx, profileId))
//   - Supabase's nested-select syntax (`vehicles(reg_number, id)`,
//     `organizations(name)`) doesn't exist over a raw connection — those
//     become explicit JOINs below, reshaped into the same output types so
//     nothing downstream (ActorContext, EnrichedOrgMember) needs to change.
//   - .in("col", ids) becomes `col = ANY(${ids})`.
//   - Row types (ProfileRow, ActorRow, etc.) are hand-defined below instead
//     of imported from DatabaseDefinitions (Supabase-generated, now gone).
//     Only the columns actually used by this file are typed — if you add a
//     new column reference, add it to the relevant type first. Consider a
//     proper codegen tool (kysely-codegen, zapatos) against Neon if this
//     file's manual types become a maintenance burden.
//
// PREREQUISITE — READ BEFORE DEPLOYING THIS FILE:
//   Every table queried here needs an app_backend RLS policy, or every
//   query below silently returns zero rows (not an error). That would make
//   hasActiveNonGuestActor false for every real user, permanently, with
//   isGuest = true for everyone — a silent correctness bug, not a crash.
//   Confirm policies exist on: actors, effective_permissions_raw,
//   actor_policy_groups, actor_jurisdictions, driver_assignments,
//   conductor_assignments, organization_members, organizations,
//   fleet_ownership, stage_assignments, delegated_authority, mpesa_customers.

import type { Sql } from '$lib/server/pg'

// ─────────────────────────────────────────────────────────────────────────────
// Hand-defined row types — replaces DatabaseDefinitions' Tables<'...'>.
// Only fields this file actually reads are typed; extend as needed.
// ─────────────────────────────────────────────────────────────────────────────

export type ProfileRow = {
  id: string
  onboarding_status: string | null
  [key: string]: unknown
}

export type ActorRow = {
  id: string
  profile_id: string
  type: string
  status: string | null
  [key: string]: unknown
}

export type DriverAssignmentRow = {
  actor_id: string
  vehicle_id: string
  vehicles: { id: string; reg_number: string } | null
}

export type ConductorAssignmentRow = {
  actor_id: string
  [key: string]: unknown
}

export type FleetOwnershipRow = {
  actor_id: string
  [key: string]: unknown
}

export type StageAssignmentRow = {
  operator_id: string
  [key: string]: unknown
}

export type JurisdictionRow = {
  id: string
  actor_id: string
  level: string
  scope_id: string | null
  max_vehicles: number | null
  created_at: string
}

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
  effect: string | null
  level: string | null
  scope_id: string | null
  source: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// ActorContext — per-actor resolved state
// ─────────────────────────────────────────────────────────────────────────────

export type ActorContext = {
  actorId: string
  type: string
  status: string | null
  permissions: PermissionEntry[]
  delegatedPermissions: PermissionEntry[]
  policyGroupIds: string[]
  jurisdictions: JurisdictionRow[]
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
// ─────────────────────────────────────────────────────────────────────────────

export type MpesaGoProfile = {
  isMinorAccount: boolean
  guardianPhone: string | null
  dailyLimit: number | null
  perTransactionLimit: number | null
  sendMoneyEnabled: boolean
  lipaNaMpesaEnabled: boolean
  documentsSubmitted: boolean
  documentsDueBy: string | null
  documentsOverdue: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// UserState — the sealed object stored in event.locals.userState
// ─────────────────────────────────────────────────────────────────────────────

export type UserState = {
  profile: ProfileRow
  actors: ActorRow[]
  isGuest: boolean
  isVerified: boolean
  activeContexts: ActorContext[]
  assignments: AssignmentBundle
  hasPaidPlan: boolean
  mpesaGo: MpesaGoProfile | null
}

// ─────────────────────────────────────────────────────────────────────────────
// resolveUserState()
//
// Call ONLY from hooks.server.ts, wrapped in withProfileContext:
//   const userState = await withProfileContext(profileId, (tx) =>
//     resolveUserState(tx, profileId)
//   )
//
// tx already has app.current_profile_id set for its duration — every query
// below runs under RLS scoped to that profile (plus admin/manager policy
// branches where applicable). Never call this with a raw `sql` handle that
// hasn't gone through withProfileContext first.
// ─────────────────────────────────────────────────────────────────────────────

export async function resolveUserState(
  tx: Sql,
  profileId: string,
): Promise<UserState> {
  // ── 1. Profile ─────────────────────────────────────────────────────────────
  const profileRows = await tx<ProfileRow[]>`
    SELECT * FROM profiles WHERE id = ${profileId}
  `
  const profile = profileRows[0]

  if (!profile) {
    throw new Error(
      `[resolveUserState] Profile not found for profileId=${profileId}.`,
    )
  }

  // ── 2. Actors ──────────────────────────────────────────────────────────────
  const actors = await tx<ActorRow[]>`
    SELECT * FROM actors WHERE profile_id = ${profileId}
  `
  const actorIds = actors.map((a) => a.id)

  // A user is a guest if they have no active non-GUEST actors.
  // We intentionally do NOT treat onboarding_status === "GUEST" as an
  // authoritative override: that column can be stale when a kyc.expired
  // event resets it for a user who already has an active PASSENGER/CREW/
  // OPERATOR actor, or when the migration default was never backfilled.
  // Active non-GUEST actors are the definitive proof of onboarding completion.
  const hasActiveNonGuestActor = actors.some(
    (a) => a.status === "active" && a.type !== "GUEST",
  )
  const isGuest = !hasActiveNonGuestActor
  const isVerified =
    hasActiveNonGuestActor && profile.onboarding_status === "ACTIVE"

  // ── 3. Early return for guests ─────────────────────────────────────────────
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
  // Same connection under the hood (tx is scoped to one), but postgres.js
  // pipelines queued statements — this still avoids serial round-trip
  // latency even though it's not literally concurrent network I/O.
  const [
    allPermissions,
    actorPolicyGroups,
    jurisdictionRows,
    driverRows,
    conductorAssigns,
    rawOrgMembers,
    fleetOwnership,
    stageAssignments,
    outboundRows,
    mpesaRows,
  ] = await Promise.all([
    tx<PermissionEntry & { actor_id: string }[]>`
      SELECT actor_id, action, effect, level, scope_id, source
      FROM effective_permissions_raw
      WHERE actor_id = ANY(${actorIds})
    `,

    tx<{ actor_id: string; group_id: string }[]>`
      SELECT actor_id, group_id
      FROM actor_policy_groups
      WHERE actor_id = ANY(${actorIds})
    `,

    tx<JurisdictionRow[]>`
      SELECT id, actor_id, level, scope_id, max_vehicles, created_at
      FROM actor_jurisdictions
      WHERE actor_id = ANY(${actorIds})
    `,

    // Explicit JOIN replaces Supabase's vehicles(reg_number, id) nested
    // select — reshaped below into the same { vehicles: {...} } shape.
    tx<{ actor_id: string; vehicle_id: string; reg_number: string }[]>`
      SELECT da.actor_id, da.vehicle_id, v.reg_number
      FROM driver_assignments da
      JOIN vehicles v ON v.id = da.vehicle_id
      WHERE da.actor_id = ANY(${actorIds})
    `,

    tx<ConductorAssignmentRow[]>`
      SELECT * FROM conductor_assignments WHERE actor_id = ANY(${actorIds})
    `,

    // Explicit JOIN replaces Supabase's organizations(name) nested select.
    tx<{ actor_id: string; organization_id: string; role: string; org_name: string }[]>`
      SELECT om.actor_id, om.organization_id, om.role, o.name AS org_name
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.actor_id = ANY(${actorIds})
    `,

    tx<FleetOwnershipRow[]>`
      SELECT * FROM fleet_ownership WHERE actor_id = ANY(${actorIds})
    `,

    tx<StageAssignmentRow[]>`
      SELECT * FROM stage_assignments WHERE operator_id = ANY(${actorIds})
    `,

    tx<{ from_actor_id: string; to_actor_id: string; permission_id: string; expires_at: string }[]>`
      SELECT from_actor_id, to_actor_id, permission_id, expires_at
      FROM delegated_authority
      WHERE from_actor_id = ANY(${actorIds})
        AND revoked = false
        AND expires_at > now()
    `,

    tx<MpesaCustomerRow[]>`
      SELECT
        subscription_status, is_minor_account, guardian_phone,
        daily_limit, per_transaction_limit, send_money_enabled,
        lipa_na_mpesa_enabled, documents_submitted, documents_due_by
      FROM mpesa_customers
      WHERE user_id = ${profileId}
      LIMIT 1
    `,
  ])

  // Reshape driver_assignments back into the nested shape ActorContext expects.
  const driverAssignments: DriverAssignmentRow[] = driverRows.map((d) => ({
    actor_id: d.actor_id,
    vehicle_id: d.vehicle_id,
    vehicles: { id: d.vehicle_id, reg_number: d.reg_number },
  }))

  const orgMemberships: EnrichedOrgMember[] = rawOrgMembers.map((m) => ({
    actor_id: m.actor_id,
    organization_id: m.organization_id,
    role: m.role,
    org_name: m.org_name ?? "",
  }))

  const mpesaRaw = mpesaRows[0] ?? null
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

  // ── 7. Build per-actor ActorContext[] ──────────────────────────────────────
  const activeContexts: ActorContext[] = actors.map((actor) => {
    const actorPerms = (allPermissions as unknown as (PermissionEntry & { actor_id: string })[])
      .filter((p) => p.actor_id === actor.id)

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
