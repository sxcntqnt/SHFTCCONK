---
title: "JavaScript SDK"
description: "Official Matatu Pulse JavaScript and TypeScript SDK for Node.js and browser environments."
section: "SDKs & Tools"
---

## Installation

```bash
npm install @matatupulse/sdk
```

## Initialisation

```ts
import { MatatuPulse } from '@matatupulse/sdk';

const client = new MatatuPulse({ apiKey: process.env.MP_API_KEY });
```

## Examples

### List routes

```ts
const routes = await client.routes.list();
console.log(routes);
```

### Live vehicles on a route

```ts
const vehicles = await client.routes.vehicles('46');
```

### Subscribe to a real-time stream

```ts
const stream = client.stream.route('46');

stream.on('position_update', (event) => {
  console.log(event.data.vehicle_id, event.data.lat, event.data.lng);
});

stream.on('error', console.error);
stream.connect();

// Later:
stream.disconnect();
```

## TypeScript support

The SDK ships full TypeScript definitions. All response types are exported from `@matatupulse/sdk/types`.
