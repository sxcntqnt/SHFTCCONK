---
title: "Trip History"
description: "Access anonymised, aggregated historical trip data for all tracked Matatu Pulse routes from January 2024."
section: "Historical Data"
---

## Endpoint

```bash
GET /historical/trips
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `route_id` | string | No | Filter to a specific route |
| `from` | ISO 8601 date | Yes | Start of period |
| `to` | ISO 8601 date | Yes | End of period (max 90 days) |
| `interval` | string | No | `15min` (default), `1h`, or `1d` |

## Response

```javascripton
{
  "route_id": "46",
  "from": "2026-06-01",
  "to": "2026-06-07",
  "interval": "1h",
  "records": [
    {
      "period_start": "2026-06-01T06:00:00Z",
      "vehicle_count": 8,
      "avg_journey_minutes": 42,
      "p90_journey_minutes": 58,
      "avg_occupancy": "medium"
    }
  ]
}
```

`p90_journey_minutes` is the 90th-percentile journey time — useful for planning worst-case departure buffers.

## Data coverage

Historical data is available from **1 January 2024** for all routes active at that time. New routes enter the historical record 30 days after tracking begins.
