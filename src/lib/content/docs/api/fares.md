---
title: "Fares"
description: "Current and peak-hour fare estimates by route across the Matatu Pulse network."
section: "Core API"
badge: "new"
---

## Endpoint

```bash
GET /fares
```

Returns current fare estimates for all tracked routes, including peak and off-peak breakdowns.

## Response

```javascripton
{
  "updated_at": "2026-06-22T06:00:00Z",
  "fares": [
    {
      "route_id": "46",
      "route_name": "CBD → Kangemi",
      "base_fare_kes": 80,
      "peak_fare_kes": 120,
      "peak_hours": ["06:30–09:00", "17:00–20:00"],
      "currency": "KES"
    }
  ]
}
```

## Single route fares

```bash
GET /fares?route_id=46
```

## Notes

Fares are community-reported and operator-confirmed. They reflect the most recently verified amounts and are updated when the community reports a change. The API does not guarantee fare accuracy at point of boarding.
