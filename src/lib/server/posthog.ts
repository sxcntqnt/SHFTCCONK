// src/lib/server/posthog.ts
// Server-side PostHog singleton using posthog-node
import { PostHog } from "posthog-node"
import { PUBLIC_POSTHOG_KEY, PUBLIC_POSTHOG_HOST } from "$env/static/public"

let posthogClient: PostHog | null = null

export function getPostHogClient(): PostHog {
  if (!posthogClient) {
    posthogClient = new PostHog(PUBLIC_POSTHOG_KEY, {
      host: PUBLIC_POSTHOG_HOST,
      // Flush immediately — SvelteKit server functions are short-lived
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return posthogClient
}

export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown()
  }
}
