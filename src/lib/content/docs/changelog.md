---
title: "Changelog"
description: "Release history and version notes for the Matatu Pulse API."
section: "Reference"
---

## v1.4.0 — February 2026

**Fares endpoint GA**

The `/fares` endpoint is now generally available after three months in beta. Returns current and peak-hour fare estimates by route, updated from community reports and operator confirmations.

---

## v1.3.2 — January 2026

**Occupancy field added to vehicle responses**

Vehicle objects now include an `occupancy` field (`low` / `medium` / `high`) derived from sacco-reported load data. Available on REST and WebSocket responses.

---

## v1.3.0 — November 2025

**WebSocket heartbeats**

Added 30-second ping/pong heartbeat to WebSocket connections to prevent silent disconnections on mobile data connections. Clients that do not respond to pings within 10 seconds will be disconnected with close code `1001`.

---

## v1.2.0 — September 2025

**Historical trip API**

Opened historical trip data endpoints covering all routes back to January 2024 in 15-minute aggregated intervals. See [Trip History](/docs/historical/trips).

---

## v1.1.0 — July 2025

**ETA confidence levels**

Added `confidence` field to ETA predictions (`high` / `medium` / `low`) based on vehicle proximity to the queried stop and current congestion variance.

---

## v1.0.0 — March 2025

**General availability**

Initial public release of the Matatu Pulse API covering routes, live vehicle positions, and stop arrivals for Nairobi's tracked matatu network.
