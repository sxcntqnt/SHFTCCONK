/**
 * contexts/index.ts — Barrel export for all actor context stores.
 *
 * LAZY PATTERN: Nothing auto-activates. Each route layout calls activate().
 *
 * ┌──────────────────────────────┬────────────────────────────────────────────┐
 * │  Route                       │  Layout calls                              │
 * ├──────────────────────────────┼────────────────────────────────────────────┤
 * │  /admin/*                    │  activateSuperAdminContext()               │
 * │  /org/[orgId]/*              │  activateOrgChairContext(params.orgId)     │
 * │                              │  OR activateOrgContext(params.orgId)       │
 * │  /crew/*                     │  activateCrewContext()                     │
 * │  /operator/*                 │  activateOperatorContext()                 │
 * │  /app/*                      │  activatePassengerContext()                │
 * └──────────────────────────────┴────────────────────────────────────────────┘
 *
 * FILE STRUCTURE:
 *   src/lib/features/auth/contexts/
 *   ├── index.ts                  ← this file
 *   ├── super-admin.context.ts    ← /admin/*
 *   ├── org-chair.context.ts      ← /org/[orgId]/* (ORG_CHAIR only)
 *   ├── org.context.ts            ← /org/[orgId]/* (all other staff roles)
 *   ├── crew.context.ts           ← /crew/* (DRIVER + CONDUCTOR)
 *   ├── operator.context.ts       ← /operator/* (cross-org OPERATOR)
 *   └── passenger.context.ts      ← /app/* (PASSENGER + GUEST)
 *
 * ─────────────────────────────────────────────────────────────────
 *  LAYOUT PATTERN
 * ─────────────────────────────────────────────────────────────────
 *
 *  /org/[orgId]/+layout.ts
 *  ────────────────────────
 *  Try ORG_CHAIR first, fall through to general org staff:
 *
 *  import { activateOrgChairContext, activateOrgContext } from '$lib/features/auth/contexts'
 *
 *  export async function load({ params }) {
 *    const isChair = activateOrgChairContext(params.orgId)
 *    if (!isChair) {
 *      const isStaff = activateOrgContext(params.orgId)
 *      if (!isStaff) throw redirect(302, '/org/select')
 *    }
 *  }
 *
 *  /crew/+layout.ts
 *  ─────────────────
 *  import { activateCrewContext } from '$lib/features/auth/contexts'
 *
 *  export async function load() {
 *    if (!activateCrewContext()) throw redirect(302, '/app/dashboard')
 *  }
 *
 *  /operator/+layout.ts
 *  ─────────────────────
 *  import { activateOperatorContext } from '$lib/features/auth/contexts'
 *
 *  export async function load() {
 *    if (!activateOperatorContext()) throw redirect(302, '/app/dashboard')
 *  }
 *
 *  /operator/+page.svelte
 *  ───────────────────────
 *  <script lang="ts">
 *    import {
 *      operatorOrgSlots, activeOrgName, isMultiOrg,
 *      canOrganiseTrips, canLogFuel, isAtVehicleLimit,
 *      setActiveOperatorOrg,
 *    } from '$lib/features/auth/contexts'
 *  </script>
 *
 *  {#if $isMultiOrg}
 *    <OrgSwitcher slots={$operatorOrgSlots} onSwitch={setActiveOperatorOrg} />
 *  {/if}
 *  {#if $canOrganiseTrips}  <TripOrganiser />  {/if}
 *  {#if $isAtVehicleLimit}  <VehicleLimitBanner /> {/if}
 */

// ── Super Admin ───────────────────────────────────────────────────────────────
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
} from "./super-admin.context"

export type { SuperAdminContext } from "./super-admin.context"

// ── Org Chair ─────────────────────────────────────────────────────────────────
export {
  orgChairCtx,
  activateOrgChairContext,
  deactivateOrgChairContext,
  canApproveMembers,
  canInviteMembers,
  canViewMemberRequests,
  canManageOrgSettings,
  canManageVehicles,
  canViewFinance as canOrgChairViewFinance,
  canTrackLive as canOrgChairTrackLive,
  canManageDrivers,
  canViewMaintenance as canOrgChairViewMaintenance,
  canViewOrgReports,
  canChangeSettings,
  activeOrgId as orgChairActiveOrgId,
  activeOrgName as orgChairActiveOrgName,
  chairAllowedActions,
  getOrgChairActorId,
  getActiveOrgId,
  isOrgChairActive,
  orgChairCan,
} from "./org-chair.context"

export type { OrgChairContext } from "./org-chair.context"

// ── Org Staff (all non-chair roles) ───────────────────────────────────────────
export {
  orgCtx,
  activateOrgContext,
  deactivateOrgContext,
  canListVehicles as orgCanListVehicles,
  canViewVehicle as orgCanViewVehicle,
  canEditVehicle,
  canAddVehicle,
  canListVehicleGroups,
  canAddVehicleGroup,
  canListDrivers,
  canEditDriver,
  canAddDriver,
  canListBookings,
  canEditBooking as orgCanEditBooking,
  canAddBooking as orgCanAddBooking,
  canTrackLive as orgCanTrackLive,
  canTrackHistory as orgCanTrackHistory,
  canListGeofences,
  canViewGeofenceEvents,
  canViewFinance as orgCanViewFinance,
  canEditFinance,
  canAddFinance,
  canViewFuel as orgCanViewFuel,
  canEditFuel,
  canViewMaintenance as orgCanViewMaintenance,
  canLogMaintenance,
  canEditMaintenance,
  canViewReports as orgCanViewReports,
  canListCustomers as orgCanListCustomers,
  canViewCustomer,
  canAddCustomer as orgCanAddCustomer,
  canViewReminders as orgCanViewReminders,
  canApproveMembers as orgCanApproveMembers,
  canInviteMembers as orgCanInviteMembers,
  canViewMemberRequests as orgCanViewMemberRequests,
  canManageOrg,
  canChangeSettings as orgCanChangeSettings,
  activeOrgId as orgActiveOrgId,
  activeOrgName as orgActiveOrgName,
  activeBranchId,
  activeRoleType,
  orgAllowedActions,
  getOrgActorId,
  getOrgContextOrgId,
  isOrgContextActive,
  orgCan,
} from "./org.context"

export type { OrgContext } from "./org.context"

// ── Crew (DRIVER + CONDUCTOR) ─────────────────────────────────────────────────
export {
  crewCtx,
  activateCrewContext,
  deactivateCrewContext,
  canViewVehicle as crewCanViewVehicle,
  canTrackLive as crewCanTrackLive,
  canLogFuel as crewCanLogFuel,
  canViewFuel as crewCanViewFuel,
  canAddBooking as crewCanAddBooking,
  canViewBookings as crewCanViewBookings,
  canRecordFare,
  canViewReminders as crewCanViewReminders,
  isOnDuty,
  hasVehicleAssignment,
  hasActiveTrip,
  crewType,
  activePlate,
  shiftState,
  getCrewActorId,
  getCrewOrgId,
  getActiveVehicleId,
  getActiveTripId,
  isCrewContextActive,
  crewCan,
} from "./crew.context"

export type { CrewContext } from "./crew.context"

// ── Operator (cross-org fleet coordinator) ────────────────────────────────────
export {
  operatorCtx,
  activateOperatorContext,
  deactivateOperatorContext,
  setActiveOperatorOrg,
  canOrganiseTrips,
  canOrganiseTripsGlobally,
  canViewBookings as operatorCanViewBookings,
  canEditBooking as operatorCanEditBooking,
  canViewVehicles,
  canListVehicles as operatorCanListVehicles,
  canLogFuel as operatorCanLogFuel,
  canViewFuel as operatorCanViewFuel,
  canTrackLive as operatorCanTrackLive,
  canTrackHistory as operatorCanTrackHistory,
  canListCustomers as operatorCanListCustomers,
  canAddCustomer as operatorCanAddCustomer,
  canEditCustomer,
  canViewReports as operatorCanViewReports,
  operatorOrgSlots,
  operatorOrgCount,
  activeOrgId as operatorActiveOrgId,
  activeOrgName as operatorActiveOrgName,
  activeAssignedVehicleIds,
  activeMaxVehicles,
  activeRouteIds,
  vehicleUtilisation,
  isAtVehicleLimit,
  isMultiOrg,
  getOperatorActorId,
  getOperatorActiveOrg,
  getOperatorOrgSlots,
  isOperatorContextActive,
  operatorOwnsVehicle,
  operatorOwnsRoute,
  operatorCan,
  operatorCanGlobally,
} from "./operator.context"

export type { OperatorContext, OperatorOrgSlot } from "./operator.context"

// ── Passenger / Guest ─────────────────────────────────────────────────────────
export {
  passengerCtx,
  activatePassengerContext,
  deactivatePassengerContext,
  isVerified,
  canBookSeats,
  canViewBookings as passengerCanViewBookings,
  canTrackLive as passengerCanTrackLive,
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
} from "./passenger.context"

export type { PassengerContext } from "./passenger.context"

// MpesaGoProfile is defined in userState.server.ts (passenger.context.ts imports
// it from there).  Re-export here so any code that imports from contexts/index
// continues to work without changes.
export type { MpesaGoProfile } from "$lib/features/auth/services/userState.server"
