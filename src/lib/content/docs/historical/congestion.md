---
title: "Congestion Data"
description: "Historical congestion levels by road segment, time of day, and day of week across the Nairobi network."
section: "Historical Data"
---

## Endpoint

```bash
GET /historical/congestion
```

## Parameters

| Name | Type | Description |
|---|---|---|
| `segment_id` | string | Road segment identifier |
| `from` | ISO 8601 date | Start of period |
| `to` | ISO 8601 date | End of period |
| `granularity` | string | `15min`, `1h`, or `day_of_week` |

## `day_of_week` granularity

Useful for commute planning — returns average congestion by hour for each day of the week.

```javascripton
{
  "segment_id": "thika-rd-allsops-pangani",
  "day_of_week": [
    {
      "day": "Monday",
      "hours": [
        { "hour": 7, "congestion_index": 0.82 },
        { "hour": 8, "congestion_index": 0.95 },
        { "hour": 9, "congestion_index": 0.71 }
      ]
    }
  ]
}
```

`congestion_index` runs from `0.0` (free flow) to `1.0` (gridlock).

## Segment discovery

List all available segments with `GET /historical/congestion/segments`.
