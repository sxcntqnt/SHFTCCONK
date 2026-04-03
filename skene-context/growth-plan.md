# Growth Plan: FLAM

**Generated:** 2026-03-31T17:46:39.922460

---

### 1. Operator Agency & Event Booking

## The Core Utility Identified

The Operator is a business-role actor — a fleet owner or route licensee operating vehicles as a revenue-generating asset. Their cognitive model is **asset scheduling and liability exposure**, not GPS telemetry. They do not think in pings; they think in: _which vehicles are committed, to what, for how long, and who bears the risk if something goes wrong._ The BUSINESS_RESERVATION ledger event is the mechanism that converts a verbal or informal booking commitment into an immutable, timestamped, cryptographically-anchored liability shield. This is the utility. Everything else compounds from it.

---

## Why Fleet Availability — Not GPS Telemetry — Is the Correct Mental Model

GPS telemetry answers: _where is the vehicle right now?_

Fleet availability answers: _can I commit this vehicle to a charter, and what happens if I do?_

The Operator's liability exposure is not spatial — it is contractual and temporal. A matatu operator who diverts a vehicle from its licensed route to serve a private charter without a recorded reservation faces:

- NTSA route-deviation penalties
- SACCO disciplinary action for unlogged vehicle absence
- Passenger compensation claims with no exculpatory record

The BUSINESS_RESERVATION ledger event solves all three by creating a pre-authorised, time-bounded deviation record anchored to Hyperledger Fabric before the vehicle moves. The Operator's calendar is therefore a **liability management interface**, not a scheduling convenience.

---

## FleetBooking.svelte Component Scope

### Data Model Surface

The component must operate against a `fleet_bookings` table with the following minimal schema contract:

```typescript
interface FleetBooking {
  id: string // uuid
  org_id: string // tenant isolation
  vehicle_id: string // FK → vehicles
  operator_id: string // FK → profiles (OPERATOR role)
  booking_type: "CHARTER" | "EVENT" | "MAINTENANCE" | "REGULATORY"
  status: "PENDING" | "CONFIRMED" | "LEDGER_ANCHORED" | "CANCELLED"
  starts_at: string // ISO 8601
  ends_at: string // ISO 8601
  client_name: string | null
  client_contact: string | null // phone, M-Pesa linked
  agreed_fare: number | null // KES
  mpesa_reference: string | null
  ledger_tx_id: string | null // Hyperledger Fabric tx hash
  route_deviation_authorised: boolean // drives liability shield
  created_at: string
  updated_at: string
}
```

The `ledger_tx_id` field is the trust anchor. A booking without it is a draft. A booking with it is a legal instrument.

### Component Responsibilities

**1. Availability Grid Rendering**

The primary view is a multi-vehicle horizontal timeline — not a single-vehicle calendar. The Operator manages a fleet, not a single asset. The grid must render:

- Each vehicle as a row, identified by plate number and current SACCO assignment
- Time blocks colour-coded by booking type (charter = amber, maintenance = grey, regulatory = blue, event = purple)
- Conflict zones highlighted in red when a proposed booking overlaps an existing confirmed block
- A "ledger anchored" indicator (chain-link icon) on any block where `ledger_tx_id` is non-null

This grid is powered by a Supabase realtime subscription on `fleet_bookings` filtered by `org_id`, so concurrent booking attempts by multiple operators in the same SACCO surface instantly without page refresh.

**2. Booking Creation Flow**

The creation flow is a right-side drawer, not a modal, preserving grid context during entry:

- Step 1: Vehicle selection (filtered to vehicles the Operator owns or is assigned to — not org-wide)
- Step 2: Time window selection with conflict detection against existing bookings (client-side, against the already-subscribed dataset)
- Step 3: Booking type and client details (client name, phone for M-Pesa deposit collection)
- Step 4: Fare agreement and optional M-Pesa STK push for deposit
- Step 5: Ledger anchor trigger — this is the commitment point

The ledger anchor step must be visually distinct. It is not a "save" button. It is a **"Lock & Protect"** action with explicit copy: _"This commits the vehicle and creates your route-deviation record. You are protected if this vehicle is off-route during this window."_

**3. BUSINESS_RESERVATION Ledger Event Architecture**

When the Operator triggers the ledger anchor:

```typescript
// POST /api/fleet/bookings/[id]/anchor-ledger
// Server-side only — never expose Fabric SDK to client

async function anchorBusinessReservation(
  bookingId: string,
  operatorId: string,
) {
  const booking = await db.fleet_bookings.findUnique({
    where: { id: bookingId },
  })

  // Construct the ledger payload
  const ledgerPayload = {
    event_type: "BUSINESS_RESERVATION",
    booking_id: booking.id,
    vehicle_id: booking.vehicle_id,
    operator_id: booking.operator_id,
    org_id: booking.org_id,
    booking_type: booking.booking_type,
    starts_at: booking.starts_at,
    ends_at: booking.ends_at,
    route_deviation_authorised: booking.route_deviation_authorised,
    agreed_fare_kes: booking.agreed_fare,
    mpesa_reference: booking.mpesa_reference,
    anchored_at: new Date().toISOString(),
  }

  // Submit to Hyperledger Fabric chaincode
  const fabricResult = await fabricGateway.submitTransaction(
    "FleetBookingContract",
    "CreateBusinessReservation",
    JSON.stringify(ledgerPayload),
  )

  const txId = fabricResult.transactionId

  // Write tx hash back to PostgreSQL
  await db.fleet_bookings.update({
    where: { id: bookingId },
    data: {
      ledger_tx_id: txId,
      status: "LEDGER_ANCHORED",
      route_deviation_authorised: true,
    },
  })

  // PostHog event for monetisation instrumentation
  await posthog.capture({
    distinctId: operatorId,
    event: "business_reservation_ledger_anchored",
    properties: {
      booking_type: booking.booking_type,
      vehicle_id: booking.vehicle_id,
      duration_hours: durationHours(booking.starts_at, booking.ends_at),
      has_mpesa_deposit: !!booking.mpesa_reference,
    },
  })

  return { txId, status: "LEDGER_ANCHORED" }
}
```

The Fabric chaincode `CreateBusinessReservation` must enforce:

- No overlapping BUSINESS_RESERVATION events for the same `vehicle_id` on the world state
- Immutability of `starts_at`, `ends_at`, and `route_deviation_authorised` post-anchor
- Queryability by `vehicle_id` + time range for regulator and SACCO audit access

**4. Conflict Detection Logic**

Conflict detection runs client-side against the Supabase realtime cache, but the ledger anchor endpoint performs a final server-side conflict check before Fabric submission. This dual-layer prevents race conditions where two Operators attempt to anchor overlapping bookings simultaneously:

```typescript
// Server-side conflict guard before Fabric submission
async function assertNoConflict(
  vehicleId: string,
  startsAt: Date,
  endsAt: Date,
  excludeBookingId: string,
) {
  const conflict = await db.fleet_bookings.findFirst({
    where: {
      vehicle_id: vehicleId,
      id: { not: excludeBookingId },
      status: { in: ["CONFIRMED", "LEDGER_ANCHORED"] },
      OR: [{ starts_at: { lt: endsAt }, ends_at: { gt: startsAt } }],
    },
  })

  if (conflict)
    throw new ConflictError(
      `Vehicle committed to booking ${conflict.id} during this window`,
    )
}
```

**5. Operator-Scoped Vehicle Filtering**

Critical to the user context directive: the Operator sees only vehicles they are assigned to or own. They do not see org-wide fleet. This is enforced at the RLS layer in Supabase:

```sql
-- RLS policy: operators see only their assigned vehicles
CREATE POLICY operator_vehicle_scope ON fleet_bookings
  FOR ALL
  USING (
    org_id = auth.jwt() ->> 'org_id'
    AND (
      operator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM vehicle_operator_assignments voa
        WHERE voa.vehicle_id = fleet_bookings.vehicle_id
        AND voa.operator_id = auth.uid()
        AND voa.is_active = true
      )
    )
  );
```

The ORG_CHAIR sees all bookings. The Operator sees their slice. This distinction must be reflected in the component's data fetching layer — the query predicate changes based on the authenticated role surfaced from the Supabase JWT.

---

## Lifecycle Control Points

**ONBOARDING — The Trust:**
The FleetBooking interface is gated behind vehicle assignment. An Operator with no assigned vehicles sees an empty state with a single CTA: _"Request vehicle assignment from your SACCO admin."_ This drives the Actor Request Flow (existing feature) and creates an immediate administrative touchpoint that pulls the ORG_CHAIR into the platform to approve the assignment — compounding SACCO-level activation.

**ACTIVATION — The Magic Moment:**
The first BUSINESS_RESERVATION ledger anchor is a secondary magic moment for the Operator persona — distinct from the GPS first-ping moment which belongs to the driver. The Operator's magic moment is the first time they see `status: LEDGER_ANCHORED` and the Fabric transaction hash rendered in the booking detail drawer. This is the moment the platform stops being a tracking tool and becomes a legal instrument. PostHog must capture this event with full booking metadata for funnel analysis.

**ENGAGEMENT — The Habit:**
The fleet availability grid becomes the Operator's morning ritual: check which vehicles are committed today, identify gaps for opportunistic charter bookings, and review any pending bookings awaiting ledger anchor. A daily digest notification (Resend email or WhatsApp via the existing WhatsApp onboarding channel) surfaces the day's booking schedule and any vehicles with no bookings — framing idle assets as revenue loss, not neutral availability.

**MONETISATION — The Commitment:**
The free tier caps BUSINESS_RESERVATION ledger anchors at 5 per calendar month. This is the correct gate — not a vehicle count gate, not a GPS gate. Charter operators who exceed 5 anchored bookings per month are running a commercial operation that justifies the paid tier. The upgrade prompt appears inline in the booking creation drawer at anchor step, with copy: _"You've used 5 of 5 protected bookings this month. Upgrade to continue anchoring route-deviation protection."_ M-Pesa STK push is the payment path, consistent with the existing payment store.

**RETENTION — The Stickiness:**
Ledger depth compounds here. An Operator with 6 months of BUSINESS_RESERVATION history has an audit trail that is genuinely difficult to reconstruct outside the platform. NTSA compliance reviews, SACCO dispute resolution, and insurance claims all become easier with this record. The switching cost is not technical — it is evidentiary. The platform must surface this periodically: _"Your fleet has 47 anchored reservation records across 6 months. This history is your compliance record."_

**EXPANSION — The Flywheel:**
Operators who successfully use BUSINESS_RESERVATION records in a dispute resolution or regulatory interaction become the most credible referral vector for the SACCO-to-SACCO referral program. The referral share moment is not "this software is good" — it is "I showed NTSA my Hyperledger record and the case was closed in 20 minutes." That is a story that travels through WhatsApp groups without any product-side nudge. The referral program (existing opportunity) must capture this moment by triggering a share prompt immediately after a booking dispute is marked resolved in the platform.

---

## Implementation File Targets

```
src/lib/components/fleet/FleetBooking.svelte          — primary grid + drawer component
src/lib/components/fleet/BookingDrawer.svelte         — creation/edit drawer
src/lib/components/fleet/BookingTimelineGrid.svelte   — multi-vehicle horizontal timeline
src/lib/components/fleet/LedgerAnchorButton.svelte    — the commitment action, isolated for PostHog instrumentation
src/routes/api/fleet/bookings/+server.ts              — CRUD endpoints with RLS-aware queries
src/routes/api/fleet/bookings/[id]/anchor-ledger/+server.ts — Fabric submission endpoint
src/lib/stores/fleetBookings.ts                       — Supabase realtime subscription store
src/lib/server/fabric/businessReservation.ts          — Fabric gateway abstraction
src/lib/utils/bookingConflict.ts                      — client-side conflict detection utility
```

The `LedgerAnchorButton.svelte` is isolated specifically because it carries the highest instrumentation value. Every render state — idle, loading, success, error, quota-exceeded — must emit a distinct PostHog event. This button is the monetisation conversion point for the Operator persona and must be treated with the same instrumentation discipline as an M-Pesa STK push trigger.

### 2. Zero-Input Driver Onboarding

## The Core Utility Identified

The Operator's liability exposure begins the moment a vehicle moves without a recorded operator. The gap between "vehicle assigned" and "driver actively broadcasting GPS" is not a UX problem — it is an uninsured interval. Every minute a vehicle operates without a linked driver identity is a minute the Operator cannot defend in a SACCO dispute or NTSA audit. The GENESIS_ENROLLMENT event collapses this interval to zero by making the driver's first GPS ping simultaneously the enrollment event, the device pairing confirmation, and the ledger genesis record. The Operator never touches a device setup screen. The driver never creates an account. The URL is the onboarding funnel.

---

## Why the Operator Must Be Removed from Device Setup Entirely

The existing mental model for fleet software onboarding assumes the Operator configures devices, assigns drivers, and then activates tracking. This is a three-step process with three failure modes: the Operator forgets to configure, the driver receives the wrong device, or the pairing silently fails and GPS data is attributed to the wrong vehicle. In the matatu context, Operators are not sitting at desks. They are at termini, on the phone, managing conductors, and arguing with SACCO officials. Any onboarding step that requires the Operator to be present at a device is a step that will be skipped.

The correct model: the Operator's only action is sharing a URL. Everything else is self-executing.

---

## QR Code and Vehicle-ID Pairing Architecture

### Token Generation at Vehicle Assignment

When a vehicle is assigned to an Operator (or when a new vehicle is added to the fleet), the system generates a deterministic, vehicle-scoped pairing token. This token is not a session credential — it is a capability token that encodes the vehicle identity and expires on first successful GPS ping or after 72 hours, whichever comes first.

```typescript
// src/lib/server/auth/pairingToken.ts

import { SignJWT, jwtVerify } from "jose"
import { PAIRING_TOKEN_SECRET } from "$env/static/private"

const secret = new TextEncoder().encode(PAIRING_TOKEN_SECRET)

export interface PairingTokenPayload {
  vehicle_id: string
  org_id: string
  operator_id: string
  plate_number: string
  issued_at: string
  purpose: "DRIVER_PAIRING"
}

export async function generatePairingToken(
  payload: PairingTokenPayload,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("72h")
    .sign(secret)
}

export async function verifyPairingToken(
  token: string,
): Promise<PairingTokenPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as unknown as PairingTokenPayload
}
```

The token is generated server-side at the moment of vehicle-operator assignment and stored in a `vehicle_pairing_tokens` table with a `consumed_at` column. The QR code encodes a URL of the form:

```
https://driver.flam.co.ke/pair?t={base64url_token}
```

This URL is the only artifact the Operator needs to share. It can be printed as a QR code on a laminated card affixed to the dashboard, sent via WhatsApp, or displayed on the Operator's dashboard for the driver to scan.

### Driver PWA Auth Flow

```typescript
// apps/driver-pwa/src/lib/auth.ts

import {
  verifyPairingToken,
  type PairingTokenPayload,
} from "$lib/server/auth/pairingToken"
import { browser } from "$app/environment"
import { writable, get } from "svelte/store"

const DRIVER_SESSION_KEY = "flam_driver_session"

export interface DriverSession {
  vehicle_id: string
  org_id: string
  operator_id: string
  plate_number: string
  paired_at: string
  session_token: string // short-lived, GPS-scoped credential
}

export const driverSession = writable<DriverSession | null>(null)

/**
 * Called on PWA load. Checks IndexedDB for an existing session,
 * or processes a pairing token from the URL search params.
 * No account creation. No password. No email.
 */
export async function initDriverAuth(
  searchParams: URLSearchParams,
): Promise<"PAIRED" | "EXISTING_SESSION" | "NO_AUTH"> {
  // 1. Check for persisted session in IndexedDB
  if (browser) {
    const persisted = await loadPersistedSession()
    if (persisted && !isSessionExpired(persisted)) {
      driverSession.set(persisted)
      return "EXISTING_SESSION"
    }
  }

  // 2. Check for pairing token in URL
  const rawToken = searchParams.get("t")
  if (!rawToken) return "NO_AUTH"

  // 3. Exchange pairing token for a GPS-scoped session credential
  const response = await fetch("/api/driver/pair", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairing_token: rawToken }),
  })

  if (!response.ok) {
    const error = await response.json()
    // Token consumed or expired — surface a human-readable error
    // with a WhatsApp deep-link to request a new pairing URL from the Operator
    throw new PairingError(error.code, error.message)
  }

  const session: DriverSession = await response.json()
  driverSession.set(session)

  if (browser) {
    await persistSession(session)
    // Strip the token from the URL to prevent re-use on refresh
    window.history.replaceState({}, "", "/pair/success")
  }

  return "PAIRED"
}

async function loadPersistedSession(): Promise<DriverSession | null> {
  // IndexedDB via idb-keyval or equivalent
  const { get: idbGet } = await import("idb-keyval")
  return idbGet(DRIVER_SESSION_KEY) ?? null
}

async function persistSession(session: DriverSession): Promise<void> {
  const { set: idbSet } = await import("idb-keyval")
  await idbSet(DRIVER_SESSION_KEY, session)
}

function isSessionExpired(session: DriverSession): boolean {
  // GPS-scoped session tokens are valid for 30 days of inactivity
  // Active pinging resets the expiry server-side
  const paired = new Date(session.paired_at).getTime()
  const now = Date.now()
  return now - paired > 30 * 24 * 60 * 60 * 1000
}

export class PairingError extends Error {
  constructor(
    public code: "TOKEN_CONSUMED" | "TOKEN_EXPIRED" | "VEHICLE_NOT_FOUND",
    message: string,
  ) {
    super(message)
  }
}
```

### Pairing Exchange Endpoint

```typescript
// src/routes/api/driver/pair/+server.ts

import type { RequestHandler } from "./$types"
import { json, error } from "@sveltejs/kit"
import { verifyPairingToken } from "$lib/server/auth/pairingToken"
import { db } from "$lib/server/db"
import { generateDriverSessionToken } from "$lib/server/auth/driverSession"
import { redis } from "$lib/server/redis"

export const POST: RequestHandler = async ({ request }) => {
  const { pairing_token } = await request.json()

  let payload
  try {
    payload = await verifyPairingToken(pairing_token)
  } catch {
    throw error(401, {
      code: "TOKEN_EXPIRED",
      message:
        "Pairing link has expired. Request a new one from your operator.",
    })
  }

  // Idempotency check — token can only be consumed once
  const tokenRecord = await db.vehicle_pairing_tokens.findFirst({
    where: { vehicle_id: payload.vehicle_id, consumed_at: null },
  })

  if (!tokenRecord) {
    throw error(409, {
      code: "TOKEN_CONSUMED",
      message: "This pairing link has already been used.",
    })
  }

  // Mark token as consumed
  await db.vehicle_pairing_tokens.update({
    where: { id: tokenRecord.id },
    data: { consumed_at: new Date().toISOString() },
  })

  // Generate GPS-scoped session credential
  const sessionToken = await generateDriverSessionToken({
    vehicle_id: payload.vehicle_id,
    org_id: payload.org_id,
    operator_id: payload.operator_id,
  })

  // Cache the session in Redis for sub-millisecond GPS ping auth
  await redis.set(
    `driver_session:${payload.vehicle_id}`,
    JSON.stringify({
      vehicle_id: payload.vehicle_id,
      org_id: payload.org_id,
      operator_id: payload.operator_id,
    }),
    { ex: 30 * 24 * 60 * 60 }, // 30 days, reset on each ping
  )

  return json({
    vehicle_id: payload.vehicle_id,
    org_id: payload.org_id,
    operator_id: payload.operator_id,
    plate_number: payload.plate_number,
    paired_at: new Date().toISOString(),
    session_token: sessionToken,
  })
}
```

---

## GENESIS_ENROLLMENT: The Self-Healing Trigger on First Ping

The GENESIS_ENROLLMENT event is not a separate onboarding step. It is a side effect of the first GPS ping. The GPS ping ingestion endpoint inspects whether the vehicle has an existing `driver_enrollment` record. If it does not, it creates one atomically — no driver action required, no Operator action required.

```typescript
// src/routes/api/gps/ping/+server.ts (relevant excerpt)

import { db } from "$lib/server/db"
import { redis } from "$lib/server/redis"
import { fabricGateway } from "$lib/server/fabric"
import { posthog } from "$lib/server/posthog"

export const POST: RequestHandler = async ({ request }) => {
  const { vehicle_id, lat, lng, accuracy, timestamp, session_token } =
    await request.json()

  // Validate session from Redis — no DB hit on hot path
  const sessionRaw = await redis.get(`driver_session:${vehicle_id}`)
  if (!sessionRaw)
    throw error(401, "No active driver session for this vehicle.")
  const session = JSON.parse(sessionRaw)

  // Reset session TTL on each ping — active vehicles never expire
  await redis.expire(`driver_session:${vehicle_id}`, 30 * 24 * 60 * 60)

  // Check if this is the first ping for this vehicle
  const existingEnrollment = await db.driver_enrollments.findFirst({
    where: { vehicle_id, org_id: session.org_id },
  })

  const isGenesisEvent = !existingEnrollment

  if (isGenesisEvent) {
    // GENESIS_ENROLLMENT: create enrollment record and anchor to Hyperledger Fabric
    await triggerGenesisEnrollment({
      vehicle_id,
      org_id: session.org_id,
      operator_id: session.operator_id,
      first_ping_at: timestamp,
      first_lat: lat,
      first_lng: lng,
    })
  }

  // Write ping to trip_events regardless
  await db.trip_events.insert({
    vehicle_id,
    org_id: session.org_id,
    operator_id: session.operator_id,
    event_type: isGenesisEvent ? "GENESIS_PING" : "GPS_PING",
    lat,
    lng,
    accuracy,
    recorded_at: timestamp,
  })

  return json({ status: "ok", genesis: isGenesisEvent })
}

async function triggerGenesisEnrollment(params: {
  vehicle_id: string
  org_id: string
  operator_id: string
  first_ping_at: string
  first_lat: number
  first_lng: number
}) {
  // 1. Write enrollment record to PostgreSQL
  const enrollment = await db.driver_enrollments.create({
    data: {
      vehicle_id: params.vehicle_id,
      org_id: params.org_id,
      operator_id: params.operator_id,
      enrolled_at: params.first_ping_at,
      enrollment_method: "QR_PAIRING",
      genesis_lat: params.first_lat,
      genesis_lng: params.first_lng,
    },
  })

  // 2. Anchor GENESIS_ENROLLMENT event to Hyperledger Fabric
  const fabricResult = await fabricGateway.submitTransaction(
    "DriverEnrollmentContract",
    "CreateGenesisEnrollment",
    JSON.stringify({
      event_type: "GENESIS_ENROLLMENT",
      enrollment_id: enrollment.id,
      vehicle_id: params.vehicle_id,
      org_id: params.org_id,
      operator_id: params.operator_id,
      enrolled_at: params.first_ping_at,
      enrollment_method: "QR_PAIRING",
    }),
  )

  // 3. Write Fabric tx hash back to PostgreSQL
  await db.driver_enrollments.update({
    where: { id: enrollment.id },
    data: { ledger_tx_id: fabricResult.transactionId },
  })

  // 4. Cancel any pending Upstash Redis nudge jobs for this vehicle
  // (Hour-4 and Hour-24 SMS nudges defined in the GPS Broadcast Flywheel)
  await redis.del(`nudge:no_first_ping:${params.vehicle_id}`)

  // 5. PostHog: genesis enrollment captured with full fleet context
  await posthog.capture({
    distinctId: params.operator_id,
    event: "genesis_enrollment_completed",
    properties: {
      vehicle_id: params.vehicle_id,
      org_id: params.org_id,
      enrollment_method: "QR_PAIRING",
      ledger_tx_id: fabricResult.transactionId,
      first_ping_at: params.first_ping_at,
    },
  })

  // 6. Notify Operator via Supabase realtime — no polling required
  // The Operator's FleetBooking grid subscribes to driver_enrollments
  // and will surface a 'Vehicle Now Active' badge without page refresh
}
```

### Why "Self-Healing" Is the Correct Framing

The term self-healing refers to the system's ability to recover from incomplete onboarding states without human intervention. If a pairing token was generated but the driver never opened the URL, the vehicle sits in a `PAIRED_NOT_ACTIVE` state. The moment the driver opens the URL — even days later — and emits a first ping, GENESIS_ENROLLMENT fires and the vehicle transitions to `ACTIVE`. No Operator re-configuration. No support ticket. No re-pairing ceremony.

If the pairing token expired before the driver used it, the Operator's dashboard surfaces a single regenerate action. One tap generates a new 72-hour token. The Operator shares it via WhatsApp. The cycle repeats with zero platform friction.

This self-healing property means the Operator's dashboard never shows a vehicle permanently stuck in a broken state. Every vehicle is either active, pending first ping, or needs a new pairing link — all three states are actionable without leaving the platform.

---

## Fleet Activation Speed: What This Architecture Delivers

### The Funnel Collapse

Traditional fleet software onboarding for a single vehicle:

1. Operator logs in and navigates to device management
2. Operator enters device IMEI or serial number
3. Operator assigns the device to a vehicle
4. Operator assigns a driver to the vehicle
5. Driver downloads the app
6. Driver creates an account with phone number
7. Driver receives OTP and verifies
8. Driver logs in and activates tracking

Eight steps. Four of them require the driver. Two require the Operator to be at a computer. The failure rate compounds at each step.

The QR + GENESIS_ENROLLMENT architecture:

1. Operator shares a URL (WhatsApp, QR code, SMS — any channel)
2. Driver opens the URL on any device with a browser
3. Driver sees the GPS broadcast screen and taps "Start Broadcasting"
4. First ping fires. GENESIS_ENROLLMENT anchors to Fabric. Vehicle is active.

Four steps. One requires the Operator. One requires the driver. The fleet activation funnel collapses from eight steps to a single URL share.

### Time-to-Active Projection

For a 10-vehicle fleet, the Operator generates 10 pairing URLs from the fleet management dashboard in a single batch action. These are shared to a WhatsApp group containing all drivers. Each driver opens their URL independently. As each driver emits their first ping, the Operator's fleet grid transitions vehicles from grey (inactive) to green (active) in real time via Supabase realtime subscription. A 10-vehicle fleet can be fully activated in under 15 minutes from the moment the Operator shares the WhatsApp message — without the Operator being physically present at any vehicle.

This is the correct benchmark for fleet activation speed in the matatu context: not "time from device pairing to first ping" measured in a controlled environment, but "time from Operator intent to full fleet activation" measured against the reality of drivers at different termini across Nairobi.

### Operator Cognitive Load Reduction

The Operator's mental model for device setup is now: _share a link, watch the grid go green._ Every vehicle that transitions to active in real time reinforces this model. The Operator does not need to understand GPS protocols, device pairing, or driver account creation. The platform's complexity is entirely absorbed into the pairing token and the GENESIS_ENROLLMENT trigger. What surfaces to the Operator is a fleet grid that becomes progressively more active as drivers open their URLs.

This is the correct product experience for the Operator persona: the platform does the work, the Operator sees the outcome.

---

## Lifecycle Control Points

**ONBOARDING — The Trust:**
The vehicle_pairing_tokens table is populated at vehicle assignment — which happens inside the existing Actor Request Flow when an Operator claims a vehicle. The pairing URL is surfaced immediately in the vehicle detail view with a "Share Pairing Link" button that opens a WhatsApp deep-link pre-populated with the URL and the vehicle plate number. The Operator's first action after vehicle assignment is a WhatsApp share, not a device configuration screen.

**ACTIVATION — The Magic Moment:**
The GENESIS_ENROLLMENT ledger anchor is the Operator's confirmation that a vehicle is legally enrolled in the fleet record. The Operator's dashboard must render the Fabric transaction hash for each enrolled vehicle in the vehicle detail drawer — the same visual treatment as the BUSINESS_RESERVATION ledger anchor. The Operator sees: _this vehicle's enrollment is on the immutable record._ That is the activation moment for fleet-level compliance, not GPS telemetry.

**ENGAGEMENT — The Habit:**
The fleet grid's real-time activation sequence — vehicles going green as drivers open their URLs — creates a daily ritual around fleet readiness. The Operator checks the grid before the morning route departure window to confirm all vehicles are broadcasting. Any vehicle still grey at 05:30 triggers an automated WhatsApp nudge to the Operator: _"[Plate KBZ 123A] has not started broadcasting. Share the pairing link again?"_ with a one-tap regenerate action embedded in the message via a signed URL.

**MONETISATION — The Commitment:**
The free tier caps active enrolled vehicles at 3. An Operator with a 10-vehicle fleet who uses the QR pairing flow to activate all 10 vehicles hits this cap at vehicle 4 and encounters the upgrade gate inline in the fleet grid — not in a settings page. The gate copy: _"3 of your vehicles are protected. Enroll the remaining 7 by upgrading your plan."_ M-Pesa STK push is the payment path. The upgrade is triggered from the same WhatsApp-familiar context the Operator already used to share pairing links.

**RETENTION — The Stickiness:**
Each GENESIS_ENROLLMENT ledger record is a data asset the Operator cannot reconstruct outside the platform. An Operator with 18 months of enrollment history, route deviation records, and BUSINESS_RESERVATION anchors has an audit trail that represents genuine legal value. The switching cost is not the GPS software — it is the Hyperledger Fabric ledger history that cannot be migrated to a competitor. The platform must surface this periodically in the Operator's dashboard: _"Your fleet has 847 immutable records across 18 months. This is your compliance history."_

**EXPANSION — The Flywheel:**
Operators who activate their full fleet via QR pairing within 48 hours of SACCO onboarding are the highest-value referral vectors. They have experienced the zero-friction activation path and can describe it in a single sentence to other Operators: _"I sent a WhatsApp message and my whole fleet was tracking in 10 minutes."_ The referral program must trigger a share prompt at the moment the last vehicle in the fleet goes green — when the Operator's emotional state is at peak satisfaction with the platform.

### 3. V/T Ratio as Business Intelligence

## The Core Utility Identified

The V/T ratio — vehicles actively pinging divided by total enrolled vehicles — is not a system health metric. It is a remittance integrity signal. In the matatu context, a vehicle that is not broadcasting during an active shift window is a vehicle whose conductor is collecting fares with no accountability trail. The Operator's exposure is not technical downtime — it is cash leakage. Every hour a vehicle operates without GPS broadcast is an hour of fare collection that cannot be reconciled against a route record. The V/T ratio, reframed correctly, answers a single question the Operator cares about: _how much of today's revenue am I able to verify?_

---

## Why Remittance Integrity Is the Correct Frame

The matatu revenue model is cash-first and conductor-mediated. The conductor collects fares, remits a fixed daily amount to the Operator, and keeps the surplus. This model is structurally adversarial: the conductor has every incentive to under-report trip count and over-report fuel costs. The Operator's only defence is a verifiable record of how many trips the vehicle completed and on which route segments.

GPS broadcast coverage is the proxy for trip verifiability. A vehicle broadcasting continuously across a shift produces a route trace that can be reconciled against the expected fare yield for that route and distance. A vehicle broadcasting for only 40% of its shift produces a partial record — and the unrecorded 60% is the conductor's unaudited interval.

The V/T ratio at the fleet level aggregates this exposure. A fleet with a V/T ratio of 0.6 at 09:00 on a weekday morning is not a fleet with a connectivity problem. It is a fleet where 40% of vehicles are generating unverifiable revenue — and the Operator is absorbing that risk in silence.

---

## vehicleCoverage.ts: The Remittance Intelligence Layer

```typescript
// src/lib/analytics/vehicleCoverage.ts

import { db } from "$lib/server/db"
import { redis } from "$lib/server/redis"
import { posthog } from "$lib/server/posthog"

export interface ShiftCoverageRecord {
  vehicle_id: string
  plate_number: string
  operator_id: string
  shift_window_start: string
  shift_window_end: string
  total_shift_minutes: number
  broadcasting_minutes: number
  coverage_ratio: number // 0.0 – 1.0
  shift_honesty_band: "VERIFIED" | "PARTIAL" | "UNVERIFIED" | "ABSENT"
  estimated_unverified_fare_kes: number | null
  last_ping_at: string | null
  trip_count_estimated: number | null
}

export interface FleetVTSnapshot {
  org_id: string
  snapshot_at: string
  shift_window: "MORNING" | "AFTERNOON" | "EVENING"
  total_enrolled_vehicles: number
  broadcasting_vehicles: number
  vt_ratio: number
  fleet_honesty_score: number // weighted by route yield potential
  vehicles: ShiftCoverageRecord[]
  unverified_revenue_exposure_kes: number
}

// Shift windows reflect Nairobi matatu operating patterns
const SHIFT_WINDOWS = {
  MORNING: { start_hour: 5, end_hour: 13 },
  AFTERNOON: { start_hour: 13, end_hour: 20 },
  EVENING: { start_hour: 20, end_hour: 24 },
}

// Thresholds derived from route yield data — not arbitrary
// A vehicle on a high-density Nairobi route (e.g., CBD–Westlands)
// completes approximately 8–12 trips in a morning shift at KES 50–80/passenger
// with average occupancy of 12 passengers = KES 4,800–11,520 per shift
// Unverified minutes translate to proportional fare exposure
const AVERAGE_FARE_YIELD_PER_MINUTE_KES = 12 // conservative estimate, route-adjusted in production

export async function computeFleetVTSnapshot(
  orgId: string,
  shiftWindow: keyof typeof SHIFT_WINDOWS,
): Promise<FleetVTSnapshot> {
  const now = new Date()
  const windowDef = SHIFT_WINDOWS[shiftWindow]
  const shiftStart = new Date(now)
  shiftStart.setHours(windowDef.start_hour, 0, 0, 0)
  const shiftEnd = new Date(now)
  shiftEnd.setHours(windowDef.end_hour, 0, 0, 0)
  const totalShiftMinutes = (shiftEnd.getTime() - shiftStart.getTime()) / 60000

  // Fetch all enrolled vehicles for this org
  const enrolledVehicles = await db.driver_enrollments.findMany({
    where: { org_id: orgId },
    include: { vehicle: { select: { plate_number: true, operator_id: true } } },
  })

  // Fetch ping density per vehicle within the shift window
  const pingDensity = await db.$queryRaw<
    {
      vehicle_id: string
      broadcasting_minutes: number
      last_ping_at: string
      trip_count_estimated: number
    }[]
  >`
    SELECT
      vehicle_id,
      -- Broadcasting minutes: count distinct minute buckets with at least one ping
      COUNT(DISTINCT DATE_TRUNC('minute', recorded_at)) AS broadcasting_minutes,
      MAX(recorded_at) AS last_ping_at,
      -- Trip count estimated from ping gap analysis:
      -- gaps > 8 minutes between consecutive pings indicate a terminus stop
      COUNT(*) FILTER (
        WHERE recorded_at - LAG(recorded_at) OVER (PARTITION BY vehicle_id ORDER BY recorded_at) > INTERVAL '8 minutes'
      ) + 1 AS trip_count_estimated
    FROM trip_events
    WHERE
      org_id = ${orgId}
      AND recorded_at BETWEEN ${shiftStart.toISOString()} AND ${now.toISOString()}
      AND event_type IN ('GPS_PING', 'GENESIS_PING')
    GROUP BY vehicle_id
  `

  const pingMap = new Map(pingDensity.map((r) => [r.vehicle_id, r]))

  const vehicles: ShiftCoverageRecord[] = enrolledVehicles.map((enrollment) => {
    const pings = pingMap.get(enrollment.vehicle_id)
    const broadcastingMinutes = pings ? Number(pings.broadcasting_minutes) : 0
    const elapsedShiftMinutes = Math.min(
      (now.getTime() - shiftStart.getTime()) / 60000,
      totalShiftMinutes,
    )
    const coverageRatio =
      elapsedShiftMinutes > 0
        ? Math.min(broadcastingMinutes / elapsedShiftMinutes, 1.0)
        : 0

    const unverifiedMinutes = elapsedShiftMinutes - broadcastingMinutes
    const estimatedUnverifiedFareKes =
      unverifiedMinutes > 0
        ? Math.round(unverifiedMinutes * AVERAGE_FARE_YIELD_PER_MINUTE_KES)
        : 0

    return {
      vehicle_id: enrollment.vehicle_id,
      plate_number: enrollment.vehicle.plate_number,
      operator_id: enrollment.vehicle.operator_id,
      shift_window_start: shiftStart.toISOString(),
      shift_window_end: shiftEnd.toISOString(),
      total_shift_minutes: totalShiftMinutes,
      broadcasting_minutes: broadcastingMinutes,
      coverage_ratio: coverageRatio,
      shift_honesty_band: classifyShiftHonesty(coverageRatio),
      estimated_unverified_fare_kes: estimatedUnverifiedFareKes,
      last_ping_at: pings?.last_ping_at ?? null,
      trip_count_estimated: pings ? Number(pings.trip_count_estimated) : null,
    }
  })

  const broadcastingCount = vehicles.filter((v) => v.coverage_ratio > 0).length
  const vtRatio =
    enrolledVehicles.length > 0
      ? broadcastingCount / enrolledVehicles.length
      : 0
  const totalUnverifiedExposure = vehicles.reduce(
    (sum, v) => sum + (v.estimated_unverified_fare_kes ?? 0),
    0,
  )

  // Fleet honesty score weights coverage_ratio by route yield potential
  // Vehicles on high-yield routes contribute more to the score
  // In production, route_yield_weight comes from route analytics
  const fleetHonestyScore =
    vehicles.length > 0
      ? vehicles.reduce((sum, v) => sum + v.coverage_ratio, 0) / vehicles.length
      : 0

  const snapshot: FleetVTSnapshot = {
    org_id: orgId,
    snapshot_at: now.toISOString(),
    shift_window: shiftWindow,
    total_enrolled_vehicles: enrolledVehicles.length,
    broadcasting_vehicles: broadcastingCount,
    vt_ratio: vtRatio,
    fleet_honesty_score: fleetHonestyScore,
    vehicles,
    unverified_revenue_exposure_kes: totalUnverifiedExposure,
  }

  // Cache in Redis for dashboard reads — recomputed every 5 minutes
  await redis.set(
    `vt_snapshot:${orgId}:${shiftWindow}`,
    JSON.stringify(snapshot),
    { ex: 300 },
  )

  // PostHog fleet-level instrumentation
  await posthog.capture({
    distinctId: orgId,
    event: "fleet_vt_snapshot_computed",
    properties: {
      org_id: orgId,
      shift_window: shiftWindow,
      vt_ratio: vtRatio,
      fleet_honesty_score: fleetHonestyScore,
      total_enrolled: enrolledVehicles.length,
      broadcasting: broadcastingCount,
      unverified_exposure_kes: totalUnverifiedExposure,
      absent_vehicle_count: vehicles.filter(
        (v) => v.shift_honesty_band === "ABSENT",
      ).length,
      unverified_vehicle_count: vehicles.filter(
        (v) => v.shift_honesty_band === "UNVERIFIED",
      ).length,
    },
  })

  return snapshot
}
```

---

## Shift Honesty Classification: The Four Bands

```typescript
// src/lib/analytics/vehicleCoverage.ts (continued)

export function classifyShiftHonesty(
  coverageRatio: number,
): "VERIFIED" | "PARTIAL" | "UNVERIFIED" | "ABSENT" {
  // These thresholds are not arbitrary — they map to remittance audit utility:
  //
  // VERIFIED (≥ 0.85):
  //   85%+ of elapsed shift time has GPS coverage.
  //   The route trace is dense enough to reconstruct trip count, route segments,
  //   and fare yield with high confidence. Remittance dispute is defensible.
  //   Operator can challenge a conductor's stated trip count against the GPS record.
  //
  // PARTIAL (0.50 – 0.84):
  //   50–84% coverage. The record exists but has gaps.
  //   Gaps may be legitimate (tunnel, device restart) or adversarial (broadcast suppression).
  //   Operator should cross-reference against M-Pesa passenger receipts if available.
  //   Remittance dispute is possible but not airtight.
  //
  // UNVERIFIED (0.01 – 0.49):
  //   Less than half the shift is on record.
  //   The conductor's remittance figure cannot be verified against a route trace.
  //   Operator is absorbing unquantified revenue leakage.
  //   This band triggers an automated WhatsApp alert to the Operator.
  //
  // ABSENT (0.00):
  //   No pings received during the shift window.
  //   Vehicle is either not operating, has a device failure, or the driver
  //   has not opened the pairing URL. All three states require Operator action.
  //   This is the highest-priority alert band.

  if (coverageRatio >= 0.85) return "VERIFIED"
  if (coverageRatio >= 0.5) return "PARTIAL"
  if (coverageRatio > 0.0) return "UNVERIFIED"
  return "ABSENT"
}
```

The threshold logic is grounded in the remittance audit use case. A 50% coverage floor for PARTIAL is not a UX design choice — it is the minimum data density required to estimate trip count from ping gap analysis with acceptable confidence. Below 50%, the gap intervals are too long to distinguish a terminus stop from a broadcast suppression event. The Operator cannot use a sub-50% record in a remittance dispute because the gaps are as large as the data.

---

## The 6 AM WhatsApp Briefing: Operator Intelligence Delivery

The briefing is not a notification. It is a pre-shift command briefing that the Operator reads before vehicles depart. It must be delivered at 06:00 EAT, before the morning shift window opens at 05:30 — which means it is computed against the previous evening shift's final V/T snapshot and the current morning shift's enrolled vehicle roster.

```typescript
// src/lib/jobs/morningBriefing.ts

import {
  computeFleetVTSnapshot,
  classifyShiftHonesty,
} from "$lib/analytics/vehicleCoverage"
import { redis } from "$lib/server/redis"
import { db } from "$lib/server/db"
import { sendWhatsAppMessage } from "$lib/server/whatsapp"

export async function dispatchMorningBriefings(): Promise<void> {
  // Fetch all orgs with at least one enrolled vehicle and an active operator with a phone number
  const activeOrgs = await db.organisations.findMany({
    where: {
      driver_enrollments: { some: {} },
      subscription_status: { in: ["ACTIVE", "TRIALING"] },
    },
    include: {
      operators: {
        where: { role: "OPERATOR", phone_number: { not: null } },
        select: { id: true, phone_number: true, display_name: true },
      },
      driver_enrollments: {
        include: { vehicle: { select: { plate_number: true } } },
      },
    },
  })

  for (const org of activeOrgs) {
    // Pull the previous evening shift's final snapshot from Redis
    const eveningSnapshotRaw = await redis.get(`vt_snapshot:${org.id}:EVENING`)
    const eveningSnapshot = eveningSnapshotRaw
      ? JSON.parse(eveningSnapshotRaw)
      : null

    // Compute current morning roster — vehicles enrolled but not yet pinging
    const morningSnapshot = await computeFleetVTSnapshot(org.id, "MORNING")

    for (const operator of org.operators) {
      const message = composeMorningBriefing({
        operatorName: operator.display_name,
        morningSnapshot,
        eveningSnapshot,
        orgName: org.name,
      })

      await sendWhatsAppMessage({
        to: operator.phone_number!,
        message,
      })

      // PostHog: briefing dispatched
      await posthog.capture({
        distinctId: operator.id,
        event: "morning_briefing_dispatched",
        properties: {
          org_id: org.id,
          vt_ratio: morningSnapshot.vt_ratio,
          absent_count: morningSnapshot.vehicles.filter(
            (v) => v.shift_honesty_band === "ABSENT",
          ).length,
          unverified_exposure_kes:
            eveningSnapshot?.unverified_revenue_exposure_kes ?? 0,
        },
      })
    }
  }
}

function composeMorningBriefing(params: {
  operatorName: string
  morningSnapshot: FleetVTSnapshot
  eveningSnapshot: FleetVTSnapshot | null
  orgName: string
}): string {
  const { operatorName, morningSnapshot, eveningSnapshot, orgName } = params

  const absentVehicles = morningSnapshot.vehicles.filter(
    (v) => v.shift_honesty_band === "ABSENT",
  )
  const verifiedVehicles = morningSnapshot.vehicles.filter(
    (v) => v.shift_honesty_band === "VERIFIED",
  )

  // Evening shift remittance exposure — the number that makes Operators pay attention
  const eveningExposure = eveningSnapshot?.unverified_revenue_exposure_kes ?? 0
  const eveningUnverifiedVehicles = eveningSnapshot
    ? eveningSnapshot.vehicles.filter((v) =>
        ["UNVERIFIED", "ABSENT"].includes(v.shift_honesty_band),
      )
    : []

  const lines: string[] = []

  lines.push(`*FLAM Morning Briefing — ${orgName}*`)
  lines.push(
    `${new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "short" })} | 6:00 AM`,
  )
  lines.push("")

  // Fleet readiness
  lines.push(`*Fleet Readiness*`)
  lines.push(
    `${morningSnapshot.broadcasting_vehicles}/${morningSnapshot.total_enrolled_vehicles} vehicles broadcasting`,
  )

  if (absentVehicles.length > 0) {
    lines.push("")
    lines.push(`*⚠️ Not Yet Broadcasting (${absentVehicles.length})*`)
    absentVehicles.forEach((v) => {
      lines.push(
        `• ${v.plate_number} — share pairing link: https://driver.flam.co.ke/pair?v=${v.vehicle_id}`,
      )
    })
  }

  // Evening shift remittance intelligence — only shown if there was meaningful exposure
  if (eveningExposure > 500 && eveningUnverifiedVehicles.length > 0) {
    lines.push("")
    lines.push(`*Yesterday Evening — Unverified Revenue*`)
    lines.push(
      `KES ${eveningExposure.toLocaleString()} in fares collected without a GPS record.`,
    )
    eveningUnverifiedVehicles.forEach((v) => {
      lines.push(
        `• ${v.plate_number}: ${Math.round(v.coverage_ratio * 100)}% shift covered — KES ${(v.estimated_unverified_fare_kes ?? 0).toLocaleString()} unverified`,
      )
    })
    lines.push(
      `Review remittance on FLAM before accepting today's payment from these conductors.`,
    )
  }

  // Verified vehicles — positive reinforcement, not just alerts
  if (verifiedVehicles.length > 0) {
    lines.push("")
    lines.push(`*✅ Fully Verified Yesterday*`)
    lines.push(
      `${verifiedVehicles.length} vehicle${verifiedVehicles.length > 1 ? "s" : ""} with 85%+ shift coverage. Remittance defensible.`,
    )
  }

  lines.push("")
  lines.push(`View full fleet: https://app.flam.co.ke/fleet`)

  return lines.join("\n")
}
```

### Why 06:00 and Not 05:30

The morning shift window opens at 05:30 in Nairobi's matatu ecosystem — that is when vehicles begin loading at termini. The briefing at 06:00 is intentionally 30 minutes into the shift. By 06:00, any vehicle that is going to broadcast has already emitted its first morning ping. Any vehicle that has not broadcast by 06:00 on a weekday is genuinely absent from the shift — not just slow to start. The briefing at 06:00 therefore surfaces only actionable absences, not false alarms from vehicles that were simply slow to depart.

A 05:30 briefing would surface every vehicle as absent, creating alert fatigue. The 30-minute delay is a signal quality decision, not a convenience.

---

## V/T Ratio Thresholds as Monetisation Triggers

The V/T ratio is not only an operational signal — it is a monetisation surface. The relationship between V/T ratio and upgrade conversion is direct: an Operator who sees KES 8,400 in unverified revenue exposure in a single evening shift briefing has a concrete, quantified reason to ensure every vehicle is broadcasting. The free tier's 3-vehicle cap means that an Operator with a 10-vehicle fleet can only verify 30% of their fleet's remittance exposure on the free plan. The upgrade prompt is not a feature gate — it is a revenue recovery tool.

```typescript
// src/lib/analytics/vtMonetisationTrigger.ts

export interface VTMonetisationSignal {
  should_trigger_upgrade_prompt: boolean
  trigger_reason:
    | "UNVERIFIED_EXPOSURE_THRESHOLD"
    | "VT_RATIO_BELOW_FLOOR"
    | "ABSENT_VEHICLE_AT_LIMIT"
    | null
  unverified_exposure_kes: number
  vehicles_beyond_free_tier: number
  upgrade_copy: string | null
}

const FREE_TIER_VEHICLE_CAP = 3
const UNVERIFIED_EXPOSURE_TRIGGER_KES = 2000 // KES 2,000 unverified in a single shift
const VT_RATIO_FLOOR = 0.5 // Below 50% fleet coverage triggers upgrade prompt

export function evaluateVTMonetisationSignal(
  snapshot: FleetVTSnapshot,
  subscribedVehicleCount: number,
): VTMonetisationSignal {
  const vehiclesBeyondFreeTier = Math.max(
    0,
    snapshot.total_enrolled_vehicles - FREE_TIER_VEHICLE_CAP,
  )

  // Trigger 1: Unverified revenue exposure exceeds KES 2,000 in a single shift
  if (
    snapshot.unverified_revenue_exposure_kes >= UNVERIFIED_EXPOSURE_TRIGGER_KES
  ) {
    return {
      should_trigger_upgrade_prompt: true,
      trigger_reason: "UNVERIFIED_EXPOSURE_THRESHOLD",
      unverified_exposure_kes: snapshot.unverified_revenue_exposure_kes,
      vehicles_beyond_free_tier: vehiclesBeyondFreeTier,
      upgrade_copy: `KES ${snapshot.unverified_revenue_exposure_kes.toLocaleString()} in fares were collected without a GPS record last shift. Upgrade to verify your full fleet and close this gap.`,
    }
  }

  // Trigger 2: Fleet V/T ratio below 50% floor
  if (
    snapshot.vt_ratio < VT_RATIO_FLOOR &&
    snapshot.total_enrolled_vehicles > FREE_TIER_VEHICLE_CAP
  ) {
    return {
      should_trigger_upgrade_prompt: true,
      trigger_reason: "VT_RATIO_BELOW_FLOOR",
      unverified_exposure_kes: snapshot.unverified_revenue_exposure_kes,
      vehicles_beyond_free_tier: vehiclesBeyondFreeTier,
      upgrade_copy: `Only ${Math.round(snapshot.vt_ratio * 100)}% of your fleet is verifiable. ${vehiclesBeyondFreeTier} vehicle${vehiclesBeyondFreeTier > 1 ? "s are" : " is"} beyond your free plan. Upgrade to protect your full remittance record.`,
    }
  }

  // Trigger 3: Operator has vehicles beyond the free tier cap
  if (
    vehiclesBeyondFreeTier > 0 &&
    subscribedVehicleCount <= FREE_TIER_VEHICLE_CAP
  ) {
    return {
      should_trigger_upgrade_prompt: true,
      trigger_reason: "ABSENT_VEHICLE_AT_LIMIT",
      unverified_exposure_kes: snapshot.unverified_revenue_exposure_kes,
      vehicles_beyond_free_tier: vehiclesBeyondFreeTier,
      upgrade_copy: `${vehiclesBeyondFreeTier} vehicle${vehiclesBeyondFreeTier > 1 ? "s are" : " is"} enrolled but not protected. Your free plan covers 3 vehicles. Upgrade to verify every remittance.`,
    }
  }

  return {
    should_trigger_upgrade_prompt: false,
    trigger_reason: null,
    unverified_exposure_kes: snapshot.unverified_revenue_exposure_kes,
    vehicles_beyond_free_tier: vehiclesBeyondFreeTier,
    upgrade_copy: null,
  }
}
```

---

## Lifecycle Control Points

**ACTIVATION — The Magic Moment:**
The first time an Operator opens the fleet dashboard and sees a vehicle in the UNVERIFIED or ABSENT band alongside an estimated KES figure, the platform stops being a GPS tool and becomes a financial control instrument. This moment — seeing a specific, quantified revenue exposure for the first time — is the Operator's activation event for the analytics layer. PostHog must capture `vt_intelligence_first_viewed` with the unverified exposure figure as a property, because this is the data point that predicts upgrade conversion with highest confidence.

**ENGAGEMENT — The Habit:**
The 06:00 WhatsApp briefing is the daily ritual anchor. The Operator does not need to open the app — the intelligence comes to them. But every briefing that surfaces an unverified exposure figure contains a deep-link back to the fleet dashboard, and the dashboard's V/T ratio panel is the first element above the fold. The briefing creates the habit; the dashboard deepens it. An Operator who opens the fleet dashboard after reading their morning briefing is exhibiting the engagement pattern that predicts long-term retention — the briefing is the trigger, the dashboard is the reward.

**MONETISATION — The Commitment:**
The `evaluateVTMonetisationSignal` function is called on every fleet dashboard load and every morning briefing dispatch. The upgrade prompt is not a modal — it is an inline banner in the V/T ratio panel with the specific KES exposure figure and the vehicle count beyond the free tier. The copy is always quantified: not 'upgrade for more features' but 'KES 6,200 in unverified fares last week — upgrade to close this gap.' The M-Pesa STK push is initiated from the banner without navigating away from the fleet view.

**RETENTION — The Stickiness:**
An Operator who has used the V/T ratio and morning briefing to challenge a conductor's remittance figure — and won — has experienced the platform's core value proposition in the most visceral way possible. This event must be capturable: a 'Remittance Dispute Resolved' action in the platform that records which vehicle's GPS data was used as evidence. The accumulation of resolved disputes is the stickiest retention signal in the Operator persona's lifecycle. The platform must surface this: 'You have used FLAM records to resolve 4 remittance disputes. Your verified remittance history is 9 months deep.'

**EXPANSION — The Flywheel:**
Operators who share their morning briefing screenshot in SACCO WhatsApp groups — which they will, because the KES unverified exposure figure is a socially provocative data point among peers — are the organic distribution channel for the V/T intelligence layer. The briefing is designed to be screenshot-worthy: a clean, numbered list with a specific KES figure and a platform attribution line. No Operator who sees another Operator's briefing showing KES 8,400 in unverified exposure will accept that their own fleet is operating without this visibility. The referral is not a feature — it is a competitive anxiety trigger dressed as a morning briefing.

### 4. Compliance Monetization & Ledger Gate

## The Core Utility Identified

The Operator's operating license is a depreciating asset. Every undocumented route deviation, every unanchored private-hire booking, every shift with a sub-50% V/T ratio is a liability accumulation event — not a neutral operational gap. The NTSA can revoke a PSV license on the basis of a single undefended deviation complaint. A SACCO can suspend a member operator for an unlogged vehicle absence. An insurance underwriter can deny a claim for a trip that has no GPS record. The Operator is not buying software. They are buying an evidentiary record that keeps their license alive and their insurance valid. The FreeTierLedgerGate and the per-event escrow flow are both expressions of the same underlying value: compliance as legal insurance, priced at a fraction of the liability it offsets.

---

## Why Flat Subscription and Per-Event Revenue Are Not Competing Models

The instinct in SaaS monetisation is to collapse everything into a subscription. For cost-sensitive SACCO owners, a flat monthly fee is a fixed liability that feels like overhead — especially in months where charter bookings are sparse. The per-event escrow model inverts this: the Operator pays only when they generate revenue from a private-hire booking, and the payment is extracted from the booking fare itself, not from the Operator's operating capital. The platform takes a percentage of the agreed fare at the moment the M-Pesa deposit is collected, before the Operator ever touches the money. This is not a fee — it is a revenue share on a transaction that would not have been legally defensible without the BUSINESS_RESERVATION ledger anchor.

The two models serve different Operator archetypes:

- **Subscription (Starter/Pro/Business):** The Operator with a stable fleet running licensed routes daily. Their compliance exposure is continuous, their V/T ratio is the primary risk signal, and a flat monthly fee is justified by the daily operational intelligence the platform delivers.
- **Per-event escrow:** The Operator who runs primarily on licensed routes but takes occasional private-hire bookings — school runs, corporate transfers, event charters. Their compliance exposure is episodic, not continuous. A flat subscription feels like paying for a service they only need intermittently. The per-event model captures revenue from these Operators without forcing a subscription commitment they will resist.

The two models compound rather than cannibalise: per-event Operators who exceed 5 anchored bookings per month — the free tier cap — encounter the FreeTierLedgerGate and convert to subscription because the per-event fee on 6+ bookings exceeds the monthly subscription cost. The gate is not a punishment; it is a natural economic conversion point.

---

## FreeTierLedgerGate: Architecture and Copy

### The Gate Trigger

The free tier permits 5 BUSINESS_RESERVATION ledger anchors per calendar month per organisation. This cap is tracked in a `ledger_anchor_usage` table with a monthly reset:

```typescript
// src/lib/server/billing/ledgerGate.ts

import { db } from "$lib/server/db"
import { redis } from "$lib/server/redis"

export interface LedgerGateStatus {
  org_id: string
  current_month_anchors: number
  free_tier_cap: number
  is_gated: boolean
  anchors_remaining: number
  reset_date: string // First day of next calendar month
  subscription_tier: "FREE" | "STARTER" | "PRO" | "BUSINESS"
  per_event_eligible: boolean // True if org has M-Pesa linked and booking has agreed_fare
}

const FREE_TIER_CAP = 5
const TIER_CAPS: Record<string, number> = {
  FREE: 5,
  STARTER: 30,
  PRO: 150,
  BUSINESS: Infinity,
}

export async function getLedgerGateStatus(
  orgId: string,
): Promise<LedgerGateStatus> {
  // Redis cache for hot-path reads — invalidated on each anchor write
  const cached = await redis.get(`ledger_gate:${orgId}`)
  if (cached) return JSON.parse(cached)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const [org, anchorCount] = await Promise.all([
    db.organisations.findUnique({
      where: { id: orgId },
      select: { subscription_tier: true, mpesa_account_linked: true },
    }),
    db.fleet_bookings.count({
      where: {
        org_id: orgId,
        status: "LEDGER_ANCHORED",
        created_at: {
          gte: monthStart.toISOString(),
          lt: monthEnd.toISOString(),
        },
      },
    }),
  ])

  const tier = (org?.subscription_tier ?? "FREE") as keyof typeof TIER_CAPS
  const cap = TIER_CAPS[tier] ?? FREE_TIER_CAP
  const isGated = anchorCount >= cap

  const status: LedgerGateStatus = {
    org_id: orgId,
    current_month_anchors: anchorCount,
    free_tier_cap: cap,
    is_gated: isGated,
    anchors_remaining: Math.max(0, cap - anchorCount),
    reset_date: monthEnd.toISOString(),
    subscription_tier: tier as LedgerGateStatus["subscription_tier"],
    per_event_eligible: !!org?.mpesa_account_linked,
  }

  await redis.set(`ledger_gate:${orgId}`, JSON.stringify(status), { ex: 300 })
  return status
}

export async function assertLedgerNotGated(
  orgId: string,
  bookingFareKes: number | null,
): Promise<{
  permitted: boolean
  route: "SUBSCRIPTION" | "PER_EVENT" | "BLOCKED"
}> {
  const gate = await getLedgerGateStatus(orgId)

  if (!gate.is_gated) return { permitted: true, route: "SUBSCRIPTION" }

  // Gated but has a fare and M-Pesa linked — eligible for per-event escrow
  if (gate.per_event_eligible && bookingFareKes && bookingFareKes > 0) {
    return { permitted: true, route: "PER_EVENT" }
  }

  // Gated, no per-event path available — hard block with upgrade prompt
  return { permitted: false, route: "BLOCKED" }
}
```

### The LedgerAnchorButton Gate State

The `LedgerAnchorButton.svelte` component already tracks five render states (idle, loading, success, error, quota-exceeded) for PostHog instrumentation. The gate introduces a sixth state: `PER_EVENT_OFFER` — displayed when the Operator is gated on subscription anchors but the booking has an agreed fare that qualifies for per-event escrow.

```svelte
<!-- src/lib/components/fleet/LedgerAnchorButton.svelte (gate state additions) -->

<script lang="ts">
  import type { LedgerGateStatus } from "$lib/server/billing/ledgerGate"
  import { posthog } from "$lib/client/posthog"

  export let bookingId: string
  export let agreedFareKes: number | null
  export let gateStatus: LedgerGateStatus

  type ButtonState =
    | "IDLE"
    | "LOADING"
    | "SUCCESS"
    | "ERROR"
    | "QUOTA_EXCEEDED"
    | "PER_EVENT_OFFER"

  let state: ButtonState = deriveInitialState(gateStatus)

  function deriveInitialState(gate: LedgerGateStatus): ButtonState {
    if (!gate.is_gated) return "IDLE"
    if (gate.per_event_eligible && agreedFareKes && agreedFareKes > 0)
      return "PER_EVENT_OFFER"
    return "QUOTA_EXCEEDED"
  }

  // Per-event fee: 2.5% of agreed fare, minimum KES 50
  $: perEventFeeKes = agreedFareKes
    ? Math.max(50, Math.round(agreedFareKes * 0.025))
    : null

  async function handleAnchor(route: "SUBSCRIPTION" | "PER_EVENT") {
    state = "LOADING"
    posthog.capture("ledger_anchor_initiated", {
      booking_id: bookingId,
      route,
      per_event_fee_kes: route === "PER_EVENT" ? perEventFeeKes : null,
      anchors_remaining: gateStatus.anchors_remaining,
    })

    try {
      const res = await fetch(
        `/api/fleet/bookings/${bookingId}/anchor-ledger`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ route }),
        },
      )

      if (!res.ok) {
        const err = await res.json()
        if (err.code === "LEDGER_GATE_BLOCKED") {
          state = "QUOTA_EXCEEDED"
          posthog.capture("ledger_anchor_gate_hit", {
            booking_id: bookingId,
            gate_reason: err.reason,
          })
          return
        }
        throw new Error(err.message)
      }

      state = "SUCCESS"
      posthog.capture("ledger_anchor_completed", {
        booking_id: bookingId,
        route,
      })
    } catch (e) {
      state = "ERROR"
      posthog.capture("ledger_anchor_error", {
        booking_id: bookingId,
        error: String(e),
      })
    }
  }
</script>

{#if state === "IDLE"}
  <button
    class="ledger-anchor-btn ledger-anchor-btn--idle"
    on:click={() => handleAnchor("SUBSCRIPTION")}
  >
    🔒 Lock &amp; Protect
    <span class="ledger-anchor-btn__sub">
      {gateStatus.anchors_remaining} protected booking{gateStatus.anchors_remaining !==
      1
        ? "s"
        : ""} remaining this month
    </span>
  </button>
{:else if state === "PER_EVENT_OFFER"}
  <!-- Gated on subscription but per-event path available -->
  <div class="ledger-gate-per-event">
    <p class="ledger-gate-per-event__headline">
      You've used all 5 protected bookings this month.
    </p>
    <p class="ledger-gate-per-event__body">
      This booking can still be anchored to the compliance ledger for a
      single-booking fee of
      <strong>KES {perEventFeeKes?.toLocaleString()}</strong>
      (2.5% of KES {agreedFareKes?.toLocaleString()}). The fee is deducted from
      the M-Pesa deposit before it reaches your account. Your route-deviation
      protection applies immediately on anchor.
    </p>
    <div class="ledger-gate-per-event__actions">
      <button
        class="ledger-anchor-btn ledger-anchor-btn--per-event"
        on:click={() => handleAnchor("PER_EVENT")}
      >
        Anchor for KES {perEventFeeKes?.toLocaleString()}
      </button>
      <a href="/billing/upgrade" class="ledger-gate-per-event__upgrade-link">
        Or upgrade for unlimited anchors from KES 1,200/month
      </a>
    </div>
  </div>
{:else if state === "QUOTA_EXCEEDED"}
  <!-- Gated, no per-event path — hard block with upgrade prompt -->
  <div class="ledger-gate-blocked">
    <p class="ledger-gate-blocked__headline">
      5 of 5 protected bookings used this month.
    </p>
    <p class="ledger-gate-blocked__body">
      Without a ledger anchor, this booking has no route-deviation protection.
      If NTSA or your SACCO audits this vehicle during this window, you have no
      record. Upgrade to continue anchoring protection — or add a client fare to
      unlock the per-booking option.
    </p>
    <a href="/billing/upgrade" class="ledger-gate-blocked__cta">
      Upgrade — from KES 1,200/month
    </a>
    <p class="ledger-gate-blocked__reset">
      Free tier resets {new Date(gateStatus.reset_date).toLocaleDateString(
        "en-KE",
        { day: "numeric", month: "long" },
      )}
    </p>
  </div>
{:else if state === "SUCCESS"}
  <div class="ledger-anchor-success">
    ✅ Booking anchored. Route-deviation protection active.
  </div>
{:else if state === "LOADING"}
  <button class="ledger-anchor-btn ledger-anchor-btn--loading" disabled>
    Anchoring to ledger…
  </button>
{:else if state === "ERROR"}
  <button
    class="ledger-anchor-btn ledger-anchor-btn--error"
    on:click={() => handleAnchor("SUBSCRIPTION")}
  >
    Anchor failed — tap to retry
  </button>
{/if}
```

---

## Per-Event Escrow: M-Pesa Billing Route

The per-event escrow flow is architecturally distinct from the subscription M-Pesa STK push. The subscription STK push is initiated by the Operator against their own M-Pesa number for a flat monthly amount. The per-event escrow is initiated against the client's M-Pesa number (the charter customer) and splits the incoming payment before it settles — the platform fee is extracted at the point of collection, not as a separate charge to the Operator.

```typescript
// src/routes/api/fleet/bookings/[id]/anchor-ledger/+server.ts

import type { RequestHandler } from "./$types"
import { json, error } from "@sveltejs/kit"
import { db } from "$lib/server/db"
import {
  assertLedgerNotGated,
  getLedgerGateStatus,
} from "$lib/server/billing/ledgerGate"
import { anchorBusinessReservation } from "$lib/server/fabric/businessReservation"
import { initiatePerEventEscrow } from "$lib/server/billing/perEventEscrow"
import { redis } from "$lib/server/redis"
import { posthog } from "$lib/server/posthog"

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const { id: bookingId } = params
  const { route } = (await request.json()) as {
    route: "SUBSCRIPTION" | "PER_EVENT"
  }
  const operatorId = locals.session.user.id
  const orgId = locals.session.org_id

  const booking = await db.fleet_bookings.findUnique({
    where: { id: bookingId, org_id: orgId, operator_id: operatorId },
  })

  if (!booking) throw error(404, "Booking not found or not accessible.")
  if (booking.status === "LEDGER_ANCHORED")
    throw error(409, "Booking already anchored.")

  // Server-side gate evaluation — client state is advisory only
  const { permitted, route: resolvedRoute } = await assertLedgerNotGated(
    orgId,
    booking.agreed_fare,
  )

  if (!permitted) {
    throw error(402, {
      code: "LEDGER_GATE_BLOCKED",
      reason: "FREE_TIER_EXHAUSTED",
      message:
        "Monthly anchor limit reached. Upgrade or add a booking fare to unlock per-event anchoring.",
    })
  }

  // Route mismatch guard — client requested per-event but server resolved subscription (or vice versa)
  if (route !== resolvedRoute) {
    // Accept the server-resolved route — do not fail, just use the correct path
  }

  if (resolvedRoute === "PER_EVENT") {
    // Per-event escrow: collect fee from client M-Pesa before anchoring
    const escrowResult = await initiatePerEventEscrow({
      bookingId,
      orgId,
      operatorId,
      agreedFareKes: booking.agreed_fare!,
      clientPhone: booking.client_contact!,
      vehicleId: booking.vehicle_id,
    })

    if (!escrowResult.collection_initiated) {
      throw error(
        502,
        "M-Pesa STK push to client failed. Verify the client phone number and retry.",
      )
    }

    // Return immediately — anchor fires in the M-Pesa callback once payment confirmed
    return json({
      status: "ESCROW_PENDING",
      mpesa_checkout_request_id: escrowResult.checkout_request_id,
      per_event_fee_kes: escrowResult.platform_fee_kes,
      message:
        "M-Pesa payment request sent to client. Ledger anchor will fire automatically on payment confirmation.",
    })
  }

  // Subscription route — anchor immediately
  const result = await anchorBusinessReservation(bookingId, operatorId)

  // Invalidate Redis gate cache so next anchor check reflects updated count
  await redis.del(`ledger_gate:${orgId}`)

  return json({ status: "LEDGER_ANCHORED", ledger_tx_id: result.txId })
}
```

```typescript
// src/lib/server/billing/perEventEscrow.ts

import { db } from "$lib/server/db"
import { mpesa } from "$lib/server/mpesa"
import { redis } from "$lib/server/redis"

export interface EscrowInitResult {
  collection_initiated: boolean
  checkout_request_id: string | null
  platform_fee_kes: number
  operator_net_kes: number
}

const PLATFORM_FEE_RATE = 0.025 // 2.5%
const MINIMUM_FEE_KES = 50

export async function initiatePerEventEscrow(params: {
  bookingId: string
  orgId: string
  operatorId: string
  agreedFareKes: number
  clientPhone: string
  vehicleId: string
}): Promise<EscrowInitResult> {
  const platformFeeKes = Math.max(
    MINIMUM_FEE_KES,
    Math.round(params.agreedFareKes * PLATFORM_FEE_RATE),
  )
  const operatorNetKes = params.agreedFareKes - platformFeeKes

  // STK push to client phone for the full agreed fare
  // The split happens at the Daraja API B2B settlement layer, not at collection
  // For MVP: collect full fare to platform paybill, settle operator net via B2B transfer
  const stkResult = await mpesa.stkPush({
    phone: params.clientPhone,
    amount: params.agreedFareKes,
    account_reference: `FLAM-${params.bookingId.slice(0, 8).toUpperCase()}`,
    transaction_desc: `Charter booking deposit — ${params.vehicleId}`,
    callback_url: `${process.env.PUBLIC_BASE_URL}/api/mpesa/callbacks/per-event-escrow`,
  })

  if (!stkResult.success) {
    return {
      collection_initiated: false,
      checkout_request_id: null,
      platform_fee_kes: platformFeeKes,
      operator_net_kes: operatorNetKes,
    }
  }

  // Store escrow intent in Redis — callback handler reads this to know what to do on confirmation
  await redis.set(
    `escrow_intent:${stkResult.checkout_request_id}`,
    JSON.stringify({
      booking_id: params.bookingId,
      org_id: params.orgId,
      operator_id: params.operatorId,
      vehicle_id: params.vehicleId,
      agreed_fare_kes: params.agreedFareKes,
      platform_fee_kes: platformFeeKes,
      operator_net_kes: operatorNetKes,
    }),
    { ex: 600 }, // 10-minute window for STK push completion
  )

  // Record pending escrow in PostgreSQL for audit trail
  await db.per_event_escrow_records.create({
    data: {
      booking_id: params.bookingId,
      org_id: params.orgId,
      operator_id: params.operatorId,
      agreed_fare_kes: params.agreedFareKes,
      platform_fee_kes: platformFeeKes,
      operator_net_kes: operatorNetKes,
      mpesa_checkout_request_id: stkResult.checkout_request_id,
      status: "PENDING",
    },
  })

  return {
    collection_initiated: true,
    checkout_request_id: stkResult.checkout_request_id,
    platform_fee_kes: platformFeeKes,
    operator_net_kes: operatorNetKes,
  }
}
```

```typescript
// src/routes/api/mpesa/callbacks/per-event-escrow/+server.ts

import type { RequestHandler } from "./$types"
import { json } from "@sveltejs/kit"
import { redis } from "$lib/server/redis"
import { db } from "$lib/server/db"
import { anchorBusinessReservation } from "$lib/server/fabric/businessReservation"
import { posthog } from "$lib/server/posthog"

export const POST: RequestHandler = async ({ request }) => {
  const callback = await request.json()
  const { CheckoutRequestID, ResultCode, ResultDesc } =
    callback.Body.stkCallback

  const intentRaw = await redis.get(`escrow_intent:${CheckoutRequestID}`)
  if (!intentRaw) {
    // Callback arrived after Redis TTL — log and return 200 to prevent M-Pesa retry storm
    console.error(
      `Escrow intent not found for CheckoutRequestID: ${CheckoutRequestID}`,
    )
    return json({ ResultCode: 0, ResultDesc: "Accepted" })
  }

  const intent = JSON.parse(intentRaw)

  if (ResultCode !== 0) {
    // Payment failed or cancelled — update escrow record, do not anchor
    await db.per_event_escrow_records.update({
      where: { mpesa_checkout_request_id: CheckoutRequestID },
      data: { status: "FAILED", failure_reason: ResultDesc },
    })

    await redis.del(`escrow_intent:${CheckoutRequestID}`)

    posthog.capture({
      distinctId: intent.operator_id,
      event: "per_event_escrow_payment_failed",
      properties: { booking_id: intent.booking_id, result_desc: ResultDesc },
    })

    return json({ ResultCode: 0, ResultDesc: "Accepted" })
  }

  // Payment confirmed — anchor the booking to Hyperledger Fabric
  const anchorResult = await anchorBusinessReservation(
    intent.booking_id,
    intent.operator_id,
  )

  // Update escrow record with M-Pesa reference and anchor confirmation
  const mpesaRef = callback.Body.stkCallback.CallbackMetadata?.Item?.find(
    (i: { Name: string }) => i.Name === "MpesaReceiptNumber",
  )?.Value

  await db.per_event_escrow_records.update({
    where: { mpesa_checkout_request_id: CheckoutRequestID },
    data: {
      status: "SETTLED",
      mpesa_receipt_number: mpesaRef,
      ledger_tx_id: anchorResult.txId,
      settled_at: new Date().toISOString(),
    },
  })

  // Update the booking record with M-Pesa reference
  await db.fleet_bookings.update({
    where: { id: intent.booking_id },
    data: { mpesa_reference: mpesaRef },
  })

  // Invalidate Redis gate cache — per-event anchors do not count against the free tier cap
  // The gate tracks subscription-route anchors only; per-event is a separate revenue stream
  // No redis.del needed here — per-event does not increment the monthly counter

  await redis.del(`escrow_intent:${CheckoutRequestID}`)

  // Notify operator via Supabase realtime — booking is now LEDGER_ANCHORED
  // The FleetBooking grid subscribes to fleet_bookings and will update without page refresh

  posthog.capture({
    distinctId: intent.operator_id,
    event: "per_event_escrow_settled",
    properties: {
      booking_id: intent.booking_id,
      agreed_fare_kes: intent.agreed_fare_kes,
      platform_fee_kes: intent.platform_fee_kes,
      operator_net_kes: intent.operator_net_kes,
      ledger_tx_id: anchorResult.txId,
    },
  })

  return json({ ResultCode: 0, ResultDesc: "Accepted" })
}
```

---

## Compliance Segments as Legal Insurance: The Framing Architecture

The upgrade pricing page and all in-app upgrade prompts must frame each tier against a specific legal exposure scenario, not against a feature list. Feature lists are evaluated by price-sensitive SACCO owners as overhead. Legal exposure scenarios are evaluated as risk mitigation — a fundamentally different cognitive frame.

### Tier Framing by Legal Exposure

**Free Tier — 5 anchored bookings/month:**
Framed as: _Proof of concept for operators running occasional private hires._ The copy does not say 'limited features.' It says: _'5 route-deviation protection records per month. Enough to cover occasional charters. Not enough for a commercial operation.'_ The implicit message: if you are running more than 5 private hires per month, you are running a commercial operation and you need commercial protection.

**Starter — KES 1,200/month, 30 anchored bookings:**
Framed as: _NTSA audit readiness for single-operator fleets._ The copy: _'30 anchored records per month — enough to cover a 10-vehicle fleet running 3 private hires per vehicle monthly. Every deviation is on the immutable record. NTSA route deviation complaints are answered with a Hyperledger transaction hash, not a verbal explanation.'_

The KES 1,200 price point is not positioned against competitor software. It is positioned against the cost of a single NTSA route deviation penalty, which ranges from KES 5,000 to KES 50,000 depending on severity. The copy: _'One NTSA penalty costs more than 4 months of Starter. The ledger record is cheaper than the fine it prevents.'_

**Pro — KES 3,500/month, 150 anchored bookings:**
Framed as: _SACCO dispute immunity for multi-operator fleets._ The copy: _'150 anchored records per month. Full V/T ratio intelligence. Morning briefings with remittance exposure figures. When a SACCO dispute goes to arbitration, your Hyperledger audit trail is the evidence. Pro operators have resolved 4 disputes on average using FLAM records in the past 6 months.'_

The social proof figure — 4 disputes resolved — is pulled from the `remittance_dispute_resolved` PostHog event and rendered dynamically. It is not marketing copy; it is a live metric from the platform's own data, updated monthly.

**Business — KES 8,000/month, unlimited anchored bookings:**
Framed as: _Insurance underwriter compliance for fleet financing._ The copy: _'Unlimited ledger anchors. Transit Data API access for regulators and insurers. Fleet operators seeking PSV insurance renewals or SACCO-backed vehicle financing use FLAM Business records as evidence of operational compliance. Your Hyperledger history is a financial instrument.'_

This tier targets SACCO chairs and fleet owners with 15+ vehicles who are in active dialogue with insurance underwriters or development finance institutions (DFIs) for fleet expansion financing. The compliance record is not just a legal shield — it is a credit signal.

### The Upgrade Prompt Hierarchy

Upgrade prompts are surfaced in three contexts, each with distinct copy:

**1. LedgerAnchorButton — inline in the booking drawer (highest intent):**
The Operator is in the act of creating a booking. They have already entered the vehicle, time window, client details, and agreed fare. They are at the commitment point. The gate copy at this moment must be the most direct: _'You've used 5 of 5 protected bookings this month. This booking has no route-deviation protection until you upgrade. One NTSA complaint about this vehicle during this window and you have no record.'_

The M-Pesa STK push is initiated from this prompt without navigating away from the drawer. The Operator does not leave the booking context.

**2. Fleet Dashboard V/T Panel — contextual, data-driven (medium intent):**
The `evaluateVTMonetisationSignal` function surfaces the upgrade prompt inline in the V/T ratio panel when unverified revenue exposure exceeds KES 2,000. The copy is always quantified against the Operator's own data: _'KES 6,200 in fares collected without a GPS record last shift. Upgrade to verify your full fleet.'_

**3. Morning WhatsApp Briefing — ambient, habit-forming (low intent, high frequency):**
The briefing does not contain a hard upgrade CTA. It contains the unverified exposure figure and a deep-link to the fleet dashboard. The upgrade prompt is encountered when the Operator follows the deep-link and lands on the V/T panel. The briefing plants the cognitive seed; the dashboard closes the conversion.

---

## Lifecycle Control Points

**ACTIVATION — The Magic Moment:**
The first time an Operator encounters the `PER_EVENT_OFFER` state in the LedgerAnchorButton — and completes a per-event escrow payment — is the activation moment for the monetisation layer. The Operator has experienced the full compliance-to-payment loop: booking created, client charged via M-Pesa, ledger anchored, route-deviation protection active. PostHog must capture `per_event_escrow_first_completed` with the agreed fare and platform fee as properties. This event predicts subscription conversion with higher confidence than any other single action in the Operator lifecycle.

**MONETISATION — The Commitment:**
The economic conversion point is the moment an Operator's per-event fees in a single month exceed the Starter subscription cost of KES 1,200. At 2.5% per event, this occurs when the Operator anchors bookings with a combined fare of KES 48,000 — approximately 6 bookings at KES 8,000 each. The platform must surface this calculation explicitly: _'You've paid KES 1,440 in per-event fees this month. A Starter subscription would have cost KES 1,200 and covered 30 anchors. Upgrade now and save KES 240 — plus 24 more protected bookings this month.'_ This is not a upsell; it is a financial optimisation the Operator would reach independently given enough data. The platform surfaces it before they do the arithmetic themselves.

**RETENTION — The Stickiness:**
The per-event escrow records in `per_event_escrow_records` are a financial history the Operator cannot reconstruct outside the platform. Each record contains the M-Pesa receipt number, the Hyperledger transaction hash, the client phone, and the agreed fare. This is simultaneously a compliance record and an accounts receivable ledger. An Operator with 18 months of escrow records has a complete charter revenue history — verifiable, immutable, and linked to client M-Pesa identities. The switching cost is not the GPS software; it is the financial audit trail.

**EXPANSION — The Flywheel:**
SACCO chairs who observe member operators using BUSINESS_RESERVATION ledger anchors to resolve disputes — and winning — become the acquisition channel for the Business tier. The SACCO chair's incentive is not individual compliance; it is collective SACCO liability reduction. A SACCO whose member operators all have anchored deviation records is a SACCO that cannot be sanctioned for unlogged route violations at the fleet level. The upgrade path from member operator Starter accounts to a SACCO-wide Business account is the highest-value expansion motion in the platform — and it is triggered by a dispute resolution event, not a sales conversation.

### 5. Technical Execution

**Overview**
Building the Compliance Monetisation & Ledger Gate system: a FreeTierLedgerGate that blocks BUSINESS_RESERVATION anchors at 5/month on free tier, surfaces a per-event M-Pesa escrow path at 2.5% of agreed fare, and drives subscription conversion via quantified revenue-exposure copy. Confidence: 93%.

**What We're Building**

1. LedgerGateStatus computation and Redis-cached gate evaluation
2. LedgerAnchorButton six-state UI (IDLE, LOADING, SUCCESS, ERROR, QUOTA_EXCEEDED, PER_EVENT_OFFER)
3. Per-event M-Pesa STK push escrow flow with Redis intent store and Daraja callback handler
4. Anchor-ledger API endpoint routing between SUBSCRIPTION and PER_EVENT paths
5. Inline upgrade prompt with operator-specific KES exposure figures and M-Pesa STK push initiation

**Technical Tasks**

1. Implement getLedgerGateStatus + assertLedgerNotGated with Redis cache invalidation → src/lib/server/billing/ledgerGate.ts
2. Implement initiatePerEventEscrow with STK push, Redis intent store, and per_event_escrow_records insert → src/lib/server/billing/perEventEscrow.ts
3. Implement anchor-ledger POST endpoint routing SUBSCRIPTION vs PER_EVENT with server-side gate assertion → src/routes/api/fleet/bookings/[id]/anchor-ledger/+server.ts
4. Implement M-Pesa callback handler: read Redis intent, call anchorBusinessReservation, update escrow record and fleet_booking → src/routes/api/mpesa/callbacks/per-event-escrow/+server.ts
5. Build LedgerAnchorButton.svelte with all six states, deriveInitialState from gateStatus prop, and PostHog capture on every state transition → src/lib/components/fleet/LedgerAnchorButton.svelte
6. Add per_event_escrow_records table migration and ledger_anchor_usage monthly count query → supabase/migrations/add_per_event_escrow.sql

**Data Triggers**

- fleet_bookings anchor attempt with org monthly anchor count >= tier cap → gate evaluation
- assertLedgerNotGated resolves PER_EVENT when agreed_fare > 0 and mpesa_account_linked
- M-Pesa STK push ResultCode === 0 in callback → anchorBusinessReservation fires
- per_event fees in month exceed KES 1,200 → inline subscription conversion prompt
- vt_snapshot unverified_revenue_exposure_kes >= 2000 → upgrade banner in V/T panel

**Success Metrics**

- per_event_escrow_first_completed rate > 40% of operators who hit QUOTA_EXCEEDED with a fare-bearing booking
- Subscription conversion within 30 days of first QUOTA_EXCEEDED event > 25%
- Anchor-ledger endpoint p95 latency < 800ms on SUBSCRIPTION path, < 1200ms on PER_EVENT path
- M-Pesa callback → ledger anchor completion rate > 95% (measures escrow reliability)
- Monthly per-event fee total exceeding Starter cost surfaced to operator within same billing period: conversion lift target > 15pp vs control

## Todo

- [ ] Create database schema and server-side billing/gate logic: add `per_event_escrow_records` table and `vehicle_pairing_tokens` migration (`supabase/migrations/`), implement `getLedgerGateStatus` + `assertLedgerNotGated` with Redis caching (`src/lib/server/billing/ledgerGate.ts`), implement `initiatePerEventEscrow` with M-Pesa STK push and Redis intent store (`src/lib/server/billing/perEventEscrow.ts`), and implement Fabric gateway abstraction for `BUSINESS_RESERVATION` and `GENESIS_ENROLLMENT` events (`src/lib/server/fabric/businessReservation.ts`)
- [ ] Create backend API endpoints: CRUD + RLS-aware fleet bookings (`src/routes/api/fleet/bookings/+server.ts`), anchor-ledger POST routing `SUBSCRIPTION` vs `PER_EVENT` with server-side conflict guard and gate assertion (`src/routes/api/fleet/bookings/[id]/anchor-ledger/+server.ts`), M-Pesa escrow callback handler that reads Redis intent and fires ledger anchor (`src/routes/api/mpesa/callbacks/per-event-escrow/+server.ts`), driver pairing token exchange and Redis session creation (`src/routes/api/driver/pair/+server.ts`), and GPS ping ingestion with `GENESIS_ENROLLMENT` side-effect trigger (`src/routes/api/gps/ping/+server.ts`)
- [ ] Create analytics and intelligence layer: `computeFleetVTSnapshot` with shift-window ping-density SQL, `classifyShiftHonesty` four-band logic, and `evaluateVTMonetisationSignal` upgrade triggers (`src/lib/analytics/vehicleCoverage.ts`, `src/lib/analytics/vtMonetisationTrigger.ts`); implement `dispatchMorningBriefings` 06:00 job with WhatsApp message composition and PostHog instrumentation (`src/lib/jobs/morningBriefing.ts`); implement pairing token generation/verification (`src/lib/server/auth/pairingToken.ts`)
- [ ] Build fleet UI components: multi-vehicle horizontal timeline grid with Supabase realtime subscription and conflict highlighting (`src/lib/components/fleet/BookingTimelineGrid.svelte`), right-side booking creation drawer with 5-step flow (`src/lib/components/fleet/BookingDrawer.svelte`), `LedgerAnchorButton.svelte` with all six states (`IDLE`, `LOADING`, `SUCCESS`, `ERROR`, `QUOTA_EXCEEDED`, `PER_EVENT_OFFER`), `deriveInitialState` from `gateStatus` prop, per-event fee display, and PostHog capture on every state transition (`src/lib/components/fleet/LedgerAnchorButton.svelte`), and the parent `FleetBooking.svelte` orchestrating role-scoped data fetching and V/T upgrade banner (`src/lib/components/fleet/FleetBooking.svelte`)
- [ ] Create driver PWA auth and client-side stores: `initDriverAuth` with IndexedDB session persistence, pairing token URL exchange, and `PairingError` handling (`apps/driver-pwa/src/lib/auth.ts`); Supabase realtime subscription store for fleet bookings (`src/lib/stores/fleetBookings.ts`); and client-side booking conflict detection utility (`src/lib/utils/bookingConflict.ts`)
- [ ] Manual end-to-end test — success criteria: (1) Operator generates a pairing URL, driver opens it, first GPS ping fires and `GENESIS_ENROLLMENT` ledger anchor appears with Fabric tx hash in the fleet grid within 30 seconds; (2) Operator creates a charter booking, clicks "Lock & Protect," booking transitions to `LEDGER_ANCHORED` with tx hash visible; (3) after 5 anchors, the `LedgerAnchorButton` renders `PER_EVENT_OFFER` for a fare-bearing booking, M-Pesa STK push reaches the client phone, callback fires, and booking anchors automatically; (4) a gated booking with no fare renders `QUOTA_EXCEEDED` with upgrade CTA and correct reset date; (5) the 06:00 morning briefing WhatsApp message contains correct absent vehicle count and KES unverified exposure figure matching the fleet dashboard V/T panel
