// src/routes/(auth)/api/ingest/stream/+server.ts
//
// Server-Sent Events endpoint — streams live GPS positions to the client.
// Reads from the Redis GPS stream for the org and pushes each event
// as an SSE message.
//
// USAGE (client):
//   const source = new EventSource(`/api/ingest/stream?orgId=${orgId}`)
//   source.onmessage = (e) => updateVehicle(JSON.parse(e.data))
//
// REDIS STREAM KEY: gps:realtime:{orgId}
// Fields per entry: vid, la (lat), lo (lng), sp (speed), hd (heading), ts (timestamp)

import { error } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { getStreamClient } from "$lib/server/redis"

// How long to hold each SSE connection open (ms).
// Clients reconnect automatically after this.
const MAX_CONNECTION_MS = 30_000

// How often to poll the Redis stream for new entries (ms)
const POLL_INTERVAL_MS = 500

// How many entries to read per Redis XREAD call
const READ_COUNT = 100

export const GET: RequestHandler = async ({ url, locals }) => {
  const { session } = await locals.safeGetSession()
  if (!session) error(401, "Unauthorised")

  const orgId = url.searchParams.get("orgId")
  if (!orgId) error(400, "orgId is required")

  const streamKey = `gps:realtime:${orgId}`

  // Start reading from the latest entry only ($ = now)
  let lastId = "$"

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const deadline = Date.now() + MAX_CONNECTION_MS

      const send = (data: unknown) => {
        const payload = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(payload))
      }

      // Send a comment as keepalive so proxies don't close the connection
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"))
        } catch {
          clearInterval(keepalive)
        }
      }, 15_000)

      try {
        while (Date.now() < deadline) {
          const redis = getStreamClient()

          // XREAD blocks for POLL_INTERVAL_MS waiting for new entries
          const results = (await redis.xread(
            "COUNT",
            READ_COUNT,
            "BLOCK",
            POLL_INTERVAL_MS,
            "STREAMS",
            streamKey,
            lastId,
          )) as [string, [string, string[]][]][] | null

          if (!results) continue // timeout, no new data

          for (const [, entries] of results) {
            for (const [id, fields] of entries) {
              lastId = id

              // Parse flat Redis field array into an object
              // Fields: vid, la, lo, sp, hd, ts, ac
              const update: Record<string, unknown> = { orgId }
              for (let i = 0; i < fields.length; i += 2) {
                const key = fields[i]
                const val = fields[i + 1]
                switch (key) {
                  case "vid":
                    update.vehicleId = val
                    break
                  case "la":
                    update.lat = parseFloat(val)
                    break
                  case "lo":
                    update.lng = parseFloat(val)
                    break
                  case "sp":
                    update.speed = parseFloat(val)
                    break
                  case "hd":
                    update.heading = parseFloat(val)
                    break
                  case "ac":
                    update.accuracy = parseFloat(val)
                    break
                  case "ts":
                    update.timestamp = val
                    break
                }
              }

              send(update)
            }
          }
        }
      } catch (err) {
        console.error("[gps/stream] Error reading Redis stream:", err)
      } finally {
        clearInterval(keepalive)
        controller.close()
      }
    },

    cancel() {
      // Client disconnected — the while loop will exit on next iteration
      console.info(`[gps/stream] Client disconnected for org ${orgId}`)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      // Allow EventSource through SvelteKit's CSRF protection
      "X-Accel-Buffering": "no",
    },
  })
}
