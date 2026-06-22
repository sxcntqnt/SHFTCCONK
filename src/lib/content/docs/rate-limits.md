---
title: "Rate Limits"
description: "Request limits, tier thresholds, and how to handle 429 responses from the Matatu Pulse API."
section: "Getting Started"
---

## Tiers

| Tier | Requests / minute | Requests / day | WebSocket connections |
|---|---|---|---|
| Free | 60 | 5,000 | 2 |
| Starter | 300 | 50,000 | 10 |
| Growth | 1,000 | 250,000 | 50 |
| Enterprise | Custom | Custom | Custom |

## Rate limit headers

Every response includes headers showing your current consumption:

X-RateLimit-Limit: 300

X-RateLimit-Remaining: 247

X-RateLimit-Reset: 1740139200

`X-RateLimit-Reset` is a Unix timestamp indicating when the window resets.

## Handling 429

When you exceed your limit the API returns `429 Too Many Requests`. Implement exponential backoff:

```javascript
async function fetchWithRetry(url, options, retries = 3) {
  const res = await fetch(url, options);
  if (res.status === 429 && retries > 0) {
    const retryAfter = res.headers.get('Retry-After') ?? 5;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return fetchWithRetry(url, options, retries - 1);
  }
  return res;
}
```
