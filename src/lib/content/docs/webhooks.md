---
title: "Webhooks"
description: "Receive HTTP callbacks for route events, vehicle status changes, and ETA threshold alerts."
section: "Real-Time"
badge: "beta"
---

## Overview

Webhooks let you receive push notifications to your own server rather than maintaining a persistent WebSocket connection. They are better suited for server-side integrations and event-driven architectures.

## Registering a webhook

```bash
POST /webhooks
Content-Type: application/json

{
  "url": "https://yourapp.com/webhooks/matatu",
  "events": ["route_status", "vehicle_offline"],
  "route_ids": ["46", "58"]
}
```

## Verifying payloads

Every webhook request includes an `X-MP-Signature` header — an HMAC-SHA256 digest of the raw request body signed with your webhook secret.

```javascript
import crypto from 'crypto';

function verifyWebhook(body, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return `sha256=${expected}` === signature;
}
```

## Event schema

Webhook payloads use the same event envelope as the [WebSocket feed](/docs/websocket/events).

## Retry policy

Failed deliveries (non-2xx response or timeout after 10 seconds) are retried up to 5 times with exponential backoff over 24 hours.
