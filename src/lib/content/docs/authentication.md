---
title: "Authentication"
description: "How to authenticate with the Matatu Pulse API using API keys and Bearer tokens."
section: "Getting Started"
---

## API keys

All requests must include a valid API key as a Bearer token in the `Authorization` header.

Authorization: Bearer mp_live_YOUR_API_KEY

Keys are available from your [developer dashboard](/login). Two key types exist:

| Type | Prefix | Use |
|---|---|---|
| Live | `mp_live_` | Production requests against real data |
| Test | `mp_test_` | Development and sandbox — returns synthetic data |

## Key security

- Never expose API keys in client-side code or public repositories
- Rotate keys immediately if compromised — use the dashboard to invalidate and reissue
- Use environment variables in all server-side implementations

## Errors

A missing or invalid key returns `401 Unauthorized`. An expired key returns `403 Forbidden`. See [Error Codes](/docs/errors) for the full list.
