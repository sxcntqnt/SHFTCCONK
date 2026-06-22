---
title: "Vehicles"
description: "Retrieve live GPS positions, speed, heading, and occupancy for vehicles on any tracked route."
section: "Core API"
---

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/routes/{id}/vehicles` | All live vehicles on a route |
| GET | `/vehicles/{id}` | Single vehicle status |

## List vehicles on a route

```bash
GET /routes/{route_id}/vehicles
```

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `route_id` | string | Yes | Route identifier e.g. `46` |
| `occupancy` | string | No | Filter by `low`, `medium`, or `high` |

**Response**

```javascripton
{
  "route_id": "46",
  "route_name": "CBD → Kangemi",
  "updated_at": "2026-06-22T07:14:32Z",
  "vehicles": [
    {
      "id": "KBZ-441A",
      "lat": -1.2687,
      "lng": 36.8031,
      "heading": 274,
      "speed_kmh": 32,
      "sacco": "Supermetro",
      "occupancy": "medium",
      "timestamp": "2026-06-22T07:14:29Z"
    }
  ]
}
```

## Single vehicle

```bash
GET /vehicles/{vehicle_id}
```

Returns the same object shape as above for a single vehicle identified by its plate number.

