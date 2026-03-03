<!-- src/routes/+layout.svelte -->
<!--
  Root layout: auth state listener + navigation progress bar.

  The auth listener was previously in /account/+layout.svelte.
  Moved here so auth state changes (login, logout, token refresh)
  trigger re-bootstrap globally, not just inside /account.
-->
<script lang="ts">
  import "../app.css"
  import { invalidate, goto } from "$app/navigation"
  import { navigating } from "$app/state"
  import { page } from "$app/stores"
  import { onMount } from "svelte"
  import { expoOut } from "svelte/easing"
  import { slide } from "svelte/transition"
  import {
    sessionStore,
    clearSession,
    activeActor,
  } from "$lib/stores/auth.store"

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
  // token refresh, MFA step-up). This replaces the old listener
  // that was buried inside /account/+layout.svelte.
  onMount(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Session expiry changed → invalidate to re-run load functions
        if (newSession?.expires_at !== session?.expires_at) {
          invalidate("supabase:auth")
        }

        // Signed out → clear store, redirect to home
        if (event === "SIGNED_OUT") {
          clearSession()
          goto("/")
        }
      },
    )
    return () => subscription.subscription.unsubscribe()
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
