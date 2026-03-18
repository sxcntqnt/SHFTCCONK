/**
 * contexts/index.ts — Barrel export for all actor context stores.
 *
 * LAZY PATTERN: Nothing auto-activates. Each route layout calls activate().
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  Route              │  Layout calls                             │
 * │─────────────────────│───────────────────────────────────────────│
 * │  /admin/*           │  activateSuperAdminContext()              │
 * │  /org/[orgId]/*     │  activateOrgChairContext(params.orgId)    │
 * │  /app/*             │  activatePassengerContext()               │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * FILE STRUCTURE:
 *   src/lib/features/auth/contexts/
 *   ├── index.ts                   ← this file
 *   ├── super-admin.context.ts     ← /admin/*
 *   ├── org-chair.context.ts       ← /org/[orgId]/*
 *   └── passenger.context.ts       ← /app/*
 *
 * ─────────────────────────────────────────────────────────────────
 *  USAGE EXAMPLES
 * ─────────────────────────────────────────────────────────────────
 *
 *  /admin/+layout.ts
 *  ─────────────────
 *  import { activateSuperAdminContext } from '$lib/features/auth/contexts'
 *  import { redirect } from '@sveltejs/kit'
 *
 *  export async function load() {
 *    if (!activateSuperAdminContext()) throw redirect(302, '/unauthorized')
 *  }
 *
 *  /admin/orgs/+page.svelte
 *  ─────────────────────────
 *  <script lang="ts">
 *    import { canCreateOrg, canApproveRequests, canViewAuditLogs }
 *      from '$lib/features/auth/contexts'
 *  </script>
 *
 *  {#if $canCreateOrg}      <CreateOrgButton />   {/if}
 *  {#if $canApproveRequests}<ActorRequestTable />  {/if}
 *  {#if $canViewAuditLogs}  <AuditLogLink />       {/if}
 *
 *  ─────────────────────────────────────────────────────────────────
 *
 *  /org/[orgId]/+layout.ts
 *  ────────────────────────
 *  import { activateOrgChairContext } from '$lib/features/auth/contexts'
 *  import { redirect } from '@sveltejs/kit'
 *
 *  export async function load({ params }) {
 *    if (!activateOrgChairContext(params.orgId)) {
 *      throw redirect(302, '/org/select')
 *    }
 *  }
 *
 *  /org/[orgId]/members/+page.svelte
 *  ──────────────────────────────────
 *  <script lang="ts">
 *    import { canApproveMembers, activeOrgName, canInviteMembers }
 *      from '$lib/features/auth/contexts'
 *  </script>
 *
 *  <h1>{$activeOrgName} — Members</h1>
 *  {#if $canApproveMembers} <ApproveButton />  {/if}
 *  {#if $canInviteMembers}  <InviteButton />   {/if}
 *
 *  ─────────────────────────────────────────────────────────────────
 *
 *  /app/+layout.ts
 *  ────────────────
 *  import { activatePassengerContext } from '$lib/features/auth/contexts'
 *  import { redirect } from '@sveltejs/kit'
 *
 *  export async function load() {
 *    // Returns false only if not logged in
 *    if (!activatePassengerContext()) throw redirect(302, '/login')
 *    // Don't redirect unverified passengers — the UI handles that
 *  }
 *
 *  /app/book/+page.svelte
 *  ───────────────────────
 *  <script lang="ts">
 *    import { canBookSeats, isVerified, primaryOrg }
 *      from '$lib/features/auth/contexts'
 *  </script>
 *
 *  {#if $isVerified && $canBookSeats}
 *    <BookingForm saccoId={$primaryOrg?.organization_id} />
 *  {:else}
 *    <JoinSaccoPrompt />
 *  {/if}
 */

// ── Super Admin ───────────────────────────────────────────────
export {
  superAdminCtx,
  activateSuperAdminContext,
  deactivateSuperAdminContext,
  canCreateOrg,
  canApproveOrg,
  canManageUsers,
  canAdminFull,
  canViewAuditLogs,
  canApproveRequests,
  canViewReports,
  adminAllowedActions,
  getSuperAdminActorId,
  isSuperAdminActive,
} from './super-admin.context'

export type { SuperAdminContext } from './super-admin.context'

// ── Org Chair ─────────────────────────────────────────────────
export {
  orgChairCtx,
  activateOrgChairContext,
  deactivateOrgChairContext,
  canApproveMembers,
  canInviteMembers,
  canViewMemberRequests,
  canManageOrgSettings,
  canManageVehicles,
  canViewFinance,
  canTrackLive as canOrgChairTrackLive,
  canManageDrivers,
  canViewMaintenance,
  canViewOrgReports,
  canChangeSettings,
  activeOrgId,
  activeOrgName,
  chairAllowedActions,
  getOrgChairActorId,
  getActiveOrgId,
  isOrgChairActive,
  orgChairCan,
} from './org-chair.context'

export type { OrgChairContext } from './org-chair.context'

// ── Passenger / Guest ─────────────────────────────────────────
export {
  passengerCtx,
  activatePassengerContext,
  deactivatePassengerContext,
  isVerified,
  canBookSeats,
  canViewBookings,
  canTrackLive as canPassengerTrackLive,
  canEditProfile,
  canApplyToSacco,
  verifiedOrgs,
  primaryOrg,
  passengerActorType,
  isGuest,
  getPassengerActorId,
  getPrimaryOrgId,
  isPassengerVerified,
  passengerCan,
} from './passenger.context'

export type { PassengerContext } from './passenger.context'