<script lang="ts">
  // src/routes/+layout.svelte
  //  Root layout: auth state listener + navigation progress bar.
  //  RESPONSIBILITIES:
  // - Listens to Supabase auth state changes (login, logout, token refresh)
  //  - Triggers permission version checks on TOKEN_REFRESHED events
  //  - Polls for permission revocations every 60s (long-lived sessions)
  //  - Shows a navigation progress bar during page transitions
  //  KILL-SWITCH INTEGRATION:
  //  When an admin revokes permissions while a user is active:
  //  1. TOKEN_REFRESHED event → checkVersionAndRefresh() detects mismatch
  //  2. Periodic polling (60s) → catches it even without a token refresh
  //  3. Either path: re-bootstraps store → UI re-renders with new permissions
  //  ALIGNED WITH:
  //  - auth.ts: checkVersionAndRefresh(),
  // clearSession(), sessionStore
  //  - hooks.server.ts: supabase client from locals /
  import "../app.css"
  import { invalidate, goto } from "$app/navigation"
  import { navigating } from "$app/state"
  import { onMount } from "svelte"
  import { expoOut } from "svelte/easing"
  import { slide } from "svelte/transition"
  import {
    sessionStore,
    clearSession,
    checkVersionAndRefresh,
  } from "$lib/features/auth/stores/auth"

  interface Props {
    children?: import("svelte").Snippet
    data: {
      supabase: import("@supabase/supabase-js").SupabaseClient
      session: import("@supabase/supabase-js").Session | null
    }
  }
  let { children, data }: Props = $props()

  let { supabase, session } = $state(data)

  // Keep local refs in sync when load data changes (navigation, invalidation)
  $effect(() => {
    ;({ supabase, session } = data)
  })

  // ─── Auth state listener + version polling ──────────────────
  onMount(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // Session expiry changed → re-run load functions
        if (newSession?.expires_at !== session?.expires_at) {
          invalidate("supabase:auth")
        }

        // Token refreshed → check if permissions were revoked/changed.
        // checkVersionAndRefresh() compares store version vs DB version.
        // If they diverge, it forces a JWT refresh + store re-hydration.
        if (event === "TOKEN_REFRESHED") {
          const refreshed = await checkVersionAndRefresh(supabase)
          if (refreshed) {
            invalidate("supabase:auth")
          }
        }

        // Signed out → clear store, go home
        if (event === "SIGNED_OUT") {
          clearSession()
          goto("/")
        }
      },
    )

    // ─── Periodic version polling ─────────────────────────────
    // For long-lived sessions (user leaves tab open for hours).
    // checkVersionAndRefresh() is cheap:
    //   - One bootstrap_session() RPC call
    //   - Early exit if versions match (no JWT refresh, no store update)
    //   - Only triggers full refresh when permissions actually changed
    const POLL_INTERVAL_MS = 60_000 // 60 seconds

    const versionPollInterval = setInterval(async () => {
      const s = $sessionStore
      if (!s.initialized || !s.profile) return

      const refreshed = await checkVersionAndRefresh(supabase)
      if (refreshed) {
        invalidate("supabase:auth")
      }
    }, POLL_INTERVAL_MS)

    // Cleanup on unmount
    return () => {
      subscription.subscription.unsubscribe()
      clearInterval(versionPollInterval)
    }
  })
</script>

{#if navigating}
  <div
    class="nav-progress"
    in:slide={{ delay: 100, duration: 12000, axis: "x", easing: expoOut }}
  ></div>
{/if}

{@render children?.()}

<style>
  .nav-progress {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    z-index: 200;
    background: linear-gradient(
      90deg,
      var(--orange) 0%,
      rgba(242, 101, 34, 0.6) 60%,
      rgba(242, 101, 34, 0.1) 100%
    );
    box-shadow:
      0 0 12px rgba(242, 101, 34, 0.5),
      0 0 32px rgba(242, 101, 34, 0.2);
    transform-origin: left center;
  }
  .nav-progress::after {
    content: "";
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--orange);
    box-shadow: 0 0 8px 2px rgba(242, 101, 34, 0.8);
  }
</style>
