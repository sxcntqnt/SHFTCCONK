---
title: "Python SDK"
description: "Official Matatu Pulse Python SDK for server-side integrations, data pipelines, and research."
section: "SDKs & Tools"
badge: "beta"
---

## Installation

```bash
pip install matatupulse
```

## Initialisation

```python
from matatupulse import MatatuPulse

client = MatatuPulse(api_key="mp_live_YOUR_KEY")
```

## Examples

### List all routes

```python
routes = client.routes.list()
for route in routes:
    print(route.id, route.name)
```

### Live vehicles

```python
vehicles = client.routes.vehicles("46")
for v in vehicles:
    print(v.id, v.lat, v.lng, v.occupancy)
```

### Historical trips to DataFrame

```python
import pandas as pd

records = client.historical.trips(
    route_id="46",
    from_date="2026-06-01",
    to_date="2026-06-07",
    interval="1h"
)

df = pd.DataFrame([r.dict() for r in records])
print(df.head())
```

The Python SDK is currently in beta. Breaking changes may occur before v1.0.
