---
title: "Android SDK"
description: "Official Matatu Pulse Android SDK for integrating live matatu data into native Android applications."
section: "SDKs & Tools"
---

## Installation

Add to your `build.gradle`:

```groovy
dependencies {
    implementation 'ke.co.matatupulse:android-sdk:1.2.0'
}
```

## Initialisation

```kotlin
val client = MatatuPulse.Builder()
    .apiKey(BuildConfig.MP_API_KEY)
    .build()
```

## Live vehicles

```kotlin
client.routes.getVehicles("46") { result ->
    result.onSuccess { vehicles ->
        vehicles.forEach { Log.d("MP", "${it.id}: ${it.lat}, ${it.lng}") }
    }
    result.onFailure { error ->
        Log.e("MP", error.message ?: "Unknown error")
    }
}
```

## WebSocket stream

```kotlin
val stream = client.stream.forRoute("46")

stream.on(EventType.POSITION_UPDATE) { event ->
    val update = event.data as PositionUpdate
    updateMapMarker(update.vehicleId, update.lat, update.lng)
}

stream.connect()
```

Call `stream.disconnect()` in `onDestroy()` to avoid leaking connections.
