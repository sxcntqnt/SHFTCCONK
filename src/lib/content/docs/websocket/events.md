---
title: "Event Types"
description: "Full schema reference for all events emitted by the Matatu Pulse WebSocket feed."
section: "Real-Time"
---

## Event envelope

Every message shares a common envelope:

```javascripton
{
  "event": "position_update",
  "timestamp": "2026-06-22T07:14:29Z",
  "data": { ... }
}
```

## `position_update`

Emitted every 5–15 seconds per vehicle as new GPS data arrives.

```javascripton
{
  "event": "position_update",
  "timestamp": "2026-06-22T07:14:29Z",
  "data": {
    "vehicle_id": "KBZ-441A",
    "route_id": "46",
    "lat": -1.2687,
    "lng": 36.8031,
    "heading": 274,
    "speed_kmh": 32,
    "occupancy": "medium"
  }
}
```

## `route_status`

Emitted when a route-level condition changes — congestion, diversion, or service suspension.

```javascripton
{
  "event": "route_status",
  "timestamp": "2026-06-22T08:02:00Z",
  "data": {
    "route_id": "46",
    "status": "delayed",
    "reason": "congestion",
    "affected_segment": "Westlands → Kangemi",
    "estimated_delay_minutes": 18
  }
}
```

## `vehicle_offline`

Emitted when a vehicle stops transmitting — engine off, out of coverage, or device failure.

```javascripton
{
  "event": "vehicle_offline",
  "timestamp": "2026-06-22T09:45:00Z",
  "data": {
    "vehicle_id": "KBZ-441A",
    "last_seen": "2026-06-22T09:44:52Z",
    "last_lat": -1.2814,
    "last_lng": 36.8190
  }
}
```
