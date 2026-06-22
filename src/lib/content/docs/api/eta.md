---
title: "ETA Predictions"
description: "Congestion-aware arrival time estimates for all stages on any tracked Matatu Pulse route."
section: "Core API"
---

## Endpoint

```bash
GET /routes/{route_id}/eta
```

Returns predicted arrival times for every stop on the route, based on current vehicle positions and historical congestion patterns.

## Response

```javascripton
{
  "route_id": "46",
  "generated_at": "2026-06-22T07:15:00Z",
  "stops": [
    {
      "stop_id": "CBD-01",
      "stop_name": "Archives Roundabout",
      "sequence": 1,
      "next_arrival_seconds": 240,
      "confidence": "high"
    },
    {
      "stop_id": "WL-03",
      "stop_name": "Westlands Roundabout",
      "sequence": 4,
      "next_arrival_seconds": 1020,
      "confidence": "medium"
    }
  ]
}
```

## Confidence levels

| Level | Meaning |
|---|---|
| `high` | Vehicle is within 2 stops; ETA accurate to ±2 minutes |
| `medium` | Vehicle is 2–5 stops away; ETA accurate to ±5 minutes |
| `low` | Vehicle is far or congestion is unusually high; treat as indicative |

## Parameters

| Name | Type | Description |
|---|---|---|
| `stop_id` | string | Filter to a single stop |
| `format` | string | `seconds` (default) or `iso8601` |
