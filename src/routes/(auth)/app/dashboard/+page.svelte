<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import { browser } from "$app/environment"
  import SearchBar from "$lib/components/SearchBar.svelte"
  import Favorites from "$lib/components/Favorites.svelte"
  import TipCrew from "$lib/components/TipCrew.svelte"
  import RateCrew from "$lib/components/RateCrew.svelte"
  import RememberMatatu from "$lib/components/RememberMatatu.svelte"
  import LearnMore from "$lib/components/LearnMore.svelte"
  import NextTripCard from "$lib/components/NextTripCard.svelte"
  import QuickPlanner from "$lib/components/QuickPlanner.svelte"
  import InsightsSnapshot from "$lib/components/InsightsSnapshot.svelte"
  import {
    filteredDrivers,
    filteredMatatus,
    filteredConductors,
    rememberedMatatus,
    isLoadingFavorites,
    loadFavoriteData,
  } from "$lib/features/dashboard/stores/DashboardStore"
  import {
    sessionStore,
    activeActor,
    can,
  } from "$lib/features/auth/stores/auth"
  import { onMount } from "svelte"

  let { data } = $props()

  onMount(() => {
    loadFavoriteData()
  })

  // Set adminSection context
  const adminSectionStore: Writable<string> = getContext("adminSection")
  $effect(() => {
    if (browser && adminSectionStore) adminSectionStore.set("dashboard")
  })

  // ─── Session-derived state for banners ───
  let session = $derived($sessionStore)
  let profile = $derived(session?.profile ?? null)
  let actors = $derived(
    session?.actors?.filter((a: any) => a.status === "active") ?? [],
  )
  let currentActor = $derived($activeActor)

  // Verification status: user has at least one active actor that isn't just passenger
  let isVerified = $derived(
    actors.some((a: any) => a.status === "active" && a.type !== "passenger"),
  )

  // Pending verification: user has a pending actor_request
  let hasPendingRequest = $derived(
    data.pendingRequests && data.pendingRequests.length > 0,
  )

  // Subscription status: check if user has an active Stripe subscription
  // This comes from layout data or page data
  let isPaying = $derived(data.hasActiveSubscription ?? false)

  // Permission helpers — can() is a plain function, not a store
  function checkCan(action: string): boolean {
    try {
      return can(action)
    } catch {
      return false
    }
  }

  let canViewInsights = $derived(checkCan("analytics.view"))
  let canManageCrew = $derived(
    checkCan("crew.manage") ||
      actors.some((a: any) =>
        ["driver", "conductor", "fleet_owner", "stage_operator"].includes(
          a.type,
        ),
      ),
  )

  // Banner dismiss states
  let showOnboardingBanner = $state(!!data.onboardingComplete)
  let showVerificationBanner = $state(true)
</script>

<svelte:head>
  <title>Home — Matatu Pulse</title>
</svelte:head>

<!-- ═══ Verification & Subscription Status Banner ═══ -->
{#if showVerificationBanner}
  <div class="status-banner-row">
    <!-- Verification badge -->
    <div
      class="status-badge {isVerified
        ? 'badge-verified'
        : hasPendingRequest
          ? 'badge-pending'
          : 'badge-unverified'}"
    >
      <div class="badge-icon">
        {#if isVerified}
          <!-- Green checkmark -->
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline
              points="22 4 12 14.01 9 11.01"
            />
          </svg>
        {:else if hasPendingRequest}
          <!-- Clock -->
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            ><circle cx="12" cy="12" r="10" /><polyline
              points="12 6 12 12 16 14"
            /></svg
          >
        {:else}
          <!-- Shield -->
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            ><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg
          >
        {/if}
      </div>
      <div class="badge-text">
        {#if isVerified}
          <span class="badge-title">Verified Actor</span>
          <span class="badge-sub"
            >Your identity is confirmed — {currentActor?.type?.replace(
              /_/g,
              " ",
            ) ?? "active"}</span
          >
        {:else if hasPendingRequest}
          <span class="badge-title">Verification Pending</span>
          <span class="badge-sub"
            >Your request is being reviewed by an org admin</span
          >
        {:else}
          <span class="badge-title">Not Verified</span>
          <span class="badge-sub"
            >Verify your identity to unlock full features</span
          >
        {/if}
      </div>
      {#if !isVerified && !hasPendingRequest}
        <a href="/app/settings" class="badge-action">Verify</a>
      {/if}
    </div>

    <!-- Subscription badge -->
    <div class="status-badge {isPaying ? 'badge-premium' : 'badge-free'}">
      <div class="badge-icon">
        {#if isPaying}
          <!-- Blue checkmark -->
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline
              points="22 4 12 14.01 9 11.01"
            />
          </svg>
        {:else}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            ><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line
              x1="1"
              y1="10"
              x2="23"
              y2="10"
            /></svg
          >
        {/if}
      </div>
      <div class="badge-text">
        {#if isPaying}
          <span class="badge-title">Premium</span>
          <span class="badge-sub">All features unlocked</span>
        {:else}
          <span class="badge-title">Free Plan</span>
          <span class="badge-sub">Upgrade for premium features</span>
        {/if}
      </div>
      {#if !isPaying}
        <a href="/account/billing" class="badge-action badge-action-blue"
          >Upgrade</a
        >
      {/if}
    </div>

    <button
      class="banner-dismiss-sm"
      onclick={() => (showVerificationBanner = false)}
      aria-label="Dismiss"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        ><line x1="18" y1="6" x2="6" y2="18" /><line
          x1="6"
          y1="6"
          x2="18"
          y2="18"
        /></svg
      >
    </button>
  </div>
{/if}

<!-- ═══ Post-onboarding banner ═══ -->
{#if showOnboardingBanner}
  <div class="onboarding-banner">
    <div class="banner-icon">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        ><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline
          points="22 4 12 14.01 9 11.01"
        /></svg
      >
    </div>
    <div class="banner-content">
      <div class="banner-title">Welcome to Matatu Pulse!</div>
      {#if data.requestedRole && data.requestedRole !== "PASSENGER"}
        <div class="banner-sub">
          Your <strong
            >{data.requestedRole.replace("_", " ").toLowerCase()}</strong
          > request is being reviewed. You can use the app as a passenger while you
          wait.
        </div>
      {:else}
        <div class="banner-sub">Your profile is set up and ready to go.</div>
      {/if}
    </div>
    <button
      class="banner-dismiss"
      onclick={() => (showOnboardingBanner = false)}
      aria-label="Dismiss"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        ><line x1="18" y1="6" x2="6" y2="18" /><line
          x1="6"
          y1="6"
          x2="18"
          y2="18"
        /></svg
      >
    </button>
  </div>
{/if}

<!-- ═══ Reason banner ═══ -->
{#if data.reason}
  <div class="reason-banner">
    {#if data.reason === "not_admin"}
      You don't have admin access. Contact your administrator for elevation.
    {:else if data.reason === "no_access"}
      You don't have access to that organization.
    {:else if data.reason === "no_org_access"}
      You're not a member of any organization yet.
    {:else}
      {data.reason.replace(/_/g, " ")}
    {/if}
  </div>
{/if}

<!-- ═══ Multi-dashboard selector ═══ -->
{#if data.destinations && data.destinations.length > 0}
  <div class="dash-page">
    <div class="dash-header">
      <div>
        <div class="header-eyebrow">
          <span class="live-dot"></span>
          Dashboard
        </div>
        <h1 class="dash-title">Where to, <em>today?</em></h1>
        <p class="dash-sub">
          You have access to multiple dashboards. Pick one or stay here.
        </p>
      </div>
    </div>

    <div class="dest-grid">
      {#each data.destinations as dest}
        <a href={dest.href} class="dest-card">
          <span class="dest-icon">{dest.icon}</span>
          <div>
            <div class="dest-label">{dest.label}</div>
            <div class="dest-desc">{dest.description}</div>
          </div>
          <svg
            class="dest-arrow"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg
          >
        </a>
      {/each}
    </div>

    <div class="section-divider"></div>
    <p class="stay-hint">Or scroll down for your passenger dashboard.</p>
  </div>
{/if}

<!-- ═══ Passenger dashboard ═══ -->
<div class="dash-page">
  {#if !data.destinations || data.destinations.length === 0}
    <div class="dash-header">
      <div>
        <div class="header-eyebrow">
          <span class="live-dot"></span>
          Dashboard
        </div>
        <h1 class="dash-title">Good morning, <em>Nairobi</em></h1>
        <p class="dash-sub">
          Here's what's happening on your corridors right now.
        </p>
      </div>
      <div class="header-search">
        <SearchBar />
      </div>
    </div>
  {/if}

  <!-- Trip + planner -->
  <div class="top-grid">
    <NextTripCard />
    <QuickPlanner />
  </div>

  <!-- Insights (permission gated) -->
  {#if canViewInsights}
    <div class="insights-row">
      <InsightsSnapshot />
    </div>
  {/if}

  <div class="section-divider"></div>

  <!-- Favourites -->
  <div class="section-head">
    <div>
      <div class="section-title">Favourites</div>
      <div class="section-sub">Your saved drivers, matatus and conductors</div>
    </div>
  </div>

  {#if $isLoadingFavorites}
    <div class="loading-state">
      <span class="spinner"></span>
      Loading favourites…
    </div>
  {:else}
    <Favorites
      filteredDrivers={$filteredDrivers}
      filteredMatatus={$filteredMatatus}
      filteredConductors={$filteredConductors}
    />
  {/if}

  <div class="section-divider"></div>

  <!-- Crew section (gated: only show if user has relevant actor or permission) -->
  {#if canManageCrew}
    <div class="section-head">
      <div>
        <div class="section-title">Support the Crew</div>
        <div class="section-sub">
          Tip or rate the driver and conductor from your last trip
        </div>
      </div>
    </div>
    <div class="crew-grid">
      <TipCrew
        driverName="Selected Driver"
        conductorName="Selected Conductor"
        onTip={(d, c) =>
          console.log(`Tip: Driver ${d} KES • Conductor ${c} KES`)}
      />
      <RateCrew
        onRate={(stars, text) => console.log(`Rated ${stars} stars: ${text}`)}
      />
    </div>
    <div class="section-divider"></div>
  {:else}
    <!-- Show for all users but with a simpler view -->
    <div class="section-head">
      <div>
        <div class="section-title">Support the Crew</div>
        <div class="section-sub">
          Tip or rate the driver and conductor from your last trip
        </div>
      </div>
    </div>
    <div class="crew-grid">
      <TipCrew
        driverName="Selected Driver"
        conductorName="Selected Conductor"
        onTip={(d, c) =>
          console.log(`Tip: Driver ${d} KES • Conductor ${c} KES`)}
      />
      <RateCrew
        onRate={(stars, text) => console.log(`Rated ${stars} stars: ${text}`)}
      />
    </div>
    <div class="section-divider"></div>
  {/if}

  <!-- Remembered Matatus -->
  <div class="section-head">
    <div>
      <div class="section-title">Remembered Matatus</div>
      <div class="section-sub">
        Vehicles you've flagged for tracking or reference
      </div>
    </div>
  </div>
  <RememberMatatu remembered={$rememberedMatatus} />

  <div class="section-divider"></div>

  <LearnMore />
</div>

<style>
  /* ── Page shell ── */
  .dash-page {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-height: 100%;
  }

  /* ════════════════════════════════════════════
     STATUS BANNER ROW — Verification + Subscription
     ════════════════════════════════════════════ */
  .status-banner-row {
    display: flex;
    align-items: stretch;
    gap: 12px;
    margin-bottom: 20px;
    position: relative;
  }

  .status-badge {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 14px;
    flex: 1;
    min-width: 0;
    border: 1px solid;
    transition: border-color 0.2s ease;
  }

  /* Verified (green) */
  .badge-verified {
    background: rgba(52, 211, 153, 0.06);
    border-color: rgba(52, 211, 153, 0.18);
  }
  .badge-verified .badge-icon {
    color: #34d399;
  }
  .badge-verified .badge-title {
    color: #6ee7a0;
  }

  /* Pending (amber) */
  .badge-pending {
    background: rgba(251, 191, 36, 0.06);
    border-color: rgba(251, 191, 36, 0.18);
  }
  .badge-pending .badge-icon {
    color: #fbbf24;
  }
  .badge-pending .badge-title {
    color: #fcd34d;
  }

  /* Unverified (muted) */
  .badge-unverified {
    background: rgba(255, 255, 255, 0.02);
    border-color: rgba(255, 255, 255, 0.06);
  }
  .badge-unverified .badge-icon {
    color: var(--text-3);
  }
  .badge-unverified .badge-title {
    color: var(--text-2);
  }

  /* Premium (blue) */
  .badge-premium {
    background: rgba(96, 165, 250, 0.06);
    border-color: rgba(96, 165, 250, 0.18);
  }
  .badge-premium .badge-icon {
    color: #60a5fa;
  }
  .badge-premium .badge-title {
    color: #93bbfd;
  }

  /* Free plan */
  .badge-free {
    background: rgba(255, 255, 255, 0.02);
    border-color: rgba(255, 255, 255, 0.06);
  }
  .badge-free .badge-icon {
    color: var(--text-3);
  }
  .badge-free .badge-title {
    color: var(--text-2);
  }

  .badge-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    flex-shrink: 0;
  }
  .badge-verified .badge-icon {
    background: rgba(52, 211, 153, 0.1);
  }
  .badge-pending .badge-icon {
    background: rgba(251, 191, 36, 0.1);
  }
  .badge-premium .badge-icon {
    background: rgba(96, 165, 250, 0.1);
  }

  .badge-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    flex: 1;
  }
  .badge-title {
    font-size: 0.8rem;
    font-weight: 700;
    line-height: 1.2;
  }
  .badge-sub {
    font-size: 0.7rem;
    color: var(--text-3);
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .badge-action {
    flex-shrink: 0;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 5px 14px;
    border-radius: 8px;
    text-decoration: none;
    color: var(--text-1);
    background: rgba(242, 101, 34, 0.12);
    border: 1px solid rgba(242, 101, 34, 0.2);
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  .badge-action:hover {
    background: rgba(242, 101, 34, 0.2);
    border-color: rgba(242, 101, 34, 0.35);
  }
  .badge-action-blue {
    background: rgba(96, 165, 250, 0.12);
    border-color: rgba(96, 165, 250, 0.2);
  }
  .badge-action-blue:hover {
    background: rgba(96, 165, 250, 0.2);
    border-color: rgba(96, 165, 250, 0.35);
  }

  .banner-dismiss-sm {
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-3);
    opacity: 0.4;
    padding: 4px;
    transition: opacity 0.15s;
  }
  .banner-dismiss-sm:hover {
    opacity: 1;
  }

  /* ── Onboarding banner ── */
  .onboarding-banner {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 16px 20px;
    margin-bottom: 20px;
    background: rgba(0, 176, 155, 0.08);
    border: 1px solid rgba(0, 176, 155, 0.2);
    border-radius: 14px;
  }
  .banner-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(0, 176, 155, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--teal);
    flex-shrink: 0;
  }
  .banner-content {
    flex: 1;
  }
  .banner-title {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  .banner-sub {
    font-size: 0.78rem;
    color: var(--text-3);
    line-height: 1.5;
  }
  .banner-sub strong {
    color: var(--teal);
    text-transform: capitalize;
  }
  .banner-dismiss {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-3);
    opacity: 0.6;
    padding: 4px;
    transition: opacity 0.15s;
    flex-shrink: 0;
  }
  .banner-dismiss:hover {
    opacity: 1;
  }

  /* ── Reason banner ── */
  .reason-banner {
    padding: 12px 18px;
    margin-bottom: 20px;
    background: rgba(242, 101, 34, 0.08);
    border: 1px solid rgba(242, 101, 34, 0.2);
    border-radius: 12px;
    font-size: 0.82rem;
    color: var(--orange);
    text-transform: capitalize;
  }

  /* ── Destination selector ── */
  .dest-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }
  .dest-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(255, 255, 255, 0.03);
    text-decoration: none;
    transition:
      border-color 0.2s,
      background 0.2s,
      transform 0.15s;
  }
  .dest-card:hover {
    border-color: rgba(242, 101, 34, 0.35);
    background: rgba(242, 101, 34, 0.06);
    transform: translateY(-1px);
  }
  .dest-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }
  .dest-label {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 3px;
  }
  .dest-desc {
    font-size: 0.72rem;
    color: var(--text-3);
    line-height: 1.4;
  }
  .dest-arrow {
    margin-left: auto;
    color: var(--text-3);
    opacity: 0.4;
    flex-shrink: 0;
    transition:
      opacity 0.15s,
      color 0.15s;
  }
  .dest-card:hover .dest-arrow {
    opacity: 1;
    color: var(--orange);
  }
  .stay-hint {
    font-size: 0.75rem;
    color: var(--text-3);
    text-align: center;
    margin-bottom: 24px;
  }

  /* ── Page header ── */
  .dash-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 36px;
    flex-wrap: wrap;
  }
  .header-eyebrow {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--teal);
    animation: pulse-dot 2s ease-out infinite;
  }
  @keyframes pulse-dot {
    0% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0.5);
    }
    70% {
      box-shadow: 0 0 0 6px rgba(0, 176, 155, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0);
    }
  }
  .dash-title {
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 2.5vw, 2.2rem);
    font-weight: 800;
    letter-spacing: -0.05em;
    line-height: 1.1;
    color: var(--text-1);
  }
  .dash-title em {
    font-style: normal;
    background: linear-gradient(90deg, #f26522, #ff8c4b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .dash-sub {
    font-size: 0.875rem;
    color: var(--text-3);
    margin-top: 6px;
    line-height: 1.6;
  }
  .header-search {
    flex-shrink: 0;
  }

  /* ── Grids ── */
  .top-grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }
  .insights-row {
    margin-bottom: 32px;
  }
  .crew-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  /* ── Sections ── */
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .section-title {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .section-sub {
    font-size: 0.75rem;
    color: var(--text-3);
    margin-top: 2px;
  }
  .section-divider {
    height: 1px;
    background: var(--rim);
    margin: 32px 0;
  }

  /* ── Loading ── */
  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 120px;
    gap: 12px;
    color: var(--text-3);
    font-size: 0.82rem;
  }
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.08);
    border-top-color: var(--orange);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Responsive ── */
  @media (max-width: 860px) {
    .top-grid {
      grid-template-columns: 1fr;
    }
    .crew-grid {
      grid-template-columns: 1fr;
    }
    .dash-header {
      flex-direction: column;
      align-items: flex-start;
    }
    .dest-grid {
      grid-template-columns: 1fr;
    }
    .status-banner-row {
      flex-direction: column;
    }
  }
</style>
