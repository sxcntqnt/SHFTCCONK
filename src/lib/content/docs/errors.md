---
title: "Error Codes"
description: "HTTP status codes and API error identifiers returned by the Matatu Pulse API, with resolution guidance."
section: "Reference"
---

## Error envelope

All errors return a consistent JSON envelope:

```javascripton
{
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "No route found with id '999'",
    "status": 404
  }
}
```

## HTTP status codes

| Status | Meaning |
|---|---|
| `200` | Success |
| `400` | Bad request — malformed parameters |
| `401` | Unauthorised — missing or invalid API key |
| `403` | Forbidden — valid key but insufficient permissions or key expired |
| `404` | Not found — resource does not exist |
| `422` | Unprocessable — valid structure but failed validation |
| `429` | Rate limit exceeded — see [Rate Limits](/docs/rate-limits) |
| `500` | Internal server error — retry with backoff |
| `503` | Service temporarily unavailable |

## API error codes

| Code | Status | Description |
|---|---|---|
| `INVALID_API_KEY` | 401 | Key format is invalid |
| `EXPIRED_API_KEY` | 403 | Key has been revoked or expired |
| `ROUTE_NOT_FOUND` | 404 | Route ID does not exist |
| `VEHICLE_NOT_FOUND` | 404 | Vehicle ID does not exist or is offline |
| `STOP_NOT_FOUND` | 404 | Stop ID does not exist |
| `INVALID_DATE_RANGE` | 422 | `from` is after `to`, or range exceeds maximum |
| `EXPORT_TOO_LARGE` | 422 | Export exceeds tier row limit |
| `RATE_LIMIT_EXCEEDED` | 429 | Request quota exhausted |
