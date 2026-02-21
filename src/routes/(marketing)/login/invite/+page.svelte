<script lang="ts">
  import { goto } from "$app/navigation"
  import { page } from "$app/stores"

  // Pre-fill from URL param: /login/invite?code=xxx
  let code = $state($page.url.searchParams.get("code") ?? "")
  let loading = $state(false)
  let error = $state<string | null>(null)

  // Normalise: strip whitespace, uppercase
  function normalise(raw: string) {
    return raw.trim().toUpperCase().replace(/\s+/g, "")
  }

  async function proceed() {
    error = null
    const clean = normalise(code)
    if (!clean) { error = "Please enter your invitation code."; return }
    loading = true
    // Redirect to /login/invite/[code] — the [token] route does the actual
    // validation and renders the set-password form
    goto(`/login/invite/${encodeURIComponent(clean)}`)
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Enter") proceed()
  }
</script>

<svelte:head>
  <title>Redeem Invitation — Matatu Pulse</title>
</svelte:head>

<style>
  .invite-wrap { width: 100%; }

  .page-header { margin-bottom: 28px; }
  .page-eyebrow {
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--orange); margin-bottom: 10px;
  }
  .page-title {
    font-family: var(--font-display); font-size: 1.6rem; font-weight: 800;
    letter-spacing: -0.04em; color: var(--text-1); line-height: 1.15; margin-bottom: 6px;
  }
  .page-sub { font-size: 0.875rem; color: var(--text-2); line-height: 1.6; }

  /* Role pills */
  .role-pills { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 24px; }
  .role-pill {
    padding: 3px 9px; border-radius: 100px;
    font-size: 0.63rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
    background: var(--surface); border: 1px solid var(--rim-2); color: var(--text-3);
  }

  /* Info card */
  .info-card {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 14px 16px; margin-bottom: 24px;
    background: rgba(242,101,34,0.05); border: 1px solid rgba(242,101,34,0.18);
    border-radius: 12px;
  }
  .info-card svg { color: var(--orange); flex-shrink: 0; margin-top: 1px; }
  .info-card p { font-size: 0.82rem; color: var(--text-2); line-height: 1.6; }
  .info-card strong { color: var(--text-1); }

  /* Form */
  label {
    display: block; font-size: 0.78rem; font-weight: 600;
    color: var(--text-2); letter-spacing: 0.03em; margin-bottom: 6px;
  }
  .code-input {
    width: 100%; padding: 14px 16px;
    background: var(--ink-2); border: 1px solid var(--rim-2); border-radius: 10px;
    font-size: 1.05rem; font-family: var(--font-display); font-weight: 700;
    letter-spacing: 0.12em; color: var(--text-1); text-align: center;
    text-transform: uppercase; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .code-input:focus { border-color: rgba(242,101,34,0.5); box-shadow: 0 0 0 3px rgba(242,101,34,0.08); }
  .code-input::placeholder { color: var(--text-3); letter-spacing: 0.08em; font-size: 0.875rem; font-weight: 500; }
  .input-hint { font-size: 0.72rem; color: var(--text-3); margin-top: 5px; }

  /* Error */
  .error-box {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 14px; margin-bottom: 14px;
    background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.25);
    border-radius: 10px;
  }
  .error-box svg { color: #f87171; flex-shrink: 0; margin-top: 1px; }
  .error-box p { font-size: 0.82rem; color: #f87171; line-height: 1.5; }

  /* Button */
  .btn-submit {
    width: 100%; margin-top: 14px; padding: 13px;
    background: var(--orange); color: #fff;
    font-family: var(--font-body); font-size: 0.9rem; font-weight: 700;
    border: none; border-radius: 12px; cursor: pointer;
    box-shadow: 0 4px 20px rgba(242,101,34,0.28);
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .btn-submit:hover:not(:disabled) { background: #d95618; transform: translateY(-1px); }
  .btn-submit:disabled { opacity: 0.55; cursor: not-allowed; }

  /* How it works */
  .how-it-works { margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--rim); }
  .how-label { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-3); margin-bottom: 12px; }
  .steps { display: flex; flex-direction: column; gap: 10px; }
  .step { display: flex; align-items: flex-start; gap: 12px; }
  .step-num {
    width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
    background: rgba(242,101,34,0.1); border: 1px solid rgba(242,101,34,0.2);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.65rem; font-weight: 800; color: var(--orange);
  }
  .step-text { font-size: 0.8rem; color: var(--text-2); line-height: 1.55; padding-top: 2px; }
  .step-text strong { color: var(--text-1); }

  /* Footer */
  .auth-footer { padding-top: 16px; border-top: 1px solid var(--rim); margin-top: 20px; }
  .auth-footer-row { font-size: 0.82rem; color: var(--text-3); margin-bottom: 8px; }
  .auth-footer-row:last-child { margin-bottom: 0; }
  .auth-footer-row a { color: var(--orange); text-decoration: none; font-weight: 600; }
  .auth-footer-row a:hover { color: #d95618; }

  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
</style>

<div class="invite-wrap">

  <div class="page-header">
    <div class="page-eyebrow">Organisation Access</div>
    <h1 class="page-title">Redeem Your<br/>Invitation</h1>
    <p class="page-sub">Your role and organisation are pre-assigned in your invitation. Enter the code from your email to continue.</p>
  </div>

  <!-- Roles this flow handles -->
  <div class="role-pills">
    {#each ["Owner","Operations Manager","Accountant","Compliance Officer","Route Supervisor","Vehicle Owner","Stage Operator","Org Chair"] as r}
      <span class="role-pill">{r}</span>
    {/each}
  </div>

  <div class="info-card">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
    <p><strong>Your role is set by your organisation administrator</strong> — not by this form. You cannot change it during sign-up. Contact your sacco chair or Matatu Pulse support if your access is incorrect after signing in.</p>
  </div>

  {#if error}
    <div class="error-box">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{error}</p>
    </div>
  {/if}

  <div>
    <label for="invite-code">Invitation Code</label>
    <input
      id="invite-code"
      class="code-input"
      type="text"
      autocomplete="off"
      autocorrect="off"
      spellcheck="false"
      placeholder="MP-XXXX-XXXX"
      bind:value={code}
      onkeydown={handleKey}
      maxlength={20}
    />
    <p class="input-hint">Find your code in the invitation email from Matatu Pulse or your sacco administrator.</p>
  </div>

  <button class="btn-submit" onclick={proceed} disabled={loading || !code.trim()}>
    {#if loading}
      <div class="spinner"></div>
    {:else}
      Continue with Invitation
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    {/if}
  </button>

  <!-- How it works -->
  <div class="how-it-works">
    <div class="how-label">How invitation access works</div>
    <div class="steps">
      {#each [
        { n:"1", text:"Your <strong>sacco chair or Matatu Pulse</strong> creates your account and sets your role." },
        { n:"2", text:"You receive an <strong>email with an invitation code</strong> and a direct link." },
        { n:"3", text:"You redeem the code here and <strong>set your own password</strong>." },
        { n:"4", text:"Your role and organisation context are <strong>active immediately</strong> after sign-in." },
      ] as s}
        <div class="step">
          <div class="step-num">{s.n}</div>
          <p class="step-text">{@html s.text}</p>
        </div>
      {/each}
    </div>
  </div>

  <div class="auth-footer">
    <div class="auth-footer-row">Already set a password? <a href="/login/sign_in">Sign in instead</a></div>
    <div class="auth-footer-row">No invitation yet? <a href="/contact?type=partnership">Request access for your sacco</a></div>
    <div class="auth-footer-row">Wrong portal? <a href="/login">Back to all sign-in options</a></div>
  </div>

</div>