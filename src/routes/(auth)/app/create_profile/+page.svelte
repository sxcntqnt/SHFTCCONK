<!-- src/routes/(auth)/app/create_profile/+page.svelte -->
<script lang="ts">
  import { page } from "$app/stores"
  import { applyAction, enhance } from "$app/forms"
  import type { SubmitFunction } from "@sveltejs/kit"
  import type { Organization } from "./+page.server"

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
    data: {
      user: User
      profile: Profile | null
      organizations: Organization[]
      linkedOrgIds: string[]
      role: string
    }
    form: FormResult
  }

  let { data, form }: Props = $props()
  let { user, profile, organizations, linkedOrgIds } = data
  let preferredVehicleType = []

  // Role forwarded from onboarding — live URL param takes priority
  let role = $derived(
    $page.url.searchParams.get("role") ?? data.role ?? "PASSENGER",
  )

  // Form fields — prefer form return values after a failed submit
  let loading = $state(false)
  let fullName = $state(form?.fullName ?? profile?.full_name ?? "")
  let phone = $state(form?.phone ?? profile?.phone ?? "")
  let companyName = $state(form?.companyName ?? profile?.company_name ?? "")
  let website = $state(form?.website ?? profile?.website ?? "")

  // Org selector
  let selectedOrgs = $state<Set<string>>(new Set(linkedOrgIds))
  let orgSearch = $state("")

  let filteredOrgs = $derived(
    organizations.filter(
      (o) =>
        o.name.toLowerCase().includes(orgSearch.toLowerCase()) ||
        (o.county ?? "").toLowerCase().includes(orgSearch.toLowerCase()),
    ),
  )

  let groupedOrgs = $derived(() => {
    const map = new Map<string, Organization[]>()
    for (const org of filteredOrgs) {
      const key = org.county ?? "Other"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(org)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  })

  function toggleOrg(id: string) {
    const next = new Set(selectedOrgs)
    next.has(id) ? next.delete(id) : next.add(id)
    selectedOrgs = next
  }

  const fieldError = (name: string) => (form?.errorFields ?? []).includes(name)

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
  <title>Create Profile — Matatu Pulse</title>
</svelte:head>

<div class="page">
  <div class="card">
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

    <form method="POST" action="?/updateProfile" use:enhance={handleSubmit}>
      <!-- Role forwarded from onboarding -->
      <input type="hidden" name="role" value={role} />

      <!-- One hidden input per selected org -->
      {#each [...selectedOrgs] as orgId}
        <input type="hidden" name="org_ids" value={orgId} />
      {/each}

      <div class="form-body">
        <!-- Full name -->
        <div class="field">
          <label class="field-label" for="fullName">Full Name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="e.g. Amina Odhiambo"
            class="field-input {fieldError('fullName') ? 'err' : ''}"
            bind:value={fullName}
            maxlength="50"
            required
          />
          {#if fieldError("fullName")}
            <span class="field-err">Full name is required</span>
          {/if}
        </div>

        <!-- Phone -->
        <div class="field">
          <label class="field-label" for="phone">Phone Number</label>
          <div class="phone-wrap {fieldError('phone') ? 'err' : ''}">
            <span class="phone-prefix">+254</span>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="712 345 678"
              class="phone-input"
              bind:value={phone}
              maxlength="15"
              required
            />
          </div>
          {#if fieldError("phone")}
            <span class="field-err">A valid phone number is required</span>
          {/if}
        </div>

        <!-- Company name -->
        <div class="field">
          <label class="field-label" for="companyName">
            Company Name <span class="optional">optional</span>
          </label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            placeholder="e.g. Citi Hoppa SACCO"
            class="field-input"
            bind:value={companyName}
            maxlength="50"
          />
        </div>

        <!-- Website -->
        <div class="field">
          <label class="field-label" for="website">
            Website <span class="optional">optional</span>
          </label>
          <input
            id="website"
            name="website"
            type="url"
            placeholder="https://example.co.ke"
            class="field-input"
            bind:value={website}
            maxlength="100"
          />
        </div>

        <!-- Organisations -->
        <div class="field">
          <div class="field-label">
            Organisations <span class="optional">select all that apply</span>
          </div>

          <!-- Additional Profile Enrichment Fields -->

          <div class="field">
            <label class="field-label" for="preferredVehicleType">
              Preferred Vehicle Type <span class="optional">optional</span>
            </label>
            <select
              id="preferredVehicleType"
              name="preferredVehicleType"
              class="field-input"
              multiple
              bind:value={preferredVehicleType}
            >
              <option value="Bus">Bus</option>
              <option value="Minibus">Minibus</option>
              <option value="Van">Van</option>
              <option value="Taxi">Taxi</option>
              <option value="Matatu">Matatu</option>
              <!-- Add more vehicle types as needed -->
            </select>
          </div>

          <div class="field">
            <label class="field-label" for="socialMediaLinks">
              Social Media / Online Presence <span class="optional"
                >optional</span
              >
            </label>
            <input
              id="socialMediaLinks"
              name="socialMediaLinks"
              type="url"
              placeholder="e.g. https://linkedin.com/in/amina-odhiambo"
              class="field-input"
              bind:value={socialMediaLinks}
              maxlength="200"
            />
          </div>

          <div class="field">
            <label class="field-label" for="profileImage">
              Profile Picture / Logo <span class="optional">optional</span>
            </label>
            <input
              id="profileImage"
              name="profileImage"
              type="file"
              accept="image/*"
              class="field-input"
              bind:value={profileImage}
            />
          </div>

          <div class="field">
            <label class="field-label" for="emergencyContacts">
              Emergency Contacts <span class="optional">optional</span>
            </label>
            <input
              id="emergencyContacts"
              name="emergencyContacts"
              type="text"
              placeholder="e.g. 0712 345 678, 0722 987 654"
              class="field-input"
              bind:value={emergencyContacts}
              maxlength="150"
            />
          </div>

          <div class="field">
            <label class="field-label" for="languagesSpoken">
              Languages Spoken <span class="optional">optional</span>
            </label>
            <select
              id="languagesSpoken"
              name="languagesSpoken"
              class="field-input"
              multiple
              bind:value={languagesSpoken}
            >
              <option value="English">English</option>
              <option value="Swahili">Swahili</option>
              <option value="Kiswahili">Kiswahili</option>
              <option value="Luo">Luo</option>
              <option value="Kikuyu">Kikuyu</option>
              <option value="Kalenjin">Kalenjin</option>
              <option value="Somali">Somali</option>
              <!-- Add more languages as needed -->
            </select>
          </div>

          <div class="field">
            <label class="field-label" for="preferredWorkingHours">
              Preferred Working Hours <span class="optional">optional</span>
            </label>
            <div class="time-range">
              <input
                type="time"
                id="workingHoursStart"
                name="workingHoursStart"
                class="field-input time-input"
                bind:value={workingHoursStart}
              />
              <span class="time-separator">to</span>
              <input
                type="time"
                id="workingHoursEnd"
                name="workingHoursEnd"
                class="field-input time-input"
                bind:value={workingHoursEnd}
              />
            </div>
          </div>
          <div class="field">
            <label class="field-label" for="timeZone">
              Time Zone <span class="optional">optional</span>
            </label>
            <select
              id="timeZone"
              name="timeZone"
              class="field-input"
              bind:value={timeZone}
            >
              <option value="Africa/Nairobi"
                >East Africa Time (EAT) - Nairobi</option
              >
              <option value="Africa/Mombasa"
                >East Africa Time (EAT) - Mombasa</option
              >
              <!-- You can add more if supporting other regions -->
            </select>
          </div>

          {#if organizations.length === 0}
            <div class="org-empty">No organisations found.</div>
          {:else}
            <div class="org-search-wrap">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or county…"
                class="org-search"
                bind:value={orgSearch}
              />
              {#if orgSearch}
                <button
                  type="button"
                  class="org-clear"
                  onclick={() => (orgSearch = "")}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              {/if}
            </div>

            {#if selectedOrgs.size > 0}
              <div class="selected-pill">
                <span class="selected-dot"></span>
                {selectedOrgs.size} organisation{selectedOrgs.size !== 1
                  ? "s"
                  : ""} selected
                <button
                  type="button"
                  class="clear-all"
                  onclick={() => (selectedOrgs = new Set())}
                >
                  Clear all
                </button>
              </div>
            {/if}

            <div class="org-list">
              {#each groupedOrgs() as [county, orgs]}
                <div class="org-group">
                  <div class="org-group-label">{county}</div>
                  {#each orgs as org}
                    {@const checked = selectedOrgs.has(org.id)}
                    <button
                      type="button"
                      class="org-row {checked ? 'selected' : ''}"
                      onclick={() => toggleOrg(org.id)}
                    >
                      <div class="org-check {checked ? 'checked' : ''}">
                        {#if checked}
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="3"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        {/if}
                      </div>
                      <div class="org-info">
                        <div class="org-name">{org.name}</div>
                        {#if org.type}<div class="org-type">
                            {org.type}
                          </div>{/if}
                      </div>
                    </button>
                  {/each}
                </div>
              {/each}

              {#if filteredOrgs.length === 0}
                <div class="org-empty">No results for "{orgSearch}"</div>
              {/if}
            </div>
          {/if}
        </div>

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
      </div>
    </form>

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
    align-items: flex-start;
    justify-content: center;
    padding: 40px 16px;
    font-family: var(--font-body);
  }

  .card {
    width: 100%;
    max-width: 480px;
    background: var(--ink-2);
    border: 1px solid var(--rim);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
  }

  /* ── Header ── */
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
    width: 42px;
    height: 42px;
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

  /* ── Form body ── */
  .form-body {
    padding: 24px 32px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  /* ── Fields ── */
  .field {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .field-label {
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--text-3);
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .optional {
    font-size: 0.58rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
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

  .field-err {
    font-size: 0.66rem;
    color: #f87171;
  }

  /* ── Phone ── */
  .phone-wrap {
    display: flex;
    align-items: stretch;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.04);
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }
  .phone-wrap:focus-within {
    border-color: rgba(0, 176, 155, 0.45);
    box-shadow: 0 0 0 3px rgba(0, 176, 155, 0.08);
  }
  .phone-wrap.err {
    border-color: rgba(248, 113, 113, 0.5);
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
    flex: 1;
    padding: 10px 13px;
    background: transparent;
    border: none;
    outline: none;
    font-family: var(--font-body);
    font-size: 0.88rem;
    color: var(--text-1);
    min-width: 0;
  }
  .phone-input::placeholder {
    color: var(--text-3);
    opacity: 0.6;
  }

  /* ── Org selector ── */
  .org-search-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 10px;
    margin-bottom: 8px;
  }
  .org-search-wrap svg {
    opacity: 0.4;
    flex-shrink: 0;
  }
  .org-search {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-family: var(--font-body);
    font-size: 0.82rem;
    color: var(--text-1);
  }
  .org-search::placeholder {
    color: var(--text-3);
    opacity: 0.6;
  }
  .org-clear {
    background: none;
    border: none;
    color: var(--text-3);
    cursor: pointer;
    font-size: 0.75rem;
    padding: 0 2px;
    opacity: 0.6;
    transition: opacity 0.15s;
  }
  .org-clear:hover {
    opacity: 1;
  }

  .selected-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: rgba(0, 176, 155, 0.09);
    border: 1px solid rgba(0, 176, 155, 0.2);
    border-radius: 100px;
    font-size: 0.66rem;
    font-weight: 700;
    color: var(--teal);
    margin-bottom: 8px;
  }
  .selected-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--teal);
  }
  .clear-all {
    background: none;
    border: none;
    font-family: var(--font-body);
    font-size: 0.62rem;
    font-weight: 700;
    color: var(--text-3);
    cursor: pointer;
    margin-left: 4px;
    padding: 0;
    text-decoration: underline;
    opacity: 0.7;
    transition: opacity 0.15s;
  }
  .clear-all:hover {
    opacity: 1;
  }

  .org-list {
    max-height: 260px;
    overflow-y: auto;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  }
  .org-group-label {
    padding: 8px 13px 4px;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    position: sticky;
    top: 0;
    z-index: 1;
  }
  .org-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 13px;
    background: none;
    border: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    cursor: pointer;
    text-align: left;
    font-family: var(--font-body);
    transition: background 0.12s;
  }
  .org-row:last-child {
    border-bottom: none;
  }
  .org-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  .org-row.selected {
    background: rgba(0, 176, 155, 0.06);
  }
  .org-check {
    width: 16px;
    height: 16px;
    border-radius: 5px;
    border: 1.5px solid rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.12s;
  }
  .org-check.checked {
    background: var(--teal);
    border-color: var(--teal);
    color: #fff;
  }
  .org-info {
    flex: 1;
    min-width: 0;
  }
  .org-name {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-1);
  }
  .org-type {
    font-size: 0.62rem;
    color: var(--text-3);
    margin-top: 1px;
    text-transform: capitalize;
  }
  .org-empty {
    padding: 20px;
    text-align: center;
    font-size: 0.78rem;
    color: var(--text-3);
  }

  /* ── Error banner ── */
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

  /* ── Submit ── */
  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px;
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

  /* ── Footer ── */
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
