<script lang="ts">
  import { onMount } from "svelte"
  import { ROLES } from "$lib/features/auth/stores/roles"
  import type { Role } from "$lib/features/auth/stores/roles"

  import { fly, fade } from "svelte/transition"
  import { enhance } from "$app/forms"

  let { form } = $props<{ form?: { message?: string } }>()

  // ── State ────────────────────────────────────────────────
  let step = $state(1)
  let selectedRole = $state("")
  let selectedSacco: string | null = $state(null)
  let searchState = $state("")
  let loading = $state(false)

  const PRO_ROLES: Role[] = ["DRIVER", "CONDUCTOR", "STAGE_OPERATOR"]

  const saccos = [
    "sxcntqnt",
    "2NK Sacco",
    "Super Metro",
    "4NTE",
    "Mololine",
    "Shuttle Masters",
    "Other",
  ]

  // ── Derived client-only values ───────────────────────────
  let filteredSaccos: string[] = []

  onMount(() => {
    // Only calculate this on the client
    filteredSaccos = saccos.filter((s) =>
      s.toLowerCase().includes(searchState.toLowerCase()),
    )
  })

  $: filteredSaccos = saccos.filter((s) =>
    s.toLowerCase().includes(searchState.toLowerCase()),
  )

  // ── PRO role type guard ─────────────────────────────────
  function isProRole(
    role: Role,
  ): role is "DRIVER" | "CONDUCTOR" | "STAGE_OPERATOR" {
    return PRO_ROLES.includes(role)
  }

  $: isPro = isProRole(selectedRole as Role)

  $: totalSteps = isPro ? 4 : 3
  $: saccoStep = isPro ? 3 : 2
  $: finalStep = isPro ? 4 : 3

  // ── Role metadata ───────────────────────────────────────    // Role metadata for richer cards
  const ROLE_META: Record<string, { icon: string; desc: string }> = {
    PASSENGER: {
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
      desc: "Plan trips, track matatus, book seats",
    },
    DRIVER: {
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
      desc: "Manage routes, telemetry & earnings",
    },
    CONDUCTOR: {
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7z"/></svg>`,
      desc: "Handle fares, passengers & manifests",
    },
    OWNER: {
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>`,
      desc: "Fleet management, analytics & payroll",
    },
    STAGE_OPERATOR: {
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
      desc: "Control stage queues & dispatch",
    },
    ORGANIZATION: {
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>`,
      desc: "Corporate mobility & team travel",
    },
    PLANNER: {
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
      desc: "Route design, demand & scheduling",
    },
    REGULATOR: {
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      desc: "Compliance, licensing & oversight",
    },
    ADMIN: {
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
      desc: "Full platform access & configuration",
    },
  }
</script>

<div class="onboard-page">
  <div class="onboard-card">
    <!-- ── Step indicator ── -->
    <div class="step-track">
      {#each { length: totalSteps } as _, i}
        <div
          class="step-node {step > i + 1
            ? 'done'
            : step === i + 1
              ? 'active'
              : ''}"
        >
          {#if step > i + 1}
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          {:else}
            {i + 1}
          {/if}
        </div>
        {#if i < totalSteps - 1}
          <div class="step-line {step > i + 1 ? 'done' : ''}"></div>
        {/if}
      {/each}
    </div>

    <!-- ══════════════════════════════════════
         STEP 1 — Role selection
    ══════════════════════════════════════ -->
    {#if step === 1}
      <div in:fly={{ y: 16, duration: 280 }}>
        <div class="step-eyebrow">Step 1 of {totalSteps || 3}</div>
        <h1 class="step-title">Your <em>Role</em></h1>
        <p class="step-sub">How will you be using Matatu Pulse?</p>

        <div class="role-grid">
          {#each Object.values(ROLES) as role}
            {@const meta = ROLE_META[role]}
            {@const isPro = PRO_ROLES.includes(role)}
            <button
              type="button"
              class="role-btn {selectedRole === role ? 'selected' : ''}"
              onclick={() => (selectedRole = role)}
            >
              <div class="role-icon">
                {@html meta?.icon ?? ""}
              </div>
              <div>
                {#if isPro}<span class="pro-badge">Verified</span>{/if}
                <div class="role-name">{role.replace("_", " ")}</div>
                <div class="role-desc">{meta?.desc ?? ""}</div>
              </div>
            </button>
          {/each}
        </div>

        <button
          type="button"
          class="btn-primary"
          disabled={!selectedRole}
          onclick={() => step++}
        >
          Continue
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- ══════════════════════════════════════
         STEP 2 — Verification (PRO roles only)
    ══════════════════════════════════════ -->
    {:else if step === 2 && PRO_ROLES.includes(selectedRole)}
      <div in:fly={{ x: 24, duration: 280 }}>
        <div class="step-eyebrow">Step 2 of {totalSteps}</div>
        <h1 class="step-title">Verify <em>Credentials</em></h1>
        <p class="step-sub">
          {selectedRole.replace("_", " ")} accounts require verification before activation.
        </p>

        <div class="verify-block">
          <div class="verify-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <div class="verify-title">Identity Verification</div>
            <div class="verify-sub">
              We'll cross-reference your details with the NTSA operator
              registry. This keeps the platform safe for all users.
            </div>
          </div>
        </div>

        <div class="btn-row">
          <button type="button" class="btn-secondary" onclick={() => step--}
            >Back</button
          >
          <button
            type="button"
            class="btn-primary"
            style="flex:1;"
            onclick={() => step++}
          >
            Continue
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- ══════════════════════════════════════
         SACCO STEP
    ══════════════════════════════════════ -->
    {:else if step === saccoStep}
      <div in:fly={{ x: 24, duration: 280 }}>
        <div class="step-eyebrow">Step {saccoStep} of {totalSteps}</div>
        <h1 class="step-title">Your <em>SACCO</em></h1>
        <p class="step-sub">
          Linking to a SACCO unlocks route data and operator tools. Optional.
        </p>

        {#if selectedSacco}
          <div class="sacco-chip">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {selectedSacco}
            <button
              class="chip-clear"
              onclick={() => {
                selectedSacco = null
                searchState = ""
              }}
              aria-label="Remove SACCO"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        {:else}
          <input
            class="search-field"
            bind:value={searchState}
            placeholder="Search for your SACCO…"
          />
          {#if searchState}
            <div class="sacco-dropdown">
              {#each filteredSaccos as sacco}
                <button
                  type="button"
                  class="sacco-option"
                  onclick={() => {
                    selectedSacco = sacco
                    searchState = sacco
                  }}
                >
                  {sacco}
                </button>
              {/each}
              {#if filteredSaccos.length === 0}
                <div
                  style="padding:14px;font-size:0.78rem;color:var(--text-3);text-align:center;"
                >
                  No match — try "Other"
                </div>
              {/if}
            </div>
          {/if}
        {/if}

        <button type="button" class="btn-primary" onclick={() => step++}>
          Continue
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
        <button type="button" class="btn-ghost" onclick={() => step++}>
          I'll do this later
        </button>
      </div>

      <!-- ══════════════════════════════════════
         FINAL STEP — Submit
    ══════════════════════════════════════ -->
    {:else}
      <div in:fade={{ duration: 240 }}>
        <div class="step-eyebrow">Step {finalStep} of {totalSteps}</div>

        <div class="final-icon">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h1 class="step-title" style="text-align:center;">
          You're <em>set!</em>
        </h1>
        <p class="step-sub" style="text-align:center;margin-bottom:24px;">
          Your profile is ready. Let's get you into the dashboard.
        </p>

        {#if form?.message}
          <div class="error-banner">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <circle cx="12" cy="12" r="10" /><line
                x1="12"
                y1="8"
                x2="12"
                y2="12"
              />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {form.message}
          </div>
        {/if}

        <form
          method="POST"
          action="?/completeOnboarding"
          use:enhance={() => {
            loading = true
            return async ({ update }) => {
              await update()
              loading = false
            }
          }}
        >
          <input type="hidden" name="role" value={selectedRole} />
          <input type="hidden" name="sacco" value={selectedSacco ?? ""} />

          <button type="submit" class="btn-primary" disabled={loading}>
            {#if loading}
              <span class="btn-spinner"></span>
              Setting up your account…
            {:else}
              Enter Dashboard
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            {/if}
          </button>
        </form>

        <button type="button" class="btn-ghost" onclick={() => step--}>
          Go back
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  /* ── Page shell ── */
  .onboard-page {
    min-height: 100vh;
    background: var(--ink);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 20px;
    font-family: var(--font-body);
    position: relative;
    overflow: hidden;
  }

  /* Atmospheric gradients */
  .onboard-page::before {
    content: "";
    position: fixed;
    bottom: -120px;
    left: -120px;
    width: 500px;
    height: 500px;
    background: radial-gradient(
      circle,
      rgba(242, 101, 34, 0.07),
      transparent 65%
    );
    pointer-events: none;
  }
  .onboard-page::after {
    content: "";
    position: fixed;
    top: -80px;
    right: -80px;
    width: 400px;
    height: 400px;
    background: radial-gradient(
      circle,
      rgba(0, 176, 155, 0.06),
      transparent 65%
    );
    pointer-events: none;
  }

  /* ── Card ── */
  .onboard-card {
    width: 100%;
    max-width: 600px;
    background: #13131e;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 24px;
    padding: 36px 40px;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6);
    position: relative;
    overflow: hidden;
  }

  /* Top accent */
  .onboard-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 32px;
    right: 32px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(242, 101, 34, 0.6),
      transparent
    );
  }

  /* ── Step indicator ── */
  .step-track {
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: 32px;
  }
  .step-node {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    font-size: 0.68rem;
    font-weight: 800;
    flex-shrink: 0;
    transition:
      background 0.3s,
      border-color 0.3s,
      color 0.3s;
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: var(--text-3);
    background: rgba(255, 255, 255, 0.04);
  }
  .step-node.done {
    background: rgba(0, 176, 155, 0.15);
    border-color: rgba(0, 176, 155, 0.4);
    color: var(--teal);
  }
  .step-node.active {
    background: rgba(242, 101, 34, 0.15);
    border-color: rgba(242, 101, 34, 0.5);
    color: var(--orange);
    box-shadow: 0 0 0 3px rgba(242, 101, 34, 0.12);
  }
  .step-line {
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
    transition: background 0.3s;
  }
  .step-line.done {
    background: rgba(0, 176, 155, 0.35);
  }

  /* ── Step header ── */
  .step-eyebrow {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 8px;
  }
  .step-title {
    font-family: var(--font-display);
    font-size: clamp(1.4rem, 3vw, 1.9rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1.1;
    color: var(--text-1);
    margin-bottom: 8px;
  }
  .step-title em {
    font-style: normal;
    background: linear-gradient(90deg, #f26522, #ff8c4b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .step-sub {
    font-size: 0.875rem;
    color: var(--text-3);
    margin-bottom: 28px;
    line-height: 1.6;
  }

  /* ── Role grid ── */
  .role-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    max-height: 380px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--rim-2) transparent;
    padding-right: 4px;
    margin-bottom: 24px;
  }
  .role-grid::-webkit-scrollbar {
    width: 3px;
  }
  .role-grid::-webkit-scrollbar-thumb {
    background: var(--rim-2);
    border-radius: 2px;
  }

  .role-btn {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(255, 255, 255, 0.03);
    cursor: pointer;
    text-align: left;
    transition:
      border-color 0.2s,
      background 0.2s,
      transform 0.15s;
    font-family: var(--font-body);
  }
  .role-btn:hover {
    border-color: rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.06);
    transform: translateY(-1px);
  }
  .role-btn.selected {
    border-color: rgba(242, 101, 34, 0.45);
    background: rgba(242, 101, 34, 0.08);
  }

  .role-icon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-3);
    flex-shrink: 0;
    transition:
      background 0.2s,
      color 0.2s,
      border-color 0.2s;
  }
  .role-btn.selected .role-icon {
    background: rgba(242, 101, 34, 0.12);
    border-color: rgba(242, 101, 34, 0.3);
    color: var(--orange);
  }

  .role-name {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-1);
    text-transform: capitalize;
    margin-bottom: 3px;
    letter-spacing: -0.01em;
  }
  .role-desc {
    font-size: 0.68rem;
    color: var(--text-3);
    line-height: 1.4;
  }

  /* ── PRO badge ── */
  .pro-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--orange);
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
    padding: 2px 6px;
    border-radius: 100px;
    margin-bottom: 4px;
    display: block;
    width: fit-content;
  }

  /* ── Verification block ── */
  .verify-block {
    background: rgba(242, 101, 34, 0.06);
    border: 1px solid rgba(242, 101, 34, 0.15);
    border-radius: 14px;
    padding: 18px;
    margin-bottom: 28px;
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }
  .verify-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(242, 101, 34, 0.12);
    border: 1px solid rgba(242, 101, 34, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--orange);
    flex-shrink: 0;
  }
  .verify-title {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  .verify-sub {
    font-size: 0.78rem;
    color: var(--text-3);
    line-height: 1.5;
  }

  /* ── SACCO search ── */
  .search-field {
    width: 100%;
    padding: 11px 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 12px;
    font-family: var(--font-body);
    font-size: 0.875rem;
    color: var(--text-1);
    outline: none;
    margin-bottom: 10px;
    transition:
      border-color 0.2s,
      background 0.2s,
      box-shadow 0.2s;
  }
  .search-field::placeholder {
    color: var(--text-3);
  }
  .search-field:focus {
    border-color: rgba(242, 101, 34, 0.4);
    background: rgba(255, 255, 255, 0.06);
    box-shadow: 0 0 0 3px rgba(242, 101, 34, 0.1);
  }

  .sacco-dropdown {
    background: #0f0f18;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    max-height: 200px;
    overflow-y: auto;
    margin-bottom: 16px;
    scrollbar-width: thin;
  }
  .sacco-option {
    display: block;
    width: 100%;
    padding: 11px 14px;
    background: none;
    border: none;
    font-family: var(--font-body);
    font-size: 0.875rem;
    color: var(--text-2);
    text-align: left;
    cursor: pointer;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition:
      background 0.15s,
      color 0.15s;
  }
  .sacco-option:last-child {
    border-bottom: none;
  }
  .sacco-option:hover {
    background: rgba(242, 101, 34, 0.08);
    color: var(--text-1);
  }

  /* Selected sacco chip */
  .sacco-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.25);
    border-radius: 100px;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--teal);
    margin-bottom: 16px;
  }
  .chip-clear {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--teal);
    opacity: 0.7;
    display: flex;
    align-items: center;
    transition: opacity 0.15s;
    padding: 0;
  }
  .chip-clear:hover {
    opacity: 1;
  }

  /* ── Buttons ── */
  .btn-primary {
    width: 100%;
    padding: 13px;
    background: var(--orange);
    color: #fff;
    border: none;
    border-radius: 13px;
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 16px rgba(242, 101, 34, 0.28);
    transition:
      background 0.18s,
      box-shadow 0.18s,
      transform 0.15s;
  }
  .btn-primary:hover:not(:disabled) {
    background: #d95618;
    box-shadow: 0 8px 28px rgba(242, 101, 34, 0.4);
    transform: translateY(-1px);
  }
  .btn-primary:disabled {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-3);
    box-shadow: none;
    cursor: not-allowed;
    transform: none;
  }

  .btn-row {
    display: flex;
    gap: 10px;
    margin-top: 24px;
  }

  .btn-secondary {
    flex: 1;
    padding: 13px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 13px;
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-2);
    cursor: pointer;
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.18);
  }

  .btn-ghost {
    background: none;
    border: none;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--text-3);
    cursor: pointer;
    margin-top: 12px;
    display: block;
    width: 100%;
    text-align: center;
    transition: color 0.15s;
  }
  .btn-ghost:hover {
    color: var(--text-2);
  }

  /* Spinner inside button */
  .btn-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Final / success step ── */
  .final-icon {
    width: 60px;
    height: 60px;
    border-radius: 18px;
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--teal);
    margin: 0 auto 20px;
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.2);
    border-radius: 10px;
    font-size: 0.78rem;
    color: #f87171;
    margin-bottom: 20px;
  }

  /* ── Responsive ── */
  @media (max-width: 540px) {
    .onboard-card {
      padding: 28px 22px;
    }
    .role-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
