---
title: "Introduction"
description: "An overview of the Matatu Pulse API — what it covers, how it works, and when to use it."
section: "Getting Started"
---

## What is the Matatu Pulse API?

The Matatu Pulse API provides programmatic access to Nairobi's matatu network data. It is designed for developers building commuter tools, urban mobility research platforms, logistics applications, and city planning dashboards.

## What the API covers

- **Live vehicle telemetry** — GPS positions, heading, speed, and occupancy for tracked vehicles
- **Route metadata** — stage sequences, sacco operators, and route geometries
- **ETA predictions** — congestion-aware arrival estimates for each stage on a route
- **Fare data** — current and peak-hour fare estimates by route
- **Historical trips** — anonymised, aggregated trip records from January 2024 onwards

## Base URL

All REST endpoints are served from:

[Matatu Pulse API Base URL](https://api.matatupulse.co.ke/v1)

The WebSocket feed is available at:
wss://stream.matatupulse.co.ke/v1

## Who this is for

The API is open to individual developers, research institutions, and commercial organisations. A free tier is available for development and low-volume use. See [Rate Limits](/docs/rate-limits) for tier details.
