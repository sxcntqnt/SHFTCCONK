<script lang="ts">
  import { fly, fade } from "svelte/transition"
  import { enhance } from "$app/forms"
  import { z } from "zod"
  import { ROLES } from "$lib/features/auth/stores/roles"
  import type { Role } from "$lib/features/auth/stores/roles"
  import type { RoleMeta } from "$lib/features/onboarding/types"
  import { setOnboardingContext } from "$lib/features/onboarding/context"
  import RoleComponentFactory from "$lib/features/onboarding/components/RoleComponentFactory.svelte"

  let { form } = $props<{ form?: { message?: string } }>()

  // ── Zod schema — role must be one of the ROLES const values ──────────────
  const RoleSchema = z.enum(Object.values(ROLES) as [Role, ...Role[]], {
    errorMap: () => ({ message: "Please select a valid role." }),
  })

  // ── Roles shown in the onboarding UI ─────────────────────────────────────
  const SELECTABLE_ROLES: RoleMeta[] = [
    {
      id: ROLES.PASSENGER,
      label: "Passenger",
      group: "Traveller",
      description: "Book seats, track matatus, and pay fares digitally.",
      color: "var(--teal)",
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    },
    {
      id: ROLES.DRIVER,
      label: "Driver",
      group: "Crew",
      description: "Manage routes, telemetry and earnings.",
      color: "#a78bfa",
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
    },
    {
      id: ROLES.CONDUCTOR,
      label: "Conductor",
      group: "Crew",
      description: "Handle fares, passengers and manifests.",
      color: "#fb923c",
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7z"/></svg>`,
    },
    {
      id: ROLES.OWNER,
      label: "Vehicle Owner",
      group: "Asset Owner",
      description: "Fleet management, analytics and payroll.",
      color: "#facc15",
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>`,
    },
    {
      id: ROLES.ORGANIZATION,
      label: "SACCO / Operator",
      group: "Organisation",
      description: "Run a SACCO or transport organisation end-to-end.",
      color: "var(--orange)",
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>`,
    },
    {
      id: ROLES.FLEET_MANAGER,
      label: "Fleet Manager",
      group: "SACCO Staff",
      description: "Vehicles, assignments, compliance and settings.",
      color: "#34d399",
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="7" cy="12" r="2"/><circle cx="17" cy="12" r="2"/><path d="M7 8h10"/></svg>`,
    },
    {
      id: ROLES.MECHANIC,
      label: "Mechanic",
      group: "SACCO Staff",
      description: "Log and update vehicle maintenance records.",
      color: "#94a3b8",
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>`,
    },
    {
      id: ROLES.STAGE_OPERATOR,
      label: "Stage Operator",
      group: "Operations",
      description: "Control stage queues and dispatch.",
      color: "#38bdf8",
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    },
    {
      id: ROLES.PLANNER,
      label: "Route Planner",
      group: "Operations",
      description: "Route design, demand analysis and scheduling.",
      color: "#818cf8",
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    },
    {
      id: ROLES.REGULATOR,
      label: "Regulator",
      group: "Regulatory",
      description: "Compliance, licensing and oversight.",
      color: "#f472b6",
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    },
  ]

  // ── PRO roles — require NTSA / admin verification ─────────────────────────
  const PRO_ROLES = new Set<Role>([
    ROLES.DRIVER,
    ROLES.CONDUCTOR,
    ROLES.STAGE_OPERATOR,
  ])

  // ── State ─────────────────────────────────────────────────────────────────
  let step = $state(1)
  let selectedRole = $state<Role | null>(null)
  let validationErr = $state<string | null>(null)
  let loading = $state(false)

  // ── Derived ───────────────────────────────────────────────────────────────
  let isPro = $derived(selectedRole !== null && PRO_ROLES.has(selectedRole))
  let totalSteps = $derived(isPro ? 3 : 2)
  let finalStep = $derived(isPro ? 3 : 2)
  let selectedMeta = $derived(
    SELECTABLE_ROLES.find((r) => r.id === selectedRole) ?? null,
  )

  // Group by .group field for display
  let groupedRoles = $derived(() => {
    const map = new Map<string, RoleMeta[]>()
    for (const role of SELECTABLE_ROLES) {
      if (!map.has(role.group)) map.set(role.group, [])
      map.get(role.group)!.push(role)
    }
    return [...map.entries()]
  })

  // ── Client-side Zod validation ────────────────────────────────────────────
  function validateRole(): boolean {
    validationErr = null
    const result = RoleSchema.safeParse(selectedRole)
    if (!result.success) {
      validationErr = result.error.errors[0]?.message ?? "Invalid role."
      return false
    }
    return true
  }

  function advanceStep() {
    if (validateRole()) step++
  }

  function goBack() {
    step--
  }

  // Set up context for child components
  setOnboardingContext({
    step,
    selectedRole,
    validationErr,
    loading,
    isPro,
    totalSteps,
    finalStep,
    selectedMeta,
    groupedRoles: groupedRoles(),
    validateRole,
    advanceStep,
    goBack,
    submitForm: async () => {},
  })
</script>

<svelte:head>
  <title>Welcome — Matatu Pulse</title>
</svelte:head>

<div class="onboard-card">
  <div class="card-line" aria-hidden="true"></div>

  <!-- ── Step indicator ────────────────────────────────────────────────────── -->
  <div class="step-track" role="list" aria-label="Onboarding progress">
    {#each { length: totalSteps } as _, i}
      <div
        class="step-node {step > i + 1
          ? 'done'
          : step === i + 1
            ? 'active'
            : ''}"
        role="listitem"
        aria-current={step === i + 1 ? "step" : undefined}
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
        <div
          class="step-line {step > i + 1 ? 'done' : ''}"
          aria-hidden="true"
        ></div>
      {/if}
    {/each}
  </div>

  <!-- ═══ STEP 1 — Role selection ═══════════════════════════════════════════ -->
  {#if step === 1}
    <div in:fly={{ y: 16, duration: 260 }}>
      <div class="step-eyebrow">Step 1 of {totalSteps}</div>
      <h1 class="step-title">Your <em>Role</em></h1>
      <p class="step-sub">How will you be using Matatu Pulse?</p>

      <div class="role-groups" role="radiogroup" aria-label="Select your role">
        {#each groupedRoles() as [group, roles]}
          <div class="role-group">
            <div class="group-label">{group}</div>
            <div class="role-grid">
              {#each roles as role}
                <RoleComponentFactory {role} />
              {/each}
            </div>
          </div>
        {/each}
      </div>

      {#if validationErr}
        <div class="err-inline" role="alert">{validationErr}</div>
      {/if}

      <button
        type="button"
        class="btn-primary"
        disabled={!selectedRole}
        onclick={advanceStep}
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

    <!-- ═══ STEP 2 (PRO only) — Verification notice ═══════════════════════════ -->
  {:else if step === 2 && isPro}
    <div in:fly={{ x: 24, duration: 260 }}>
      <div class="step-eyebrow">Step 2 of {totalSteps}</div>
      <h1 class="step-title">Verify <em>Credentials</em></h1>
      <p class="step-sub">
        {selectedMeta?.label ?? selectedRole} accounts require verification before
        activation.
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
          <div class="verify-title">Identity Verification Required</div>
          <div class="verify-body">
            We cross-reference your details with the NTSA operator registry.
            You'll have full passenger access while your request is reviewed —
            typically within 24 hours.
          </div>
        </div>
      </div>

      <div class="btn-row">
        <button type="button" class="btn-secondary" onclick={goBack}
          >Back</button
        >
        <button
          type="button"
          class="btn-primary"
          style="flex:1"
          onclick={() => step++}
        >
          I understand, continue
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

    <!-- ═══ FINAL STEP — Summary + submit ═════════════════════════════════════ -->
  {:else}
    <div in:fade={{ duration: 220 }}>
      <div class="step-eyebrow">Step {finalStep} of {totalSteps}</div>

      <div class="final-icon">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>

      <h1 class="step-title" style="text-align:center">
        You're <em>all set!</em>
      </h1>
      <p class="step-sub" style="text-align:center;margin-bottom:20px">
        {#if selectedRole === ROLES.PASSENGER}
          Your profile is ready. Let's get you into the app.
        {:else}
          Your <strong style="color:var(--text-1)"
            >{selectedMeta?.label ?? selectedRole}</strong
          >
          request will be reviewed by an admin. You'll have passenger access while
          you wait.
        {/if}
      </p>

      <!-- Role summary chip -->
      {#if selectedMeta}
        <div class="summary-chip" style="--role-color:{selectedMeta.color}">
          <div class="summary-icon" style="color:{selectedMeta.color}">
            {@html selectedMeta.icon}
          </div>
          <div>
            <div class="summary-role">{selectedMeta.label}</div>
            <div class="summary-group">{selectedMeta.group}</div>
          </div>
        </div>
      {/if}

      {#if form?.message}
        <div class="error-banner" role="alert">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {form.message}
        </div>
      {/if}

      <!--
        `role` is validated by Zod client-side before this form can submit.
        The server runs the same check via VALID_ROLES in page.server.ts.
        No other hidden inputs — name/phone are collected by create_profile.
      -->
      <form
        method="POST"
        action="?/completeOnboarding"
        use:enhance={() => {
          // Final Zod guard — prevents submitting if somehow selectedRole
          // was tampered with between steps (e.g. via devtools)
          if (!validateRole()) return () => {}
          loading = true
          return async ({ update }) => {
            await update()
            loading = false
          }
        }}
      >
        <input type="hidden" name="role" value={selectedRole ?? ""} />

        <button
          type="submit"
          class="btn-primary"
          disabled={loading || !selectedRole}
        >
          {#if loading}
            <span class="btn-spinner" aria-hidden="true"></span>
            Setting up…
          {:else if selectedRole === ROLES.PASSENGER}
            Continue to Profile
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
          {:else}
            Submit &amp; Continue
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

      <button type="button" class="btn-ghost" onclick={goBack}>
        ← Go back and change role
      </button>
    </div>
  {/if}
</div>

<style>
  /* ── Card ── */
  .onboard-card {
    width: 100%;
    max-width: 620px;
    background: #13131e;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 24px;
    padding: 36px 40px;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6);
    position: relative;
    overflow: hidden;
  }
  .card-line {
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

  /* ── Step track ── */
  .step-track {
    display: flex;
    align-items: center;
    margin-bottom: 32px;
  }
  .step-node {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.68rem;
    font-weight: 800;
    flex-shrink: 0;
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: var(--text-3);
    background: rgba(255, 255, 255, 0.04);
    transition:
      background 0.3s,
      border-color 0.3s,
      color 0.3s;
  }
  .step-node.active {
    background: rgba(242, 101, 34, 0.15);
    border-color: rgba(242, 101, 34, 0.5);
    color: var(--orange);
    box-shadow: 0 0 0 3px rgba(242, 101, 34, 0.12);
  }
  .step-node.done {
    background: rgba(0, 176, 155, 0.15);
    border-color: rgba(0, 176, 155, 0.4);
    color: var(--teal);
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
    margin-bottom: 24px;
    line-height: 1.6;
  }

  /* ── Role groups ── */
  .role-groups {
    display: flex;
    flex-direction: column;
    gap: 18px;
    max-height: 420px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--rim-2) transparent;
    padding-right: 4px;
    margin-bottom: 20px;
  }
  .role-groups::-webkit-scrollbar {
    width: 3px;
  }
  .role-groups::-webkit-scrollbar-thumb {
    background: var(--rim-2);
    border-radius: 2px;
  }

  .role-group {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .group-label {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-3);
    padding-left: 2px;
  }

  .role-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  /* ── Role button ── */
  :global(.role-btn) {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    padding: 13px;
    border-radius: 13px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(255, 255, 255, 0.025);
    cursor: pointer;
    text-align: left;
    font-family: var(--font-body);
    position: relative;
    overflow: hidden;
    transition:
      border-color 0.18s,
      background 0.18s,
      transform 0.14s;
  }
  :global(.role-btn::before) {
    content: "";
    position: absolute;
    top: 0;
    left: 12px;
    right: 12px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.05),
      transparent
    );
  }
  :global(.role-btn:hover:not(.selected)) {
    border-color: rgba(255, 255, 255, 0.13);
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-1px);
  }
  :global(.role-btn.selected) {
    border-color: color-mix(in srgb, var(--role-color) 45%, transparent);
    background: color-mix(in srgb, var(--role-color) 8%, transparent);
    transform: translateY(-1px);
  }

  :global(.role-icon) {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: color-mix(in srgb, currentColor 10%, transparent);
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  :global(.role-info) {
    flex: 1;
    min-width: 0;
  }

  :global(.verified-badge) {
    display: inline-flex;
    font-size: 0.52rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--orange);
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
    padding: 1px 5px;
    border-radius: 100px;
    margin-bottom: 3px;
    width: fit-content;
  }

  :global(.role-name) {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 2px;
    letter-spacing: -0.01em;
  }
  :global(.role-desc) {
    font-size: 0.66rem;
    color: var(--text-3);
    line-height: 1.4;
  }

  :global(.role-check) {
    width: 17px;
    height: 17px;
    border-radius: 50%;
    border: 1.5px solid rgba(255, 255, 255, 0.14);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
    transition: all 0.14s;
  }
  :global(.role-check.checked) {
    background: var(--role-color);
    border-color: var(--role-color);
    color: #fff;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--role-color) 20%, transparent);
  }

  /* ── Validation error ── */
  .err-inline {
    font-size: 0.72rem;
    color: #f87171;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.2);
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 14px;
  }

  /* ── Verify block ── */
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
    border: 1px solid rgba(242, 101, 34, 0.22);
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
  .verify-body {
    font-size: 0.78rem;
    color: var(--text-3);
    line-height: 1.55;
  }

  /* ── Final step ── */
  .final-icon {
    width: 58px;
    height: 58px;
    border-radius: 18px;
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--teal);
    margin: 0 auto 20px;
  }

  .summary-chip {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 16px;
    background: color-mix(in srgb, var(--role-color) 7%, transparent);
    border: 1px solid color-mix(in srgb, var(--role-color) 25%, transparent);
    border-radius: 14px;
    margin-bottom: 24px;
  }
  .summary-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: color-mix(in srgb, currentColor 12%, transparent);
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .summary-role {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text-1);
  }
  .summary-group {
    font-size: 0.62rem;
    color: var(--text-3);
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
  }

  /* ── Error banner ── */
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
    margin-bottom: 18px;
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
      transform 0.14s;
    margin-top: 4px;
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
    font-size: 0.75rem;
    color: var(--text-3);
    cursor: pointer;
    margin-top: 12px;
    display: block;
    width: 100%;
    text-align: center;
    transition: color 0.15s;
    padding: 4px;
  }
  .btn-ghost:hover {
    color: var(--text-2);
  }

  .btn-spinner {
    width: 15px;
    height: 15px;
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

  /* ── Responsive ── */
  @media (max-width: 560px) {
    .onboard-card {
      padding: 28px 20px;
    }
    .role-grid {
      grid-template-columns: 1fr;
    }
    .role-groups {
      max-height: none;
    }
  }
</style>
