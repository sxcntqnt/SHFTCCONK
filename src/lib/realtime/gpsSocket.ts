// src/lib/features/vehicles/gpsSocket.ts
//
// WebSocket client for the Realtime Gateway.
// Connects to the GPS hot path and pushes position updates into gpsStore.
//
// ARCHITECTURE:
//   Device → MQTT → Consumer → Redis Stream → Realtime Gateway → THIS FILE → gpsStore
//
// PROTOCOL (matches Realtime Gateway spec in architecture doc):
//   CLIENT → SERVER  { type: 'auth',      token: '<jwt>' }
//   SERVER → CLIENT  { type: 'auth_ok',   orgId: string }
//   CLIENT → SERVER  { type: 'subscribe', all: true }
//                or  { type: 'subscribe', vehicleIds: string[] }
//   SERVER → CLIENT  { type: 'position',  vehicleId, lat, lng, speed, heading, ts, event }
//                or  { type: 'batch',     positions: [...up to 50] }
//
// RECONNECT:
//   Exponential backoff with jitter, max 30s.
//   On reconnect, re-authenticates and re-subscribes automatically.
//   Last known positions are NOT lost — gpsStore retains them.
//
// USAGE:
//   import { initGPSSocket, destroyGPSSocket } from '$lib/features/vehicles/gpsSocket'
//
//   onMount(() => {
//     initGPSSocket({ token: session.access_token, orgId })
//     return () => destroyGPSSocket()
//   })

import { gpsStore }   from "$lib/features/vehicles/gps.store"
import type { GPSData } from "$lib/features/vehicles/gps.store"

// ── Config ────────────────────────────────────────────────────────────────────

const WS_URL        = import.meta.env.VITE_REALTIME_WS_URL ?? "wss://api.matatupulse.co.ke/realtime/gps"
const MAX_RETRIES   = 10
const BASE_DELAY_MS = 1_000
const MAX_DELAY_MS  = 30_000

// ── Incoming message types (from gateway) ─────────────────────────────────────

interface AuthOkMessage {
  type:  "auth_ok"
  orgId: string
}

interface PositionMessage {
  type:      "position"
  vehicleId: string
  la:        number    // latitude (compact field names match architecture spec)
  lo:        number    // longitude
  sp?:       number    // speed km/h
  hd?:       number    // heading degrees
  ts:        number    // unix ms
  ev?:       string    // event type if critical
}

interface BatchMessage {
  type:      "batch"
  positions: Omit<PositionMessage, "type">[]
}

interface ErrorMessage {
  type:    "error"
  message: string
}

type GatewayMessage = AuthOkMessage | PositionMessage | BatchMessage | ErrorMessage

// ── State ─────────────────────────────────────────────────────────────────────

interface SocketOptions {
  /** Short-lived JWT from session — refreshed on reconnect via getToken() */
  token:        string
  /** Org to subscribe to — client only receives updates for their org */
  orgId:        string
  /** Subscribe to specific vehicles only. Omit for all vehicles in org. */
  vehicleIds?:  string[]
  /** Called when connection is established and auth succeeds */
  onConnected?: () => void
  /** Called when max retries are exhausted */
  onFailed?:    () => void
  /**
   * Called before each reconnect attempt to get a fresh token.
   * Important: JWTs are short-lived (15min). Without this, reconnects
   * after token expiry will get auth_error from the gateway.
   */
  getToken?:    () => Promise<string>
}

let _socket:     WebSocket    | null = null
let _options:    SocketOptions | null = null
let _retryCount  = 0
let _retryTimer: ReturnType<typeof setTimeout> | null = null
let _isDestroyed = false

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * Initialise the GPS WebSocket connection.
 * Safe to call multiple times — will not create duplicate connections.
 *
 * @example
 *   initGPSSocket({
 *     token:     session.access_token,
 *     orgId:     'org-abc123',
 *     getToken:  () => supabase.auth.getSession().then(s => s.data.session?.access_token ?? '')
 *   })
 */
export function initGPSSocket(options: SocketOptions): void {
  if (_socket) return   // already connected
  _isDestroyed = false
  _options     = options
  _connect()
}

/**
 * Gracefully close the socket and prevent any further reconnect attempts.
 * Call in onDestroy() of the layout or component that called initGPSSocket().
 */
export function destroyGPSSocket(): void {
  _isDestroyed = true
  _clearRetryTimer()
  if (_socket) {
    _socket.close(1000, "component unmounted")
    _socket = null
  }
  _retryCount = 0
}

/**
 * Subscribe to additional vehicle IDs on the existing connection.
 * No-op if not connected.
 */
export function subscribeToVehicles(vehicleIds: string[]): void {
  _send({ type: "subscribe", vehicleIds })
}

/**
 * Subscribe to all vehicles in the org.
 * No-op if not connected.
 */
export function subscribeToAll(): void {
  _send({ type: "subscribe", all: true })
}

// ── Connection lifecycle ──────────────────────────────────────────────────────

async function _connect(): Promise<void> {
  if (_isDestroyed || !_options) return

  // Refresh token before connecting if a getter is provided
  if (_options.getToken && _retryCount > 0) {
    try {
      _options.token = await _options.getToken()
    } catch {
      console.warn("[gps-socket] Could not refresh token, using existing")
    }
  }

  try {
    _socket = new WebSocket(WS_URL)
  } catch (err) {
    console.error("[gps-socket] Failed to create WebSocket:", err)
    _scheduleReconnect()
    return
  }

  _socket.onopen = _handleOpen
  _socket.onmessage = _handleMessage
  _socket.onclose = _handleClose
  _socket.onerror = _handleError
}

function _handleOpen(): void {
  if (!_options) return
  console.info("[gps-socket] Connected — authenticating")

  // Step 1: authenticate
  _send({ type: "auth", token: _options.token })
}

function _handleMessage(event: MessageEvent): void {
  let msg: GatewayMessage

  try {
    msg = JSON.parse(event.data as string) as GatewayMessage
  } catch {
    console.warn("[gps-socket] Failed to parse message:", event.data)
    return
  }

  switch (msg.type) {
    case "auth_ok":
      _handleAuthOk(msg)
      break

    case "position":
      _applyPosition(msg)
      break

    case "batch":
      for (const pos of msg.positions) {
        _applyPosition(pos as PositionMessage)
      }
      break

    case "error":
      console.error("[gps-socket] Gateway error:", msg.message)
      break

    default:
      console.warn("[gps-socket] Unknown message type:", (msg as { type: string }).type)
  }
}

function _handleClose(event: CloseEvent): void {
  _socket = null

  if (_isDestroyed) return   // intentional close — don't reconnect

  // Code 4001 = auth failed (custom code from gateway) — don't retry with same token
  if (event.code === 4001) {
    console.error("[gps-socket] Auth rejected by gateway — not retrying")
    _options?.onFailed?.()
    return
  }

  console.warn(`[gps-socket] Closed (code ${event.code}) — scheduling reconnect`)
  _scheduleReconnect()
}

function _handleError(event: Event): void {
  console.error("[gps-socket] WebSocket error:", event)
  // onclose fires immediately after onerror — reconnect is handled there
}

// ── Auth + subscribe ──────────────────────────────────────────────────────────

function _handleAuthOk(msg: AuthOkMessage): void {
  if (!_options) return

  _retryCount = 0   // reset on successful auth
  console.info(`[gps-socket] Authenticated for org ${msg.orgId}`)
  _options.onConnected?.()

  // Step 2: subscribe after auth succeeds
  if (_options.vehicleIds?.length) {
    _send({ type: "subscribe", vehicleIds: _options.vehicleIds })
  } else {
    _send({ type: "subscribe", all: true })
  }
}

// ── GPS store update ──────────────────────────────────────────────────────────

function _applyPosition(pos: Omit<PositionMessage, "type">): void {
  if (!pos.vehicleId || pos.la == null || pos.lo == null || !pos.ts) return

  const incoming: GPSData = {
    vehicleId:      pos.vehicleId,
    organizationId: _options?.orgId ?? "",
    lat:            pos.la,
    lng:            pos.lo,
    speed:          pos.sp  ?? undefined,
    heading:        pos.hd  ?? undefined,
    fixStatus:      "3D_FIX",   // gateway only forwards fixed positions
    timestamp:      new Date(pos.ts).toISOString(),
  }

  gpsStore.update((state) => {
    // Replace with new Map to trigger Svelte reactivity
    const locations = new Map(state.locations)
    locations.set(pos.vehicleId, incoming)
    return { ...state, locations, lastUpdated: new Date().toISOString() }
  })
}

// ── Reconnect ─────────────────────────────────────────────────────────────────

function _scheduleReconnect(): void {
  if (_isDestroyed) return

  if (_retryCount >= MAX_RETRIES) {
    console.error("[gps-socket] Max retries reached — giving up")
    _options?.onFailed?.()
    return
  }

  _retryCount++

  // Exponential backoff with ±20% jitter to avoid thundering herd
  const base  = Math.min(BASE_DELAY_MS * Math.pow(2, _retryCount - 1), MAX_DELAY_MS)
  const jitter = base * 0.2 * (Math.random() * 2 - 1)
  const delay  = Math.round(base + jitter)

  console.info(`[gps-socket] Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${_retryCount}/${MAX_RETRIES})`)

  _retryTimer = setTimeout(_connect, delay)
}

function _clearRetryTimer(): void {
  if (_retryTimer !== null) {
    clearTimeout(_retryTimer)
    _retryTimer = null
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _send(payload: object): void {
  if (_socket?.readyState === WebSocket.OPEN) {
    _socket.send(JSON.stringify(payload))
  }
}

/**
 * Current connection state — useful for a status indicator in the map UI.
 * Returns: 'connecting' | 'open' | 'closed'
 */
export function getSocketState(): "connecting" | "open" | "closed" {
  if (!_socket) return "closed"
  if (_socket.readyState === WebSocket.CONNECTING) return "connecting"
  if (_socket.readyState === WebSocket.OPEN)       return "open"
  return "closed"
}