/**
 * roles.ts — Role definitions + permission maps for sxcntqnt platform.
 *
 * ROLES ADDED (from real SACCO org charts):
 *   SECRETARY        — Approves member requests, handles org admin tasks.
 *                      Every SACCO has one. Distinct from COMPLIANCE_OFFICER.
 *   ACCOUNTS_CLERK   — Read-only finance. Distinct from ACCOUNTANT (can edit).
 *   MECHANIC         — Field role. Logs maintenance jobs. Not managerial.
 *   GENERAL_MANAGER  — Sits above OPERATIONS_MANAGER. Broader read access.
 *   DATA_CLERK       — Data entry only. Most restricted staff role.
 *   FIELD_ATTENDANT  — Covers Service Bay Attendant + Pump Attendant.
 *                      Same permission shape; job title lives on profile.
 *   OPERATOR         — Cross-SACCO trip/parcel coordinator (/operator route).
 *
 * REAL SACCO → ROLE MAPPING:
 *   Chairman          → ORG_CHAIR
 *   Vice Chairman     → OPERATIONS_MANAGER
 *   Treasurer         → ACCOUNTANT
 *   Secretary         → SECRETARY          ← new
 *   Route Inspector   → ROUTE_SUPERVISOR
 *   General Manager   → GENERAL_MANAGER    ← new
 *   Office Manager    → BRANCH_MANAGER
 *   Mechanic          → MECHANIC           ← new
 *   Accounts Clerk    → ACCOUNTS_CLERK     ← new
 *   Data Clerk        → DATA_CLERK         ← new
 *   Service Bay /     → FIELD_ATTENDANT    ← new
 *   Pump Attendant
 */

import { ACTIONS, ALL_ACTIONS } from './permisions'

// src/lib/features/auth/stores/roles.ts

/* ============================================================
   ROLES — matches `roles` table in DB exactly.
   IDENTITY CLASSIFICATIONS, not access-control primitives.
============================================================ */
export const ROLES = {
  // ── Public / Consumer ─────────────────────────────────────────
  GUEST:               "GUEST",
  PASSENGER:           "PASSENGER",

  // ── Vehicle Crew ──────────────────────────────────────────────
  DRIVER:              "DRIVER",
  CONDUCTOR:           "CONDUCTOR",

  // ── SACCO Leadership ──────────────────────────────────────────
  ORG_CHAIR:           "ORG_CHAIR",           // Chairman / board seat
  GENERAL_MANAGER:     "GENERAL_MANAGER",     // GM — above operations

  // ── SACCO Staff — Management ──────────────────────────────────
  FLEET_MANAGER:       "FLEET_MANAGER",
  OPERATIONS_MANAGER:  "OPERATIONS_MANAGER",  // Vice Chairman equivalent
  BRANCH_MANAGER:      "BRANCH_MANAGER",      // Office Manager equivalent

  // ── SACCO Staff — Admin & Finance ─────────────────────────────
  SECRETARY:           "SECRETARY",           // Approves members, org tasks
  ACCOUNTANT:          "ACCOUNTANT",          // Treasurer — can edit finance
  ACCOUNTS_CLERK:      "ACCOUNTS_CLERK",      // Read-only finance
  AUDITOR:             "AUDITOR",
  COMPLIANCE_OFFICER:  "COMPLIANCE_OFFICER",

  // ── SACCO Staff — Field & Operations ──────────────────────────
  ROUTE_SUPERVISOR:    "ROUTE_SUPERVISOR",    // Route Inspector
  DISPATCHER:          "DISPATCHER",
  MECHANIC:            "MECHANIC",            // Vehicle maintenance (field)
  FIELD_ATTENDANT:     "FIELD_ATTENDANT",     // Service Bay / Pump Attendant
  DATA_CLERK:          "DATA_CLERK",          // Data entry only

  // ── Customer-facing ───────────────────────────────────────────
  CUSTOMER_SUPPORT:    "CUSTOMER_SUPPORT",
  SALES_MANAGER:       "SALES_MANAGER",

  // ── Asset / Owners ────────────────────────────────────────────
  OWNER:               "OWNER",
  COMPANY_OWNER:       "COMPANY_OWNER",
  VEHICLE_OWNER:       "VEHICLE_OWNER",
  ORGANIZATION:        "ORGANIZATION",

  // ── Special / Premium ─────────────────────────────────────────
  /**
   * OPERATOR — Cross-SACCO trip/parcel coordinator.
   * Approved by ORG_CHAIR. Accesses /operator route.
   */
  OPERATOR:            "OPERATOR",

  // ── Regulatory / Oversight ────────────────────────────────────
  STAGE_OPERATOR:      "STAGE_OPERATOR",
  REGULATOR:           "REGULATOR",
  PLANNER:             "PLANNER",

  // ── Platform Admin (sxcntqnt internal only) ───────────────────
  ADMIN:               "ADMIN",
  SUPER_ADMIN:         "SUPER_ADMIN",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/* ============================================================
   ROLE → DEFAULT PERMISSIONS MAP

   Used for:
     1. Seeding actor_permissions on actor creation
     2. Local dev tooling + tests
     3. Onboarding UI hints

   IMPORTANT: Real enforcement = RLS + can_actor_perform() in DB.
   These are DEFAULTS — individual actors can have permissions
   added or revoked via actor_permissions table directly.
============================================================ */
export const ROLE_PERMISSIONS: Record<Role, readonly string[]> = {

  // ── God-mode (scoped by jurisdiction in DB) ───────────────────
  [ROLES.ADMIN]:             ALL_ACTIONS,
  [ROLES.SUPER_ADMIN]:       ALL_ACTIONS,
  [ROLES.COMPANY_OWNER]:     ALL_ACTIONS,
  [ROLES.ORG_CHAIR]:         ALL_ACTIONS,
  [ROLES.OWNER]:             ALL_ACTIONS,

  // ── SACCO Leadership ──────────────────────────────────────────

  /**
   * GENERAL_MANAGER — Broad read + manage across the org.
   * Cannot change platform settings. Has finance visibility.
   */
  [ROLES.GENERAL_MANAGER]: [
    ACTIONS.VEHICLE_LIST, ACTIONS.VEHICLE_VIEW, ACTIONS.VEHICLE_EDIT,
    ACTIONS.VEHICLE_GROUP_LIST,
    ACTIONS.DRIVER_LIST, ACTIONS.DRIVER_EDIT,
    ACTIONS.BOOKING_LIST, ACTIONS.BOOKING_EDIT,
    ACTIONS.TRACKING_LIVE, ACTIONS.TRACKING_HISTORY,
    ACTIONS.GEOFENCE_LIST, ACTIONS.GEOFENCE_EVENTS,
    ACTIONS.FUEL_LIST,
    ACTIONS.MAINTENANCE_VIEW,
    ACTIONS.FINANCE_LIST,
    ACTIONS.REPORTS_VIEW,
    ACTIONS.ORG_MANAGE,
    ACTIONS.MEMBER_REQUESTS,
  ],

  // ── SACCO Staff — Management ──────────────────────────────────

  [ROLES.FLEET_MANAGER]: [
    ACTIONS.VEHICLE_LIST, ACTIONS.VEHICLE_VIEW, ACTIONS.VEHICLE_EDIT, ACTIONS.VEHICLE_ADD,
    ACTIONS.VEHICLE_GROUP_LIST, ACTIONS.VEHICLE_GROUP_ADD, ACTIONS.VEHICLE_GROUP_DEL,
    ACTIONS.DRIVER_LIST, ACTIONS.DRIVER_EDIT, ACTIONS.DRIVER_ADD,
    ACTIONS.BOOKING_LIST, ACTIONS.BOOKING_EDIT,
    ACTIONS.TRACKING_LIVE, ACTIONS.TRACKING_HISTORY,
    ACTIONS.GEOFENCE_LIST, ACTIONS.GEOFENCE_ADD, ACTIONS.GEOFENCE_DEL, ACTIONS.GEOFENCE_EVENTS,
    ACTIONS.FUEL_LIST,
    ACTIONS.MAINTENANCE_VIEW, ACTIONS.MAINTENANCE_EDIT,
    ACTIONS.REPORTS_VIEW,
    ACTIONS.SETTINGS_ALL,
  ],

  [ROLES.OPERATIONS_MANAGER]: [
    ACTIONS.VEHICLE_LIST, ACTIONS.VEHICLE_VIEW,
    ACTIONS.VEHICLE_GROUP_LIST,
    ACTIONS.DRIVER_LIST,
    ACTIONS.BOOKING_LIST, ACTIONS.BOOKING_EDIT, ACTIONS.BOOKING_ADD,
    ACTIONS.TRACKING_LIVE, ACTIONS.TRACKING_HISTORY,
    ACTIONS.GEOFENCE_LIST, ACTIONS.GEOFENCE_EVENTS,
    ACTIONS.MAINTENANCE_VIEW,
    ACTIONS.REPORTS_VIEW,
  ],

  [ROLES.BRANCH_MANAGER]: [
    ACTIONS.VEHICLE_LIST, ACTIONS.VEHICLE_VIEW,
    ACTIONS.DRIVER_LIST,
    ACTIONS.BOOKING_LIST, ACTIONS.BOOKING_EDIT, ACTIONS.BOOKING_ADD,
    ACTIONS.TRACKING_LIVE,
    ACTIONS.REPORTS_VIEW,
  ],

  // ── SACCO Staff — Admin & Finance ─────────────────────────────

  /**
   * SECRETARY — org admin backbone.
   * Approves member join requests (delegated from ORG_CHAIR).
   * Manages reminders, has read access to vehicles + bookings.
   */
  [ROLES.SECRETARY]: [
    ACTIONS.MEMBER_REQUESTS,
    ACTIONS.MEMBER_APPROVE,
    ACTIONS.MEMBER_INVITE,
    ACTIONS.BOOKING_LIST,
    ACTIONS.VEHICLE_LIST,
    ACTIONS.DRIVER_LIST,
    ACTIONS.CUSTOMER_LIST, ACTIONS.CUSTOMER_VIEW,
    ACTIONS.REMINDER_LIST,
    ACTIONS.REPORTS_VIEW,
  ],

  /**
   * ACCOUNTANT (Treasurer) — full finance access.
   * Can create and edit finance records.
   */
  [ROLES.ACCOUNTANT]: [
    ACTIONS.FINANCE_LIST, ACTIONS.FINANCE_EDIT, ACTIONS.FINANCE_ADD,
    ACTIONS.FUEL_LIST, ACTIONS.FUEL_EDIT,
    ACTIONS.BOOKING_LIST,
    ACTIONS.REPORTS_VIEW,
  ],

  /**
   * ACCOUNTS_CLERK — read-only finance.
   * Can view but not modify any financial record.
   * Distinct from ACCOUNTANT who can edit.
   */
  [ROLES.ACCOUNTS_CLERK]: [
    ACTIONS.FINANCE_LIST,
    ACTIONS.FUEL_LIST,
    ACTIONS.BOOKING_LIST,
    ACTIONS.REPORTS_VIEW,
  ],

  [ROLES.AUDITOR]: [
    ACTIONS.FINANCE_LIST,
    ACTIONS.FUEL_LIST,
    ACTIONS.VEHICLE_LIST,
    ACTIONS.BOOKING_LIST,
    ACTIONS.TRACKING_HISTORY,
    ACTIONS.REPORTS_VIEW,
  ],

  [ROLES.COMPLIANCE_OFFICER]: [
    ACTIONS.VEHICLE_LIST, ACTIONS.VEHICLE_VIEW,
    ACTIONS.DRIVER_LIST,
    ACTIONS.REMINDER_LIST,
    ACTIONS.REPORTS_VIEW,
  ],

  // ── SACCO Staff — Field & Operations ──────────────────────────

  [ROLES.DISPATCHER]: [
    ACTIONS.BOOKING_LIST, ACTIONS.BOOKING_EDIT, ACTIONS.BOOKING_ADD,
    ACTIONS.VEHICLE_LIST, ACTIONS.VEHICLE_VIEW,
    ACTIONS.DRIVER_LIST,
    ACTIONS.TRACKING_LIVE,
    ACTIONS.GEOFENCE_EVENTS,
  ],

  [ROLES.ROUTE_SUPERVISOR]: [
    ACTIONS.TRACKING_LIVE,
    ACTIONS.TRACKING_HISTORY,
    ACTIONS.GEOFENCE_EVENTS,
    ACTIONS.DRIVER_LIST,
    ACTIONS.VEHICLE_LIST,
  ],

  [ROLES.DRIVER]: [
    ACTIONS.VEHICLE_VIEW,
    ACTIONS.TRACKING_LIVE,
    ACTIONS.FUEL_ADD,
    ACTIONS.REMINDER_LIST,
  ],

  [ROLES.CONDUCTOR]: [
    ACTIONS.BOOKING_LIST,
    ACTIONS.BOOKING_ADD,
    ACTIONS.TRACKING_LIVE,
    ACTIONS.FINANCE_ADD,
  ],

  /**
   * MECHANIC — field maintenance role.
   * Logs and updates vehicle service records.
   * NOT managerial — cannot edit vehicles or manage drivers.
   */
  [ROLES.MECHANIC]: [
    ACTIONS.VEHICLE_VIEW,
    ACTIONS.MAINTENANCE_LOG,
    ACTIONS.MAINTENANCE_VIEW,
    ACTIONS.MAINTENANCE_EDIT,
    ACTIONS.FUEL_LIST,
    ACTIONS.REMINDER_LIST,
  ],

  /**
   * FIELD_ATTENDANT — Service Bay Attendant / Pump Attendant.
   * Most restricted field role. Logs fuel and views vehicles only.
   * Job title differentiation (service bay vs pump) lives on profile.metadata.
   */
  [ROLES.FIELD_ATTENDANT]: [
    ACTIONS.VEHICLE_VIEW,
    ACTIONS.FUEL_ADD,
    ACTIONS.FUEL_LIST,
  ],

  /**
   * DATA_CLERK — Data entry only.
   * Can create records but not edit or delete anything.
   * Cannot access finance or reports.
   */
  [ROLES.DATA_CLERK]: [
    ACTIONS.BOOKING_ADD,
    ACTIONS.BOOKING_LIST,
    ACTIONS.CUSTOMER_ADD,
    ACTIONS.CUSTOMER_VIEW,
  ],

  // ── Customer-facing ───────────────────────────────────────────

  [ROLES.PASSENGER]: [
    ACTIONS.BOOKING_ADD,
    ACTIONS.BOOKING_LIST,
    ACTIONS.TRACKING_LIVE,
    ACTIONS.CUSTOMER_EDIT,
  ],

  [ROLES.CUSTOMER_SUPPORT]: [
    ACTIONS.BOOKING_LIST, ACTIONS.BOOKING_EDIT,
    ACTIONS.CUSTOMER_LIST, ACTIONS.CUSTOMER_VIEW, ACTIONS.CUSTOMER_EDIT,
    ACTIONS.TRACKING_LIVE,
    ACTIONS.REPORTS_VIEW,
  ],

  [ROLES.SALES_MANAGER]: [
    ACTIONS.CUSTOMER_LIST, ACTIONS.CUSTOMER_ADD, ACTIONS.CUSTOMER_EDIT,
    ACTIONS.BOOKING_LIST,
    ACTIONS.VEHICLE_LIST,
    ACTIONS.REPORTS_VIEW,
  ],

  // ── Special / Premium ─────────────────────────────────────────

  /**
   * OPERATOR — approved by ORG_CHAIR, accesses /operator.
   * Cross-SACCO coordination. No org-internal management access.
   */
  [ROLES.OPERATOR]: [
    ACTIONS.BOOKING_LIST, ACTIONS.BOOKING_ADD, ACTIONS.BOOKING_EDIT,
    ACTIONS.VEHICLE_LIST, ACTIONS.VEHICLE_VIEW,
    ACTIONS.TRACKING_LIVE, ACTIONS.TRACKING_HISTORY,
    ACTIONS.CUSTOMER_LIST, ACTIONS.CUSTOMER_ADD, ACTIONS.CUSTOMER_EDIT,
    ACTIONS.REPORTS_VIEW,
  ],

  // ── Asset / Owners ────────────────────────────────────────────

  [ROLES.VEHICLE_OWNER]: [
    ACTIONS.VEHICLE_VIEW,
    ACTIONS.TRACKING_LIVE,
    ACTIONS.TRACKING_HISTORY,
    ACTIONS.FINANCE_LIST,
    ACTIONS.FUEL_LIST,
    ACTIONS.REPORTS_VIEW,
  ],

  [ROLES.ORGANIZATION]: [
    ACTIONS.VEHICLE_LIST,
    ACTIONS.FINANCE_LIST,
    ACTIONS.CUSTOMER_LIST,
    ACTIONS.REPORTS_VIEW,
  ],

  // ── Regulatory ────────────────────────────────────────────────

  [ROLES.PLANNER]: [
    ACTIONS.VEHICLE_GROUP_LIST,
    ACTIONS.GEOFENCE_LIST, ACTIONS.GEOFENCE_ADD, ACTIONS.GEOFENCE_EDIT,
    ACTIONS.TRACKING_HISTORY,
    ACTIONS.REPORTS_VIEW,
  ],

  [ROLES.STAGE_OPERATOR]: [
    ACTIONS.VEHICLE_LIST,
    ACTIONS.BOOKING_LIST,
    ACTIONS.TRACKING_LIVE,
    ACTIONS.GEOFENCE_EVENTS,
  ],

  [ROLES.REGULATOR]: [
    ACTIONS.VEHICLE_LIST,
    ACTIONS.DRIVER_LIST,
    ACTIONS.TRACKING_HISTORY,
    ACTIONS.GEOFENCE_EVENTS,
    ACTIONS.REPORTS_VIEW,
  ],

  // ── Public / Minimal ──────────────────────────────────────────

  [ROLES.GUEST]: [
    ACTIONS.TRACKING_LIVE,
  ],
}

/* ============================================================
   ROLE GROUPS — for UI display and batch assignment
   These group roles by where they sit in the SACCO hierarchy.
   Use these in the admin panel when assigning committee roles.
============================================================ */
export const ROLE_GROUPS = {
  /** Roles assigned by sxcntqnt at org activation */
  PLATFORM_ASSIGNED: [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.ORG_CHAIR,
  ],
  /** SACCO leadership — full or near-full org access */
  SACCO_LEADERSHIP: [
    ROLES.ORG_CHAIR,
    ROLES.GENERAL_MANAGER,
    ROLES.COMPANY_OWNER,
  ],
  /** SACCO management layer */
  SACCO_MANAGEMENT: [
    ROLES.FLEET_MANAGER,
    ROLES.OPERATIONS_MANAGER,
    ROLES.BRANCH_MANAGER,
  ],
  /** SACCO admin & finance */
  SACCO_ADMIN: [
    ROLES.SECRETARY,
    ROLES.ACCOUNTANT,
    ROLES.ACCOUNTS_CLERK,
    ROLES.AUDITOR,
    ROLES.COMPLIANCE_OFFICER,
  ],
  /** Field & operational staff */
  SACCO_FIELD: [
    ROLES.ROUTE_SUPERVISOR,
    ROLES.DISPATCHER,
    ROLES.MECHANIC,
    ROLES.FIELD_ATTENDANT,
    ROLES.DATA_CLERK,
  ],
  /** Vehicle crew */
  CREW: [
    ROLES.DRIVER,
    ROLES.CONDUCTOR,
  ],
  /** External / consumer */
  CONSUMER: [
    ROLES.PASSENGER,
    ROLES.GUEST,
    ROLES.OPERATOR,
  ],
} as const