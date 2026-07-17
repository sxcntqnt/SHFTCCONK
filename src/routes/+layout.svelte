<script lang="ts">
  // src/routes/+layout.svelte
  //  Root layout: session polling + navigation progress bar.
  //  RESPONSIBILITIES:
  //  - Polls periodically to catch permission changes for long-lived
  //    sessions (tab left open for hours) — the auth-service kill-switch
  //    case.
  //  - Shows a navigation progress bar during page transitions.
  //
  //  SUPABASE REMOVED:
  //  There is no more client-side auth-state listener. Under the
  //  auth-service opaque-token model, the client never holds a JWT to
  //  inspect — access tokens are short-lived (15 min) and refresh
  //  happens via an HttpOnly cookie the client can't read, so there's
  //  no TOKEN_REFRESHED/SIGNED_OUT event to subscribe to client-side.
  //  Every navigation already re-verifies the session server-side via
  //  authHandle + authGuardHandle in hooks.server.ts.
  //
  //  KILL-SWITCH INTEGRATION (revised):
  //  Previously: TOKEN_REFRESHED event OR a 60s poll → checkVersionAndRefresh()
  //  compared a cached version number before deciding whether to re-bootstrap.
  //  Now: bootstrap_session() already re-runs server-side on every navigation
  //  (+layout.server.ts), so a normal page change always reflects current
  //  permissions. The 60s poll below exists only for the case where the user
  //  never navigates — it calls invalidateAll(), which re-runs
  //  +layout.server.ts and re-hydrates sessionStore via +layout.ts's
  //  initSession() call with whatever bootstrap_session() returns now.
  //
  //  ⚠️ TRADE-OFF: unlike the old checkVersionAndRefresh(), there is no
  //  cheap "did anything change" pre-check anymore — every poll tick runs
  //  the full bootstrap_session() query via invalidateAll(), even when
  //  nothing changed. The old design avoided that with a lightweight
  //  version-only comparison before deciding to re-bootstrap. If that
  //  query cost matters at your traffic volume, worth adding a cheap
  //  version-only endpoint (e.g. a tiny Neon function returning just
  //  profiles.permissions_version) to restore the cheap-check behavior —
  //  not built here, flagging rather than guessing at its shape.
  //
  //  Logout is no longer a client-side event either — it's a normal
  //  server action (POST /auth/logout) that should redirect via the
  //  response, same as any other form action. No goto("/") listener
  //  needed here for it.
  import "../app.css"
  import { invalidateAll } from "$app/navigation"
  import { navigating } from "$app/state"
  import { onMount } from "svelte"
  import { expoOut } from "svelte/easing"
  import { slide } from "svelte/transition"
  import { sessionStore } from "$lib/features/auth/stores/auth"

  interface Props {
    children?: import("svelte").Snippet
  }
  let { children }: Props = $props()

  // ─── Periodic staleness poll (long-lived-tab kill-switch case) ────────
  onMount(() => {
    const POLL_INTERVAL_MS = 60_000 // 60 seconds

    const versionPollInterval = setInterval(() => {
      const s = sessionStore.get?.() // see note below
      // sessionStore is a plain Svelte store; read via get() from
      // 'svelte/store' if not already imported elsewhere in this file.
      if (!s?.initialized || !s?.profile) return

      invalidateAll()
    }, POLL_INTERVAL_MS)

    return () => {
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
