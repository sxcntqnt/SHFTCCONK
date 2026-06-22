---
title: "WebSocket Feed"
description: "Stream real-time GPS position updates for any tracked route or vehicle using the Matatu Pulse WebSocket API."
section: "Real-Time"
---

## Connection
```text
wss://stream.matatupulse.co.ke/v1/stream/routes/{route_id}
wss://stream.matatupulse.co.ke/v1/stream/vehicles/{vehicle_id}

Pass your API key as a query parameter on the initial handshake:
wss://stream.matatupulse.co.ke/v1/stream/routes/46?key=mp_live_YOUR_KEY
```
## Basic usage

```javascript
const ws = new WebSocket(
  'wss://stream.matatupulse.co.ke/v1/stream/routes/46?key=mp_live_YOUR_KEY'
);

ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
ws.onclose = (e) => console.log('Closed', e.code);
```

## Heartbeat

The server sends a `ping` frame every 30 seconds. Your client must respond with a `pong` to keep the connection alive. Most WebSocket libraries handle this automatically.

## Reconnection

On unexpected disconnection, implement exponential backoff before reconnecting. Start at 1 second, double each attempt, cap at 30 seconds.

See [Event Types](/docs/websocket/events) for the full message schema.
