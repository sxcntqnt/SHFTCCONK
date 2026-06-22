---
title: "Data Export"
description: "Bulk export historical trip and congestion data as CSV or Parquet for offline analysis."
section: "Historical Data"
---

## Endpoint

```bash
POST /historical/export
```

## Request

```javascripton
{
  "dataset": "trips",
  "from": "2026-01-01",
  "to": "2026-03-31",
  "format": "csv",
  "route_ids": ["46", "58", "111"]
}
```

`dataset` accepts `trips`, `congestion`, or `vehicles`.
`format` accepts `csv` or `parquet`.

## Response

```javascripton
{
  "export_id": "exp_abc123",
  "status": "queued",
  "estimated_ready_seconds": 120,
  "download_url": null
}
```

Poll `GET /historical/export/{export_id}` until `status` is `ready`, then download from `download_url`. Links expire after 24 hours.

## Size limits

| Tier | Max rows per export |
|---|---|
| Free | 10,000 |
| Starter | 500,000 |
| Growth | 5,000,000 |
| Enterprise | Unlimited |
