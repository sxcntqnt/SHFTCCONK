---
title: "Stops & Stages"
description: "Query matatu stages and boarding points — locations, routes served, and upcoming arrivals."
section: "Core API"
---

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/stops` | List all known stages |
| GET | `/stops/{id}` | Single stage metadata |
| GET | `/stops/{id}/arrivals` | Upcoming vehicle arrivals |

## Upcoming arrivals at a stage

```bash
GET /stops/{stop_id}/arrivals
```

Returns vehicles approaching the stage, sorted by estimated arrival time.

**Response**

```javascripton
{
  "stop_id": "CBD-01",
  "stop_name": "Archives Roundabout",
  "arrivals": [
    {
      "vehicle_id": "KBZ-441A",
      "route_id": "46",
      "route_name": "CBD → Kangemi",
      "eta_seconds": 240,
      "occupancy": "low",
      "sacco": "Supermetro"
    }
  ]
}
```

`eta_seconds` is the congestion-adjusted time until arrival. See [ETA Predictions](/docs/api/eta) for methodology.
