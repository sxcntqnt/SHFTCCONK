<script lang="ts">
  import { goto } from "$app/navigation"
  import type { PageData } from "./$types"

  let { data } = $props()

  // data.invite is resolved server-side in +page.server.ts
  // Shape: { valid: boolean, role: Role, organizationName: string,
  //          organizationId: string, email: string, invitedBy: string,
  //          expiresAt: string, error?: string }

  type Step = "confirm" | "set-password" | "done" | "invalid"
  let step = $state<Step>(data.invite?.valid ? "confirm" : "invalid")

  let password = $state("")
  let confirmPassword = $state("")
  let showPassword = $state(false)
  let loading = $state(false)
  let error = $state<string | null>(data.invite?.error ?? null)

  // Password strength
  const checks = $derived({
    length:    password.length >= 8,
    upper:     /[A-Z]/.test(password),
    lower:     /[a-z]/.test(password),
    digit:     /\d/.test(password),
    match:     password === confirmPassword && confirmPassword.length > 0,
  })
  const strength = $derived(Object.values(checks).filter(Boolean).length)

  async function redeemInvite() {
    error = null
    if (!checks.length || !checks.upper || !checks.lower || !checks.digit) {
      error = "Password does not meet the requirements below."; return
    }
    if (!checks.match) { error = "Passwords do not match."; return }
    loading = true

    try {
      // Accept the invite via Supabase (the server already verified the token
      // and stored invite metadata in a pending_invites table).
      // We call a Supabase RPC that: sets password, assigns role+org, deletes invite.
      const { data: rpcData, error: rpcErr } = await data.supabase.rpc("redeem_invite", {
        p_token:    data.token,
        p_password: password,
      })
      if (rpcErr) throw rpcErr

      // Sign in automatically with the email + new password
      const { error: signInErr } = await data.supabase.auth.signInWithPassword({
        email:    data.invite.email,
        password: password,
      })
      if (signInErr) throw signInErr

      // bootstrap_session resolves their role and routes them
      const { data: bootstrap } = await data.supabase.rpc("bootstrap_session")
      const payload = Array.isArray(bootstrap) ? bootstrap[0] : bootstrap
      step = "done"
      setTimeout(() => goto(payload?.route ?? "/account"), 1800)
    } catch (e: any) {
      error = e.message ?? "Could not redeem invitation. The link may have expired."
    } finally {
      loading = false
    }
  }

  const ROLE_LABELS: Record<string, string> = {
    OWNER:               "Fleet Owner",
    VEHICLE_OWNER:       "Vehicle Owner",
    ORGANIZATION:        "Organisation",
    ORG_CHAIR:           "Sacco Chair",
    OPERATIONS_MANAGER:  "Operations Manager",
    COMPLIANCE_OFFICER:  "Compliance Officer",
    ACCOUNTANT:          "Accountant",
    ROUTE_SUPERVISOR:    "Route Supervisor",
    STAGE_OPERATOR:      "Stage Operator",
    REGULATOR:           "Regulator",
    PLANNER:             "Planner",
    ADMIN:               "Administrator",
  }
  const roleLabel = $derived(ROLE_LABELS[data.invite?.role ?? ""] ?? data.invite?.role ?? "Unknown")

  // Format expires
  function timeLeft(iso: string): string {
    const ms = new Date(iso).getTime() - Date.now()
    if (ms <= 0) return "expired"
    const h = Math.floor(ms / 3_600_000)
    const m = Math.floor((ms % 3_600_000) / 60_000)
    if (h > 0) return `${h}h ${m}m remaining`
    return `${m} minutes remaining`
  }
</script>

<svelte:head>
  <title>Accept Invitation — Matatu Pulse</title>
</svelte:head>

<style>
  .redeem-wrap { width: 100%; }

  .page-header { margin-bottom: 24px; }
  .page-eyebrow {
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--orange); margin-bottom: 10px;
  }
  .page-title {
    font-family: var(--font-display); font-size: 1.6rem; font-weight: 800;
    letter-spacing: -0.04em; color: var(--text-1); line-height: 1.15; margin-bottom: 6px;
  }
  .page-sub { font-size: 0.875rem; color: var(--text-2); line-height: 1.6; }

  /* Identity card — shows pre-assigned role & org */
  .identity-card {
    background: var(--surface); border: 1px solid var(--rim-2);
    border-radius: 14px; padding: 18px 18px; margin-bottom: 24px;
    position: relative; overflow: hidden;
  }
  .identity-card::before {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0;
    width: 3px; background: var(--orange);
  }
  .identity-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .identity-row:last-child { margin-bottom: 0; }
  .identity-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-3); min-width: 70px; }
  .identity-value { font-size: 0.875rem; font-weight: 600; color: var(--text-1); }
  .role-pill {
    display: inline-block; padding: 3px 10px; border-radius: 100px;
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    background: rgba(242,101,34,0.12); border: 1px solid rgba(242,101,34,0.25); color: var(--orange);
  }
  .expires-pill {
    display: inline-block; padding: 2px 8px; border-radius: 100px;
    font-size: 0.65rem; font-weight: 600; background: var(--rim); color: var(--text-3); border: 1px solid var(--rim-2);
  }

  /* Lock notice */
  .lock-notice {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 14px; margin-bottom: 22px;
    background: rgba(255,255,255,0.02); border: 1px solid var(--rim);
    border-radius: 10px;
  }
  .lock-notice svg { color: var(--text-3); flex-shrink: 0; margin-top: 1px; }
  .lock-notice p { font-size: 0.78rem; color: var(--text-3); line-height: 1.55; }

  /* Form */
  .field { margin-bottom: 14px; }
  label {
    display: block; font-size: 0.78rem; font-weight: 600;
    color: var(--text-2); letter-spacing: 0.03em; margin-bottom: 6px;
  }
  .input-row { position: relative; }
  input[type="password"], input[type="text"] {
    width: 100%; padding: 11px 44px 11px 14px;
    background: var(--ink-2); border: 1px solid var(--rim-2); border-radius: 10px;
    font-size: 16px; color: var(--text-1); font-family: var(--font-body);
    outline: none; transition: border-color 0.2s, box-shadow 0.2s;
  }
  input:focus { border-color: rgba(242,101,34,0.5); box-shadow: 0 0 0 3px rgba(242,101,34,0.08); }
  .toggle-btn {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; color: var(--text-3); padding: 0;
    display: flex; align-items: center; transition: color 0.2s;
  }
  .toggle-btn:hover { color: var(--text-2); }

  /* Password strength */
  .strength-bar { display: flex; gap: 3px; margin-top: 8px; }
  .strength-seg {
    height: 3px; flex: 1; border-radius: 100px;
    background: var(--rim); transition: background 0.3s;
  }
  .strength-seg.active-1 { background: #f87171; }
  .strength-seg.active-2 { background: #fb923c; }
  .strength-seg.active-3 { background: #facc15; }
  .strength-seg.active-4 { background: #4ade80; }
  .strength-seg.active-5 { background: var(--teal); }

  .checks { display: flex; flex-direction: column; gap: 5px; margin-top: 10px; }
  .check { display: flex; align-items: center; gap: 7px; font-size: 0.75rem; color: var(--text-3); transition: color 0.2s; }
  .check.pass { color: var(--teal); }
  .check-dot { width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid var(--rim-2); flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: background 0.2s, border-color 0.2s; }
  .check.pass .check-dot { background: rgba(0,176,155,0.15); border-color: var(--teal); }

  /* Error */
  .error-box {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 14px; margin-bottom: 14px;
    background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.25);
    border-radius: 10px;
  }
  .error-box svg { color: #f87171; flex-shrink: 0; margin-top: 1px; }
  .error-box p { font-size: 0.82rem; color: #f87171; }

  /* Invalid state */
  .invalid-card {
    background: rgba(248,113,113,0.06); border: 1px solid rgba(248,113,113,0.2);
    border-radius: 16px; padding: 28px 24px; text-align: center;
  }
  .invalid-icon { width: 48px; height: 48px; border-radius: 13px; background: rgba(248,113,113,0.12); border: 1px solid rgba(248,113,113,0.25); display: flex; align-items: center; justify-content: center; color: #f87171; margin: 0 auto 16px; }
  .invalid-title { font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; color: var(--text-1); margin-bottom: 8px; }
  .invalid-desc { font-size: 0.875rem; color: var(--text-2); line-height: 1.65; margin-bottom: 20px; }

  /* Success */
  .success-card { text-align: center; padding: 16px 0; }
  .success-icon { width: 56px; height: 56px; border-radius: 50%; background: rgba(0,176,155,0.12); border: 1px solid rgba(0,176,155,0.3); display: flex; align-items: center; justify-content: center; color: var(--teal); margin: 0 auto 18px; }
  .success-title { font-family: var(--font-display); font-size: 1.2rem; font-weight: 800; color: var(--text-1); margin-bottom: 8px; letter-spacing: -0.03em; }
  .success-sub { font-size: 0.875rem; color: var(--text-2); line-height: 1.65; }

  /* Button */
  .btn-submit {
    width: 100%; margin-top: 16px; padding: 13px;
    background: var(--orange); color: #fff;
    font-family: var(--font-body); font-size: 0.9rem; font-weight: 700;
    border: none; border-radius: 12px; cursor: pointer;
    box-shadow: 0 4px 20px rgba(242,101,34,0.28);
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .btn-submit:hover:not(:disabled) { background: #d95618; transform: translateY(-1px); }
  .btn-submit:disabled { opacity: 0.55; cursor: not-allowed; }
  .btn-outline {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 20px; background: transparent; border: 1px solid var(--rim-2);
    border-radius: 10px; font-size: 0.875rem; font-weight: 600; color: var(--text-2);
    text-decoration: none; transition: border-color 0.2s, color 0.2s;
  }
  .btn-outline:hover { border-color: var(--rim); color: var(--text-1); }

  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
</style>

<div class="redeem-wrap">

  <!-- ── INVALID TOKEN ── -->
  {#if step === "invalid"}
    <div class="invalid-card">
      <div class="invalid-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <div class="invalid-title">Invitation Not Valid</div>
      <p class="invalid-desc">
        {error ?? "This invitation link has expired, already been used, or the code is incorrect."} Invitation links expire after 72 hours for security.
      </p>
      <a href="/login/invite" class="btn-outline" style="margin: 0 auto;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Try a different code
      </a>
    </div>

  <!-- ── CONFIRM IDENTITY ── -->
  {:else if step === "confirm"}
    <div class="page-header">
      <div class="page-eyebrow">Accept Invitation</div>
      <h1 class="page-title">Your Access<br/>Details</h1>
      <p class="page-sub">Review your pre-assigned role and organisation before setting your password.</p>
    </div>

    <!-- Pre-assigned identity — READ ONLY -->
    <div class="identity-card">
      {#each [
        { label:"Email",   value: data.invite.email },
        { label:"Role",    value: null, pill: roleLabel },
        { label:"Org",     value: data.invite.organizationName },
        { label:"Set by",  value: data.invite.invitedBy },
        { label:"Expires", value: null, expires: data.invite.expiresAt },
      ] as row}
        <div class="identity-row">
          <span class="identity-label">{row.label}</span>
          {#if row.pill}
            <span class="role-pill">{row.pill}</span>
          {:else if row.expires}
            <span class="expires-pill">{timeLeft(row.expires)}</span>
          {:else}
            <span class="identity-value">{row.value}</span>
          {/if}
        </div>
      {/each}
    </div>

    <div class="lock-notice">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
      <p>Your role and organisation cannot be changed through this form. If these details are incorrect, contact <strong>your sacco administrator</strong> or <strong>support@matatupulse.co.ke</strong> before proceeding.</p>
    </div>

    <button class="btn-submit" onclick={() => step = "set-password"}>
      This is correct — Set My Password
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </button>

  <!-- ── SET PASSWORD ── -->
  {:else if step === "set-password"}
    <div class="page-header">
      <div class="page-eyebrow">Almost there</div>
      <h1 class="page-title">Set Your Password</h1>
      <p class="page-sub">Choose a strong password for your <span style="color:var(--orange);font-weight:600;">{roleLabel}</span> account at {data.invite.organizationName}.</p>
    </div>

    {#if error}
      <div class="error-box">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>{error}</p>
      </div>
    {/if}

    <div class="field">
      <label for="pw">Password</label>
      <div class="input-row">
        <input
          id="pw"
          type={showPassword ? "text" : "password"}
          autocomplete="new-password"
          placeholder="Min 8 characters"
          bind:value={password}
        />
        <button class="toggle-btn" type="button" onclick={() => showPassword = !showPassword}>
          {#if showPassword}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          {:else}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          {/if}
        </button>
      </div>
      <!-- Strength bar -->
      <div class="strength-bar">
        {#each Array(5) as _, i}
          <div class="strength-seg {i < strength ? `active-${strength}` : ''}"></div>
        {/each}
      </div>
      <!-- Checks -->
      <div class="checks">
        {#each [
          { key: "length", label: "At least 8 characters" },
          { key: "upper",  label: "One uppercase letter" },
          { key: "lower",  label: "One lowercase letter" },
          { key: "digit",  label: "One number" },
        ] as c}
          <div class="check {checks[c.key as keyof typeof checks] ? 'pass' : ''}">
            <div class="check-dot">
              {#if checks[c.key as keyof typeof checks]}
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>
              {/if}
            </div>
            {c.label}
          </div>
        {/each}
      </div>
    </div>

    <div class="field">
      <label for="pw2">Confirm Password</label>
      <div class="input-row">
        <input
          id="pw2"
          type={showPassword ? "text" : "password"}
          autocomplete="new-password"
          placeholder="Repeat your password"
          bind:value={confirmPassword}
          onkeydown={(e) => e.key === "Enter" && redeemInvite()}
        />
      </div>
      {#if confirmPassword && !checks.match}
        <p style="font-size:0.75rem;color:#f87171;margin-top:5px;">Passwords don't match.</p>
      {/if}
    </div>

    <button
      class="btn-submit"
      onclick={redeemInvite}
      disabled={loading || strength < 4 || !checks.match}
    >
      {#if loading}
        <div class="spinner"></div>
      {:else}
        Activate Account
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      {/if}
    </button>

  <!-- ── SUCCESS ── -->
  {:else if step === "done"}
    <div class="success-card">
      <div class="success-icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      <div class="success-title">Account Activated</div>
      <p class="success-sub">
        Your <strong style="color:var(--orange)">{roleLabel}</strong> account at
        <strong style="color:var(--text-1)">{data.invite.organizationName}</strong>
        is ready. Redirecting you to your dashboard…
      </p>
    </div>
  {/if}

</div>