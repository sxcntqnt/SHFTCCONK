<!-- src/routes/(auth)/app/create_profile/+page.svelte -->
<script lang="ts">
  import { applyAction, enhance } from "$app/forms"
  import type { SubmitFunction } from "@sveltejs/kit"

  interface User {
    email: string
  }
  interface Profile {
    full_name?: string
    company_name?: string
    website?: string
    phone?: string
  }
  interface FormResult {
    errorFields?: string[]
    errorMessage?: string
    fullName?: string
    companyName?: string
    website?: string
    phone?: string
  }
  interface Props {
    data: { user: User; profile: Profile }
    form: FormResult
  }

  let { data, form }: Props = $props()
  let { user, profile } = data

  let loading = $state(false)
  let fullName: string = profile?.full_name ?? ""
  let companyName: string = profile?.company_name ?? ""
  let website: string = profile?.website ?? ""
  let phone: string = profile?.phone ?? ""

  const fieldError = (liveForm: FormResult, name: string) =>
    (liveForm?.errorFields ?? []).includes(name)

  const handleSubmit: SubmitFunction = () => {
    loading = true
    return async ({ update, result }) => {
      await update({ reset: false })
      await applyAction(result)
      loading = false
    }
  }
</script>

<svelte:head>
  <title>Create Profile</title>
</svelte:head>

<div class="page">
  <div class="card">
    <!-- Header -->
    <div class="card-header">
      <div class="logo-mark">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          stroke-width="2.5"
        >
          <rect x="1" y="3" width="15" height="13" />
          <path d="M16 8h4l3 3v5h-7z" />
        </svg>
      </div>
      <h1 class="title">Create your profile</h1>
      <p class="subtitle">
        Just a few details to get you started on Matatu Pulse.
      </p>
    </div>

    <!-- Form -->
    <form
      method="POST"
      action="/app/api?/updateProfile"
      use:enhance={handleSubmit}
    >
      <!-- Full name -->
      <div class="field">
        <label class="field-label" for="fullName">Full Name</label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          placeholder="e.g. Amina Odhiambo"
          class="field-input {fieldError(form, 'fullName') ? 'err' : ''}"
          value={form?.fullName ?? fullName}
          maxlength="50"
          required
        />
        {#if fieldError(form, "fullName")}
          <span class="field-err">Full name is required</span>
        {/if}
      </div>

      <!-- Phone number -->
      <div class="field">
        <label class="field-label" for="phone">Phone Number</label>
        <div class="phone-wrap">
          <span class="phone-prefix">+254</span>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="712 345 678"
            class="field-input phone-input {fieldError(form, 'phone')
              ? 'err'
              : ''}"
            value={form?.phone ?? phone}
            maxlength="20"
            required
          />
        </div>
        {#if fieldError(form, "phone")}
          <span class="field-err">A valid phone number is required</span>
        {/if}
      </div>

      <!-- Company name (optional) -->
      <div class="field">
        <label class="field-label" for="companyName">
          Company Name
          <span class="optional">optional</span>
        </label>
        <input
          id="companyName"
          name="companyName"
          type="text"
          placeholder="e.g. Citi Hoppa SACCO"
          class="field-input {fieldError(form, 'companyName') ? 'err' : ''}"
          value={form?.companyName ?? companyName}
          maxlength="50"
        />
      </div>

      <!-- Website (optional) -->
      <div class="field">
        <label class="field-label" for="website">
          Website
          <span class="optional">optional</span>
        </label>
        <input
          id="website"
          name="website"
          type="url"
          placeholder="https://example.co.ke"
          class="field-input {fieldError(form, 'website') ? 'err' : ''}"
          value={form?.website ?? website}
          maxlength="100"
        />
      </div>

      <!-- Error message -->
      {#if form?.errorMessage}
        <div class="error-banner">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {form.errorMessage}
        </div>
      {/if}

      <!-- Submit -->
      <button type="submit" class="submit-btn" disabled={loading}>
        {#if loading}
          <span class="spinner"></span>Saving…
        {:else}
          Continue
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        {/if}
      </button>
    </form>

    <!-- Footer -->
    <div class="card-footer">
      Signed in as <strong>{user?.email}</strong> ·
      <a href="/account/sign_out">Sign out</a>
    </div>
  </div>
</div>

<style>
  .page {
    min-height: 100vh;
    background: var(--ink);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    font-family: var(--font-body);
  }

  .card {
    width: 100%;
    max-width: 420px;
    background: var(--ink-2);
    border: 1px solid var(--rim);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
  }

  /* Header */
  .card-header {
    padding: 32px 32px 24px;
    border-bottom: 1px solid var(--rim);
    text-align: center;
    background: linear-gradient(
      160deg,
      rgba(0, 176, 155, 0.07),
      transparent 60%
    );
    position: relative;
  }
  .card-header::before {
    content: "";
    position: absolute;
    top: 0;
    left: 24px;
    right: 24px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(0, 176, 155, 0.35),
      transparent
    );
  }

  .logo-mark {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--teal), #005c52);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 14px;
    box-shadow: 0 4px 14px rgba(0, 176, 155, 0.3);
  }

  .title {
    font-family: var(--font-display);
    font-size: 1.45rem;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--text-1);
    margin-bottom: 6px;
  }

  .subtitle {
    font-size: 0.82rem;
    color: var(--text-3);
    line-height: 1.5;
  }

  /* Form body */
  form {
    padding: 24px 32px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-label {
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--text-3);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .optional {
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-3);
    opacity: 0.5;
    padding: 1px 5px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  .field-input {
    width: 100%;
    padding: 10px 13px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-family: var(--font-body);
    font-size: 0.88rem;
    color: var(--text-1);
    transition:
      border-color 0.15s,
      background 0.15s;
    box-sizing: border-box;
  }
  .field-input::placeholder {
    color: var(--text-3);
    opacity: 0.6;
  }
  .field-input:focus {
    outline: none;
    border-color: rgba(0, 176, 155, 0.45);
    background: rgba(255, 255, 255, 0.06);
    box-shadow: 0 0 0 3px rgba(0, 176, 155, 0.08);
  }
  .field-input.err {
    border-color: rgba(248, 113, 113, 0.5);
  }

  /* Phone row */
  .phone-wrap {
    display: flex;
    align-items: stretch;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    overflow: hidden;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
    background: rgba(255, 255, 255, 0.04);
  }
  .phone-wrap:focus-within {
    border-color: rgba(0, 176, 155, 0.45);
    box-shadow: 0 0 0 3px rgba(0, 176, 155, 0.08);
  }
  .phone-prefix {
    padding: 10px 12px;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--teal);
    background: rgba(0, 176, 155, 0.08);
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    flex-shrink: 0;
    user-select: none;
  }
  .phone-input {
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    flex: 1;
    box-shadow: none !important;
  }
  .phone-input:focus {
    outline: none;
  }

  .field-err {
    font-size: 0.66rem;
    color: #f87171;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* Error banner */
  .error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 13px;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.22);
    border-radius: 10px;
    font-size: 0.78rem;
    color: #f87171;
  }

  /* Submit */
  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px;
    margin-top: 4px;
    background: var(--teal);
    border: none;
    border-radius: 12px;
    font-family: var(--font-body);
    font-size: 0.92rem;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    transition:
      background 0.15s,
      transform 0.15s,
      box-shadow 0.15s;
    box-shadow: 0 4px 18px rgba(0, 176, 155, 0.28);
  }
  .submit-btn:hover:not(:disabled) {
    background: #009a88;
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(0, 176, 155, 0.36);
  }
  .submit-btn:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.25);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Footer */
  .card-footer {
    padding: 14px 32px 20px;
    text-align: center;
    font-size: 0.72rem;
    color: var(--text-3);
    border-top: 1px solid var(--rim);
  }
  .card-footer strong {
    color: var(--text-2);
    font-weight: 600;
  }
  .card-footer a {
    color: var(--teal);
    text-decoration: none;
    font-weight: 600;
  }
  .card-footer a:hover {
    text-decoration: underline;
  }
</style>
