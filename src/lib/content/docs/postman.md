---
title: "Postman Collection"
description: "Download the official Matatu Pulse Postman collection to explore and test every API endpoint interactively."
section: "SDKs & Tools"
---

## Download

The Matatu Pulse Postman collection includes pre-built requests for every endpoint, example responses, and environment variables for API key management.

[Download Collection JSON](#) — import directly into Postman via **File → Import**.

## Setup

1. Import the collection
2. Create a new Postman environment
3. Add a variable named `MP_API_KEY` with your key as the value
4. All requests reference `{{MP_API_KEY}}` automatically

## Included requests

- All Core API endpoints (routes, vehicles, stops, ETA, fares)
- WebSocket connection examples via Postman's WS client
- Historical data queries with date range examples
- Webhook registration and signature verification examples

## Run in Postman

Use the **Collection Runner** to run the full test suite against your key and verify everything is working before building your integration.
