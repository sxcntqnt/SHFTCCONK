---
title: "Glossary"
description: "Definitions for terms used throughout the Matatu Pulse API documentation."
section: "Reference"
---

## Matatu

A privately-owned minibus operating on fixed or semi-fixed routes in Kenya. Matatus are the primary mode of public transport in Nairobi, operating under route licenses issued by saccos.

## Sacco

Savings and Credit Co-operative. In the matatu context, a sacco is the licensed operator that manages a fleet of vehicles on one or more routes. Examples: Supermetro, Forward Travellers, Metro Trans.

## Stage / Stop

A designated boarding or alighting point along a route. Referred to as a "stage" in Kenyan usage.

## Route ID

A numeric or alphanumeric identifier for a licensed matatu route. Route 46 runs CBD → Kangemi. Route 111 runs CBD → Rongai. IDs are consistent with sacco licensing designations.

## Telemetry

GPS position and motion data transmitted from vehicles to the Matatu Pulse platform. Includes latitude, longitude, heading, and speed.

## Occupancy

Load level of a vehicle at the time of the last telemetry ping. Values: `low` (fewer than half full), `medium` (half to three-quarters full), `high` (near or at capacity).

## ETA

Estimated Time of Arrival. The Matatu Pulse ETA is congestion-adjusted, derived from current vehicle position and historical journey time patterns for that segment, time of day, and day of week.

## Congestion Index

A normalised measure of road congestion on a segment, from `0.0` (free flow) to `1.0` (gridlock). Derived from vehicle speed distributions on that segment compared to historical baselines.

## WebSocket

A persistent, full-duplex connection between client and server used for the real-time position stream. Unlike REST requests, a WebSocket connection stays open and receives updates as they occur.

## Webhook

An HTTP callback — your server receives a POST request from Matatu Pulse when a subscribed event occurs, without needing to poll or maintain a connection.
