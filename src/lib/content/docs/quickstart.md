---
title: "Quickstart Guide"
description: "Make your first Matatu Pulse API request in under five minutes."
section: "Getting Started"
---

## Before you start

You will need an API key. Obtain one from your [developer dashboard](/login). Keys are prefixed `mp_live_` for production and `mp_test_` for sandbox.

## Step 1 — Authenticate

Pass your key as a Bearer token in the `Authorization` header on every request.

```bash
curl -X GET "https://api.matatupulse.co.ke/v1/routes" \
  -H "Authorization: Bearer mp_live_YOUR_KEY" \
  -H "Accept: application/json"
```

## Step 2 — List routes

```bash
curl "https://api.matatupulse.co.ke/v1/routes" \
  -H "Authorization: Bearer mp_live_YOUR_KEY"
```

Returns an array of route objects with `id`, `name`, `origin`, `destination`, and `sacco`.

## Step 3 — Get live vehicles on a route

```bash
curl "https://api.matatupulse.co.ke/v1/routes/46/vehicles" \
  -H "Authorization: Bearer mp_live_YOUR_KEY"
```

## Step 4 — Stream real-time positions

```javascript
const ws = new WebSocket(
  'wss://stream.matatupulse.co.ke/v1/stream/routes/46',
  { headers: { Authorization: 'Bearer mp_live_YOUR_KEY' } }
);

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log(update.vehicle_id, update.lat, update.lng);
};
```

See [WebSocket Feed](/docs/websocket) for full event schema.
