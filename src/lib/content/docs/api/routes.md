---
title: "Routes"
description: "List and retrieve metadata for all tracked matatu routes in the Matatu Pulse network."
section: "Core API"
---

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/routes` | List all tracked routes |
| GET | `/routes/{id}` | Single route with stops |

## List all routes

```bash
GET /routes
```

**Response**

```javascripton
{
  "routes": [
    {
      "id": "46",
      "name": "CBD → Kangemi",
      "origin": "Country Bus Stage",
      "destination": "Kangemi Terminus",
      "sacco": "Supermetro",
      "tracked_vehicles": 14,
      "active": true
    }
  ]
}
```

## Single route

```bash
GET /routes/{id}
```

Includes the full stop sequence in `stops[]` and the route GeoJSON geometry in `geometry`.
