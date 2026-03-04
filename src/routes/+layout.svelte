<!-- src/routes/+layout.svelte -->
<!--
  Root layout: auth state listener + navigation progress bar.

  HARDENING CHANGES:
    - On TOKEN_REFRESHED: calls checkVersionAndRefresh() to detect
      permission changes that happened while the session was active
    - Periodic version polling (every 60s) for long-lived sessions
      so revoked users get kicked within ~1 minute instead of waiting
      for the next navigation
    - SIGNED_OUT handler clears the session store before redirect
-->
<script lang="ts">
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
    isVersionStale,
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

  // Keep local refs in sync with load data
  $effect(() => {
    ;({ supabase, session } = data)
  })

  // ─── Auth state listener ────────────────────────────────────
  // Triggers re-bootstrap when session changes (login, logout,
  // token refresh, MFA step-up).
  onMount(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // Session expiry changed → invalidate to re-run load functions
        if (newSession?.expires_at !== session?.expires_at) {
          invalidate("supabase:auth")
        }

        // Token refreshed → check if permission version has changed.
        // This catches the scenario where an admin revoked permissions
        // while the user's session was active. The new JWT from
        // refreshSession() will have an updated permissions_version,
        // and if it doesn't match the DB, my_permissions returns nothing.
        if (event === "TOKEN_REFRESHED") {
          const refreshed = await checkVersionAndRefresh(supabase)
          if (refreshed) {
            // Store was re-hydrated with new permissions.
            // Invalidate to re-run load functions with fresh data.
            invalidate("supabase:auth")
          }
        }

        // Signed out → clear store, redirect to home
        if (event === "SIGNED_OUT") {
          clearSession()
          goto("/")
        }
      },
    )

    // ─── Periodic version polling ─────────────────────────────
    // For long-lived sessions (user leaves tab open for hours),
    // check every 60s whether their permissions were revoked.
    // checkVersionAndRefresh() is cheap: one RPC call, and it
    // only triggers a full refresh if the version diverged.
    const versionPollInterval = setInterval(async () => {
      const s = $sessionStore
      if (!s.initialized || !s.profile) return

      const refreshed = await checkVersionAndRefresh(supabase)
      if (refreshed) {
        invalidate("supabase:auth")
      }
    }, 60_000) // 60 seconds

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
