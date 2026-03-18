<script lang="ts">
  /**
   * /admin/actor_requests/+page.svelte
   *
   * Changes from previous version:
   *   - Shows full_name + avatar from joined profiles (not raw UUIDs)
   *   - Resolves org name from orgMap
   *   - Added reject action with reason input
   *   - Reject confirm dialog prevents accidental rejections
   *   - Added 'sacco_chair' binding type (primary SACCO activation flow)
   *   - Binding types now labelled to match actual SACCO roles
   */

  type Request = {
    id: string
    profile_id: string
    requested_type: string
    payload: Record<string, unknown> | null
    status: string
    created_at: string
    profiles: {
      full_name: string | null
      avatar_url: string | null
      company_name: string | null
    } | null
  }

  type Data = {
    requests: Request[]
    orgMap: Record<string, string>
    vehicles: { id: string; reg_number: string; capacity: number }[]
    organizations: { id: string; name: string; status: string }[]
  }

  let { data }: { data: Data } = $props()

  // Binding type selection per request card
  let bindingSelections: Record<string, string> = $state({})

  // Reject flow state per card
  let rejectOpen: Record<string, boolean> = $state({})
  let rejectReasons: Record<string, string> = $state({})

  function needsVehicle(type: string) {
    return ['driver_assignment', 'conductor_assignment', 'fleet_ownership'].includes(type)
  }
  function needsOrg(type: string) {
    return ['organization_member', 'fleet_ownership', 'sacco_chair'].includes(type)
  }

  function resolvePayloadValue(key: string, value: unknown, orgMap: Record<string, string>): string {
    if (key === 'organization_id' && typeof value === 'string' && orgMap[value]) {
      return orgMap[value]
    }
    return String(value)
  }

  function formatPayload(
    payload: Record<string, unknown> | null,
    orgMap: Record<string, string>,
  ): { label: string; value: string; isId: boolean }[] {
    if (!payload || typeof payload !== 'object') return []
    return Object.entries(payload).map(([k, v]) => ({
      label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value: resolvePayloadValue(k, v, orgMap),
      isId:  k.endsWith('_id') && typeof v === 'string' && !orgMap[v as string],
    }))
  }

  function formatType(type: string): string {
    const labels: Record<string, string> = {
      org_member:    'SACCO Member',
      passenger:     'Passenger',
      driver:        'Driver',
      conductor:     'Conductor',
      crew:          'Crew',
    }
    return labels[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  function timeAgo(dateStr: string): string {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  function initials(name: string | null): string {
    if (!name) return '?'
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  }
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="ar-root">
  <div class="ar-bg-glow"></div>

  <div class="ar-container">
    <!-- Header -->
    <header class="ar-header">
      <div class="ar-header-left">
        <div class="ar-icon-badge">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        </div>
        <div>
          <h1 class="ar-title">Actor Requests</h1>
          <p class="ar-subtitle">Review and approve pending identity verifications</p>
        </div>
      </div>
      <div class="ar-count-badge">
        <span class="ar-count-dot"></span>
        {data.requests.length} pending
      </div>
    </header>

    <!-- Empty state -->
    {#if data.requests.length === 0}
      <div class="ar-empty">
        <div class="ar-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 class="ar-empty-title">All clear</h2>
        <p class="ar-empty-text">No pending requests to review right now.</p>
      </div>
    {:else}
      <div class="ar-list">
        {#each data.requests as r, i}
          <div class="ar-card" style="animation-delay: {i * 60}ms">

            <!-- Card header: who + type + time -->
            <div class="ar-card-header">
              <div class="ar-requester">
                <!-- Avatar -->
                <div class="ar-avatar">
                  {#if r.profiles?.avatar_url}
                    <img src={r.profiles.avatar_url} alt={r.profiles.full_name ?? ''} class="ar-avatar-img" />
                  {:else}
                    <span class="ar-avatar-initials">{initials(r.profiles?.full_name ?? null)}</span>
                  {/if}
                </div>
                <div>
                  <div class="ar-requester-name">
                    {r.profiles?.full_name ?? 'Unknown User'}
                  </div>
                  {#if r.profiles?.company_name}
                    <div class="ar-requester-company">{r.profiles.company_name}</div>
                  {/if}
                </div>
              </div>

              <div class="ar-card-meta">
                <span class="ar-type-tag">{formatType(r.requested_type)}</span>
                {#if r.created_at}
                  <span class="ar-time">{timeAgo(r.created_at)}</span>
                {/if}
                <span class="ar-status-badge">
                  <span class="ar-status-dot"></span>
                  Pending
                </span>
              </div>
            </div>

            <!-- Payload details -->
            {#if r.payload}
              <div class="ar-payload">
                {#each formatPayload(r.payload, data.orgMap) as field}
                  <div class="ar-field">
                    <span class="ar-field-label">{field.label}</span>
                    <span class="ar-field-value" class:ar-field-mono={field.isId}>{field.value}</span>
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Request ID -->
            <div class="ar-request-id">
              <span class="ar-id-label">REQ</span>
              <code class="ar-id-value">{r.id}</code>
            </div>

            <div class="ar-divider"></div>

            <!-- Approve form -->
            <form method="post" action="?/approve" class="ar-form">
              <input type="hidden" name="request_id" value={r.id} />
              <input type="hidden" id={"binding_target_" + r.id} name="binding_target" />

              <div class="ar-form-grid">
                <!-- Binding type -->
                <div class="ar-form-group">
                  <label class="ar-label" for={"binding_type_" + r.id}>Activation Type</label>
                  <div class="ar-select-wrap">
                    <select
                      name="binding_type"
                      id={"binding_type_" + r.id}
                      class="ar-select"
                      onchange={(e) => {
                        bindingSelections[r.id] = (e.target as HTMLSelectElement).value
                      }}
                    >
                      <option value="">None — approve role only</option>
                      <optgroup label="SACCO">
                        <option value="sacco_chair">SACCO Chairman → Organization</option>
                        <option value="organization_member">Member → Organization</option>
                      </optgroup>
                      <optgroup label="Crew">
                        <option value="driver_assignment">Driver → Vehicle</option>
                        <option value="conductor_assignment">Conductor → Vehicle</option>
                      </optgroup>
                      <optgroup label="Ownership">
                        <option value="fleet_ownership">Fleet Owner → Vehicle + Org</option>
                      </optgroup>
                    </select>
                    <svg class="ar-select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                <!-- Vehicle select (conditional) -->
                {#if needsVehicle(bindingSelections[r.id] ?? '')}
                  <div class="ar-form-group ar-slide-in">
                    <label class="ar-label">Target Vehicle</label>
                    {#if data.vehicles.length > 0}
                      <div class="ar-select-wrap">
                        <select
                          class="ar-select"
                          onchange={(e) => {
                            const el = document.getElementById('binding_target_' + r.id) as HTMLInputElement
                            if (el) el.value = (e.target as HTMLSelectElement).value
                          }}
                        >
                          <option value="">Choose a vehicle…</option>
                          {#each data.vehicles as v}
                            <option value={v.id}>{v.reg_number} ({v.capacity} seats)</option>
                          {/each}
                        </select>
                        <svg class="ar-select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    {:else}
                      <input
                        type="text"
                        placeholder="Vehicle UUID"
                        class="ar-input"
                        onchange={(e) => {
                          const el = document.getElementById('binding_target_' + r.id) as HTMLInputElement
                          if (el) el.value = (e.target as HTMLInputElement).value
                        }}
                      />
                    {/if}
                  </div>
                {/if}

                <!-- Organization select (conditional) -->
                {#if needsOrg(bindingSelections[r.id] ?? '')}
                  <div class="ar-form-group ar-slide-in">
                    <label class="ar-label">Target Organization</label>
                    {#if data.organizations.length > 0}
                      <div class="ar-select-wrap">
                        <select
                          class="ar-select"
                          onchange={(e) => {
                            const el = document.getElementById('binding_target_' + r.id) as HTMLInputElement
                            if (el) el.value = (e.target as HTMLSelectElement).value
                          }}
                        >
                          <option value="">Choose a SACCO…</option>
                          {#each data.organizations as o}
                            <option value={o.id}>
                              {o.name}{o.status !== 'active' ? ' (pending)' : ''}
                            </option>
                          {/each}
                        </select>
                        <svg class="ar-select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    {:else}
                      <input
                        type="text"
                        placeholder="Organization UUID"
                        class="ar-input"
                        onchange={(e) => {
                          const el = document.getElementById('binding_target_' + r.id) as HTMLInputElement
                          if (el) el.value = (e.target as HTMLInputElement).value
                        }}
                      />
                    {/if}
                  </div>
                {/if}
              </div>

              <!-- Action buttons -->
              <div class="ar-form-actions">
                <!-- Reject toggle -->
                {#if !rejectOpen[r.id]}
                  <button
                    type="button"
                    class="ar-btn-reject-toggle"
                    onclick={() => { rejectOpen[r.id] = true }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Reject
                  </button>
                {/if}

                <button type="submit" class="ar-btn-approve">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Approve
                </button>
              </div>
            </form>

            <!-- Reject form (inline, revealed on toggle) -->
            {#if rejectOpen[r.id]}
              <form method="post" action="?/reject" class="ar-reject-form ar-slide-in">
                <input type="hidden" name="request_id" value={r.id} />
                <div class="ar-form-group">
                  <label class="ar-label" for={"reject_reason_" + r.id}>Rejection Reason</label>
                  <input
                    id={"reject_reason_" + r.id}
                    name="reject_reason"
                    type="text"
                    placeholder="e.g. Documents unverified, duplicate request…"
                    class="ar-input"
                    bind:value={rejectReasons[r.id]}
                  />
                </div>
                <div class="ar-reject-actions">
                  <button
                    type="button"
                    class="ar-btn-cancel"
                    onclick={() => { rejectOpen[r.id] = false; rejectReasons[r.id] = '' }}
                  >
                    Cancel
                  </button>
                  <button type="submit" class="ar-btn-reject-confirm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Confirm Rejection
                  </button>
                </div>
              </form>
            {/if}

          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  :global(body) { font-family: "DM Sans", system-ui, sans-serif; }

  .ar-root {
    position: relative;
    min-height: 100vh;
    background: #0c0e13;
    color: #e2e4e9;
    padding: 2rem 1rem 4rem;
    overflow: hidden;
  }

  .ar-bg-glow {
    position: fixed;
    top: -20%; left: 50%;
    transform: translateX(-50%);
    width: 800px; height: 600px;
    background: radial-gradient(ellipse, rgba(99,132,255,.07) 0%, transparent 70%);
    pointer-events: none; z-index: 0;
  }

  .ar-container {
    position: relative; z-index: 1;
    max-width: 780px; margin: 0 auto;
  }

  /* Header */
  .ar-header {
    display: flex; align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 2rem; gap: 1rem;
  }
  .ar-header-left { display: flex; align-items: center; gap: 1rem; }
  .ar-icon-badge {
    display: flex; align-items: center; justify-content: center;
    width: 48px; height: 48px; border-radius: 14px;
    background: linear-gradient(135deg, rgba(99,132,255,.15), rgba(99,132,255,.05));
    border: 1px solid rgba(99,132,255,.2); color: #8ba2ff; flex-shrink: 0;
  }
  .ar-title { font-size: 1.5rem; font-weight: 700; letter-spacing: -.02em; color: #f0f1f4; margin: 0; line-height: 1.2; }
  .ar-subtitle { font-size: .85rem; color: #6b7084; margin: .2rem 0 0; }

  .ar-count-badge {
    display: inline-flex; align-items: center; gap: .5rem;
    font-size: .8rem; font-weight: 500; color: #c9a24e;
    background: rgba(201,162,78,.08); border: 1px solid rgba(201,162,78,.18);
    border-radius: 100px; padding: .35rem .85rem; flex-shrink: 0;
  }
  .ar-count-dot {
    width: 7px; height: 7px; border-radius: 50%; background: #c9a24e;
    animation: ar-pulse 2s ease-in-out infinite;
  }
  @keyframes ar-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

  /* Empty */
  .ar-empty { text-align: center; padding: 4rem 2rem; }
  .ar-empty-icon { color: #3a9e6e; margin-bottom: 1.2rem; opacity: .7; }
  .ar-empty-title { font-size: 1.25rem; font-weight: 600; color: #d1d5db; margin: 0 0 .4rem; }
  .ar-empty-text { font-size: .9rem; color: #6b7084; margin: 0; }

  /* Card list */
  .ar-list { display: flex; flex-direction: column; gap: 1rem; }
  .ar-card {
    background: rgba(255,255,255,.025); border: 1px solid rgba(255,255,255,.06);
    border-radius: 16px; padding: 1.5rem;
    animation: ar-card-in .4s ease-out both;
    transition: border-color .2s, box-shadow .2s;
  }
  .ar-card:hover {
    border-color: rgba(99,132,255,.15);
    box-shadow: 0 0 0 1px rgba(99,132,255,.05), 0 8px 32px rgba(0,0,0,.2);
  }
  @keyframes ar-card-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

  /* Card header with requester info */
  .ar-card-header {
    display: flex; align-items: center;
    justify-content: space-between; margin-bottom: 1rem;
    gap: .75rem; flex-wrap: wrap;
  }
  .ar-requester { display: flex; align-items: center; gap: .75rem; }
  .ar-avatar {
    width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, rgba(99,132,255,.2), rgba(99,132,255,.08));
    border: 1px solid rgba(99,132,255,.2);
    display: flex; align-items: center; justify-content: center; overflow: hidden;
  }
  .ar-avatar-img { width: 100%; height: 100%; object-fit: cover; }
  .ar-avatar-initials { font-size: .78rem; font-weight: 700; color: #8ba2ff; letter-spacing: .02em; }
  .ar-requester-name { font-size: .92rem; font-weight: 600; color: #e2e4e9; }
  .ar-requester-company { font-size: .75rem; color: #6b7084; margin-top: .1rem; }

  .ar-card-meta { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
  .ar-type-tag {
    font-size: .78rem; font-weight: 600; color: #a5b4fc;
    background: rgba(99,132,255,.1); border: 1px solid rgba(99,132,255,.15);
    padding: .28rem .65rem; border-radius: 8px; letter-spacing: .01em;
  }
  .ar-time { font-size: .72rem; color: #555a6e; }
  .ar-status-badge {
    display: inline-flex; align-items: center; gap: .4rem;
    font-size: .72rem; font-weight: 500; color: #e2a63d;
    background: rgba(226,166,61,.08); padding: .22rem .6rem;
    border-radius: 100px; border: 1px solid rgba(226,166,61,.12);
  }
  .ar-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #e2a63d; }

  /* Payload */
  .ar-payload {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: .6rem; margin-bottom: .8rem;
  }
  .ar-field {
    display: flex; flex-direction: column; gap: .15rem;
    padding: .5rem .7rem;
    background: rgba(255,255,255,.02); border-radius: 8px;
    border: 1px solid rgba(255,255,255,.04);
  }
  .ar-field-label { font-size: .65rem; text-transform: uppercase; letter-spacing: .06em; color: #555a6e; font-weight: 500; }
  .ar-field-value { font-size: .85rem; color: #c8cbd3; word-break: break-all; }
  .ar-field-mono { font-family: "JetBrains Mono", monospace; font-size: .72rem; color: #555a6e; }

  /* Request ID */
  .ar-request-id { display: flex; align-items: center; gap: .5rem; margin-bottom: 1rem; }
  .ar-id-label { font-size: .62rem; text-transform: uppercase; letter-spacing: .08em; color: #44475a; font-weight: 600; }
  .ar-id-value {
    font-family: "JetBrains Mono", monospace; font-size: .68rem; color: #555a6e;
    background: rgba(255,255,255,.03); padding: .18rem .5rem;
    border-radius: 6px; border: 1px solid rgba(255,255,255,.04);
  }

  .ar-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.06) 20%, rgba(255,255,255,.06) 80%, transparent);
    margin-bottom: 1.25rem;
  }

  /* Form */
  .ar-form-grid { display: flex; flex-direction: column; gap: .85rem; margin-bottom: 1rem; }
  .ar-form-group { display: flex; flex-direction: column; gap: .35rem; }
  .ar-label { font-size: .7rem; text-transform: uppercase; letter-spacing: .06em; color: #6b7084; font-weight: 600; }
  .ar-select-wrap { position: relative; }
  .ar-select {
    width: 100%; appearance: none;
    background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08);
    border-radius: 10px; padding: .6rem 2.2rem .6rem .85rem;
    font-size: .85rem; color: #c8cbd3; font-family: "DM Sans", system-ui, sans-serif;
    cursor: pointer; outline: none; transition: border-color .15s, background .15s;
  }
  .ar-select:hover { border-color: rgba(99,132,255,.25); background: rgba(255,255,255,.04); }
  .ar-select:focus { border-color: rgba(99,132,255,.4); box-shadow: 0 0 0 3px rgba(99,132,255,.08); }
  .ar-select option { background: #1a1d26; color: #c8cbd3; }
  .ar-select-chevron { position: absolute; right: .75rem; top: 50%; transform: translateY(-50%); pointer-events: none; color: #555a6e; }
  .ar-input {
    width: 100%; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08);
    border-radius: 10px; padding: .6rem .85rem; font-size: .85rem; color: #c8cbd3;
    font-family: "DM Sans", system-ui, sans-serif; outline: none;
    transition: border-color .15s, background .15s; box-sizing: border-box;
  }
  .ar-input::placeholder { color: #44475a; }
  .ar-input:hover { border-color: rgba(99,132,255,.25); }
  .ar-input:focus { border-color: rgba(99,132,255,.4); box-shadow: 0 0 0 3px rgba(99,132,255,.08); }

  /* Slide-in */
  .ar-slide-in { animation: ar-slide .25s ease-out; }
  @keyframes ar-slide { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }

  /* Action row */
  .ar-form-actions { display: flex; justify-content: flex-end; align-items: center; gap: .65rem; }

  .ar-btn-approve {
    display: inline-flex; align-items: center; gap: .5rem;
    padding: .6rem 1.4rem; font-size: .85rem; font-weight: 600;
    font-family: "DM Sans", system-ui, sans-serif; color: #0c0e13;
    background: linear-gradient(135deg, #6ee7a0, #3abf72); border: none;
    border-radius: 10px; cursor: pointer;
    transition: transform .12s, box-shadow .2s, filter .15s;
  }
  .ar-btn-approve:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(58,191,114,.25); filter: brightness(1.05); }
  .ar-btn-approve:active { transform: translateY(0); filter: brightness(.95); }

  .ar-btn-reject-toggle {
    display: inline-flex; align-items: center; gap: .4rem;
    padding: .55rem 1rem; font-size: .82rem; font-weight: 500;
    font-family: "DM Sans", system-ui, sans-serif; color: #7a5a5a;
    background: rgba(239,68,68,.04); border: 1px solid rgba(239,68,68,.1);
    border-radius: 10px; cursor: pointer;
    transition: background .15s, border-color .15s, color .15s;
  }
  .ar-btn-reject-toggle:hover { background: rgba(239,68,68,.08); border-color: rgba(239,68,68,.2); color: #f87171; }

  /* Reject form */
  .ar-reject-form {
    margin-top: .75rem; padding: 1rem;
    background: rgba(239,68,68,.04); border: 1px solid rgba(239,68,68,.1);
    border-radius: 12px; display: flex; flex-direction: column; gap: .75rem;
  }
  .ar-reject-actions { display: flex; justify-content: flex-end; gap: .65rem; }
  .ar-btn-cancel {
    padding: .5rem 1rem; font-size: .82rem; font-weight: 500;
    font-family: "DM Sans", system-ui, sans-serif; color: #6b7084;
    background: transparent; border: 1px solid rgba(255,255,255,.08);
    border-radius: 10px; cursor: pointer; transition: border-color .15s, color .15s;
  }
  .ar-btn-cancel:hover { border-color: rgba(255,255,255,.16); color: #c8cbd3; }
  .ar-btn-reject-confirm {
    display: inline-flex; align-items: center; gap: .4rem;
    padding: .5rem 1.1rem; font-size: .82rem; font-weight: 600;
    font-family: "DM Sans", system-ui, sans-serif; color: #fff;
    background: linear-gradient(135deg, #dc4444, #b83232); border: none;
    border-radius: 10px; cursor: pointer; transition: filter .15s, transform .12s;
  }
  .ar-btn-reject-confirm:hover { filter: brightness(1.1); transform: translateY(-1px); }
  .ar-btn-reject-confirm:active { transform: translateY(0); filter: brightness(.95); }

  @media (max-width: 600px) {
    .ar-root { padding: 1.25rem .75rem 3rem; }
    .ar-header { flex-direction: column; gap: .75rem; }
    .ar-card { padding: 1.15rem; }
    .ar-payload { grid-template-columns: 1fr; }
    .ar-card-header { flex-direction: column; align-items: flex-start; }
  }
</style>