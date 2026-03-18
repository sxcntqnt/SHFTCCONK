/**
 * permissions.ts — Canonical action strings for sxcntqnt platform.
 *
 * FORMAT: dot notation "resource.verb" throughout.
 *
 * DB SYNC: These strings must match the `action` column in
 * actor_permissions and policy_group_permissions tables.
 * If migrating from colon format, run:
 *   UPDATE actor_permissions SET action = replace(action, ':', '.');
 *   UPDATE policy_group_permissions SET action = replace(action, ':', '.');
 */

// src/lib/features/auth/stores/permissions.ts

export const ACTIONS = {
  // ── Vehicles ──────────────────────────────────────────────────
  VEHICLE_LIST:        "vehicle.list",
  VEHICLE_VIEW:        "vehicle.view",
  VEHICLE_ADD:         "vehicle.add",
  VEHICLE_EDIT:        "vehicle.edit",

  // ── Vehicle Groups ────────────────────────────────────────────
  VEHICLE_GROUP_LIST:  "vehicle_group.list",
  VEHICLE_GROUP_ADD:   "vehicle_group.add",
  VEHICLE_GROUP_DEL:   "vehicle_group.del",

  // ── Drivers ───────────────────────────────────────────────────
  DRIVER_LIST:         "driver.list",
  DRIVER_ADD:          "driver.add",
  DRIVER_EDIT:         "driver.edit",

  // ── Bookings ──────────────────────────────────────────────────
  BOOKING_LIST:        "booking.list",
  BOOKING_ADD:         "booking.add",
  BOOKING_EDIT:        "booking.edit",

  // ── Tracking ──────────────────────────────────────────────────
  TRACKING_LIVE:       "tracking.live",
  TRACKING_HISTORY:    "tracking.history",

  // ── Geofences ─────────────────────────────────────────────────
  GEOFENCE_LIST:       "geofence.list",
  GEOFENCE_ADD:        "geofence.add",
  GEOFENCE_EDIT:       "geofence.edit",
  GEOFENCE_DEL:        "geofence.del",
  GEOFENCE_EVENTS:     "geofence.events",

  // ── Fuel ──────────────────────────────────────────────────────
  FUEL_LIST:           "fuel.list",
  FUEL_ADD:            "fuel.add",
  FUEL_EDIT:           "fuel.edit",

  // ── Maintenance (Mechanic-specific) ───────────────────────────
  /** Create a maintenance / service record for a vehicle */
  MAINTENANCE_LOG:     "maintenance.log",
  /** View maintenance history */
  MAINTENANCE_VIEW:    "maintenance.view",
  /** Update / close a maintenance job */
  MAINTENANCE_EDIT:    "maintenance.edit",

  // ── Finance ───────────────────────────────────────────────────
  FINANCE_LIST:        "finance.list",
  FINANCE_ADD:         "finance.add",
  FINANCE_EDIT:        "finance.edit",

  // ── Reports ───────────────────────────────────────────────────
  REPORTS_VIEW:        "reports.view",

  // ── Settings ──────────────────────────────────────────────────
  SETTINGS_ALL:        "settings.all",

  // ── Reminders ─────────────────────────────────────────────────
  REMINDER_LIST:       "reminder.list",

  // ── Customers ─────────────────────────────────────────────────
  CUSTOMER_LIST:       "customer.list",
  CUSTOMER_VIEW:       "customer.view",
  CUSTOMER_ADD:        "customer.add",
  CUSTOMER_EDIT:       "customer.edit",

  // ── Members / Invites ─────────────────────────────────────────
  /** Send invite tokens to new SACCO members */
  MEMBER_INVITE:       "member.invite",
  /**
   * Approve actor_requests — granted to ORG_CHAIR and SECRETARY.
   * SECRETARY gets this via delegated_authority, not direct grant.
   */
  MEMBER_APPROVE:      "member.approve",
  /** View pending actor_requests for an org */
  MEMBER_REQUESTS:     "member.requests",

  // ── Org management ────────────────────────────────────────────
  ORG_MANAGE:          "org.manage",
  /** Platform-level: create a new SACCO org (sxcntqnt admin only) */
  ORG_CREATE:          "org.create",
  /** Platform-level: approve a SACCO org activation request */
  ORG_APPROVE:         "org.approve",

  // ── Platform admin (federal-level, sxcntqnt only) ─────────────
  ADMIN_USERS:         "admin.users",
  ADMIN_FULL:          "admin.full",

  // ── Audit ─────────────────────────────────────────────────────
  AUDIT_VIEW:          "audit.view",
} as const

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS]
export const ALL_ACTIONS = Object.values(ACTIONS)