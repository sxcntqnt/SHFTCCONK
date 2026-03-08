<script lang="ts">
  type Data = {
    requests: any[]
    vehicles?: any[]
    organizations?: any[]
    error?: string
  }
  let { data }: { data: Data } = $props()

  // Track which binding type is selected per request, for conditional UI
  let bindingSelections: Record<string, string> = $state({})

  function needsVehicle(type: string) {
    return [
      "driver_assignment",
      "conductor_assignment",
      "fleet_ownership",
    ].includes(type)
  }
  function needsOrg(type: string) {
    return ["organization_member", "fleet_ownership"].includes(type)
  }

  function formatPayload(payload: any): { label: string; value: string }[] {
    if (!payload || typeof payload !== "object") return []
    return Object.entries(payload).map(([k, v]) => ({
      label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: String(v),
    }))
  }

  function formatType(type: string): string {
    return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }

  function timeAgo(dateStr: string): string {
    if (!dateStr) return ""
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="ar-root">
  <!-- Ambient background -->
  <div class="ar-bg-glow"></div>

  <div class="ar-container">
    <!-- Header -->
    <header class="ar-header">
      <div class="ar-header-left">
        <div class="ar-icon-badge">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        </div>
        <div>
          <h1 class="ar-title">Actor Requests</h1>
          <p class="ar-subtitle">
            Review and approve pending identity verifications
          </p>
        </div>
      </div>
      <div class="ar-header-right">
        <div class="ar-count-badge">
          <span class="ar-count-dot"></span>
          {data.requests.length} pending
        </div>
      </div>
    </header>

    <!-- Error banner -->
    {#if data.error}
      <div class="ar-error">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <span>{data.error}</span>
      </div>
    {/if}

    <!-- Empty state -->
    {#if data.requests.length === 0}
      <div class="ar-empty">
        <div class="ar-empty-icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 class="ar-empty-title">All clear</h2>
        <p class="ar-empty-text">No pending requests to review right now.</p>
      </div>
    {:else}
      <!-- Request cards -->
      <div class="ar-list">
        {#each data.requests as r, i}
          <div class="ar-card" style="animation-delay: {i * 60}ms">
            <!-- Card header -->
            <div class="ar-card-header">
              <div class="ar-card-type-row">
                <span class="ar-type-tag">{formatType(r.requested_type)}</span>
                {#if r.created_at}
                  <span class="ar-time">{timeAgo(r.created_at)}</span>
                {/if}
              </div>
              <span class="ar-status-badge">
                <span class="ar-status-dot"></span>
                Pending
              </span>
            </div>

            <!-- Payload details -->
            {#if r.payload}
              <div class="ar-payload">
                {#each formatPayload(r.payload) as field}
                  <div class="ar-field">
                    <span class="ar-field-label">{field.label}</span>
                    <span class="ar-field-value">{field.value}</span>
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Request ID -->
            <div class="ar-request-id">
              <span class="ar-id-label">ID</span>
              <code class="ar-id-value">{r.id}</code>
            </div>

            <!-- Separator -->
            <div class="ar-divider"></div>

            <!-- Action form -->
            <form method="post" class="ar-form" action="?/approve">
              <input type="hidden" name="request_id" value={r.id} />
              <input
                type="hidden"
                id={"binding_target_" + r.id}
                name="binding_target"
              />

              <div class="ar-form-grid">
                <!-- Binding type -->
                <div class="ar-form-group">
                  <label class="ar-label" for={"binding_type_" + r.id}
                    >Binding Type</label
                  >
                  <div class="ar-select-wrap">
                    <select
                      name="binding_type"
                      id={"binding_type_" + r.id}
                      class="ar-select"
                      onchange={(e) => {
                        bindingSelections[r.id] = (
                          e.target as HTMLSelectElement
                        ).value
                      }}
                    >
                      <option value="">None — approve without binding</option>
                      <option value="driver_assignment">Driver → Vehicle</option
                      >
                      <option value="conductor_assignment"
                        >Conductor → Vehicle</option
                      >
                      <option value="fleet_ownership"
                        >Fleet Owner → Vehicle + Org</option
                      >
                      <option value="organization_member"
                        >Member → Organization</option
                      >
                    </select>
                    <svg
                      class="ar-select-chevron"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                <!-- Vehicle select (conditional) -->
                {#if needsVehicle(bindingSelections[r.id] || "")}
                  <div class="ar-form-group ar-slide-in">
                    <label class="ar-label">Target Vehicle</label>
                    {#if data.vehicles && data.vehicles.length > 0}
                      <div class="ar-select-wrap">
                        <select
                          class="ar-select"
                          onchange={(e) => {
                            const el = document.getElementById(
                              "binding_target_" + r.id,
                            ) as HTMLInputElement
                            if (el)
                              el.value = (e.target as HTMLSelectElement).value
                          }}
                        >
                          <option value="">Choose a vehicle…</option>
                          {#each data.vehicles as v}
                            <option value={v.id}>{v.name}</option>
                          {/each}
                        </select>
                        <svg
                          class="ar-select-chevron"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    {:else}
                      <input
                        type="text"
                        placeholder="Vehicle UUID"
                        class="ar-input"
                        onchange={(e) => {
                          const el = document.getElementById(
                            "binding_target_" + r.id,
                          ) as HTMLInputElement
                          if (el)
                            el.value = (e.target as HTMLInputElement).value
                        }}
                      />
                    {/if}
                  </div>
                {/if}

                <!-- Organization select (conditional) -->
                {#if needsOrg(bindingSelections[r.id] || "")}
                  <div class="ar-form-group ar-slide-in">
                    <label class="ar-label">Target Organization</label>
                    {#if data.organizations && data.organizations.length > 0}
                      <div class="ar-select-wrap">
                        <select
                          class="ar-select"
                          onchange={(e) => {
                            const el = document.getElementById(
                              "binding_target_" + r.id,
                            ) as HTMLInputElement
                            if (el)
                              el.value = (e.target as HTMLSelectElement).value
                          }}
                        >
                          <option value="">Choose an organization…</option>
                          {#each data.organizations as o}
                            <option value={o.id}>{o.name}</option>
                          {/each}
                        </select>
                        <svg
                          class="ar-select-chevron"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    {:else}
                      <input
                        type="text"
                        placeholder="Organization UUID"
                        class="ar-input"
                        onchange={(e) => {
                          const el = document.getElementById(
                            "binding_target_" + r.id,
                          ) as HTMLInputElement
                          if (el)
                            el.value = (e.target as HTMLInputElement).value
                        }}
                      />
                    {/if}
                  </div>
                {/if}

                <!-- Fallback if no vehicle/org binding selected but no lists -->
                {#if !(data.vehicles && data.vehicles.length > 0) && !(data.organizations && data.organizations.length > 0) && !needsVehicle(bindingSelections[r.id] || "") && !needsOrg(bindingSelections[r.id] || "") && (bindingSelections[r.id] || "")}
                  <div class="ar-form-group ar-slide-in">
                    <label class="ar-label">Binding Target UUID</label>
                    <input
                      name="binding_target"
                      placeholder="Paste target UUID"
                      class="ar-input"
                    />
                  </div>
                {/if}
              </div>

              <div class="ar-form-actions">
                <button type="submit" class="ar-btn-approve">
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
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Approve Request
                </button>
              </div>
            </form>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  /* ── Foundation ── */
  :global(body) {
    font-family: "DM Sans", system-ui, sans-serif;
  }

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
    top: -20%;
    left: 50%;
    transform: translateX(-50%);
    width: 800px;
    height: 600px;
    background: radial-gradient(
      ellipse,
      rgba(99, 132, 255, 0.07) 0%,
      transparent 70%
    );
    pointer-events: none;
    z-index: 0;
  }

  .ar-container {
    position: relative;
    z-index: 1;
    max-width: 760px;
    margin: 0 auto;
  }

  /* ── Header ── */
  .ar-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 2rem;
    gap: 1rem;
  }

  .ar-header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .ar-icon-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: linear-gradient(
      135deg,
      rgba(99, 132, 255, 0.15),
      rgba(99, 132, 255, 0.05)
    );
    border: 1px solid rgba(99, 132, 255, 0.2);
    color: #8ba2ff;
    flex-shrink: 0;
  }

  .ar-title {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #f0f1f4;
    margin: 0;
    line-height: 1.2;
  }

  .ar-subtitle {
    font-size: 0.85rem;
    color: #6b7084;
    margin: 0.2rem 0 0;
    font-weight: 400;
  }

  .ar-header-right {
    flex-shrink: 0;
    padding-top: 0.25rem;
  }

  .ar-count-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    font-weight: 500;
    color: #c9a24e;
    background: rgba(201, 162, 78, 0.08);
    border: 1px solid rgba(201, 162, 78, 0.18);
    border-radius: 100px;
    padding: 0.35rem 0.85rem;
  }

  .ar-count-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #c9a24e;
    animation: ar-pulse 2s ease-in-out infinite;
  }

  @keyframes ar-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  /* ── Error ── */
  .ar-error {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.8rem 1rem;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 10px;
    color: #f87171;
    font-size: 0.85rem;
    margin-bottom: 1.5rem;
  }

  /* ── Empty state ── */
  .ar-empty {
    text-align: center;
    padding: 4rem 2rem;
  }

  .ar-empty-icon {
    color: #3a9e6e;
    margin-bottom: 1.2rem;
    opacity: 0.7;
  }

  .ar-empty-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #d1d5db;
    margin: 0 0 0.4rem;
  }

  .ar-empty-text {
    font-size: 0.9rem;
    color: #6b7084;
    margin: 0;
  }

  /* ── Card list ── */
  .ar-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .ar-card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    padding: 1.5rem;
    backdrop-filter: blur(12px);
    animation: ar-card-in 0.4s ease-out both;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .ar-card:hover {
    border-color: rgba(99, 132, 255, 0.15);
    box-shadow:
      0 0 0 1px rgba(99, 132, 255, 0.05),
      0 8px 32px rgba(0, 0, 0, 0.2);
  }

  @keyframes ar-card-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ── Card header ── */
  .ar-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .ar-card-type-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .ar-type-tag {
    font-size: 0.82rem;
    font-weight: 600;
    color: #a5b4fc;
    background: rgba(99, 132, 255, 0.1);
    border: 1px solid rgba(99, 132, 255, 0.15);
    padding: 0.3rem 0.7rem;
    border-radius: 8px;
    letter-spacing: 0.01em;
  }

  .ar-time {
    font-size: 0.75rem;
    color: #555a6e;
    font-weight: 400;
  }

  .ar-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: #e2a63d;
    background: rgba(226, 166, 61, 0.08);
    padding: 0.25rem 0.65rem;
    border-radius: 100px;
    border: 1px solid rgba(226, 166, 61, 0.12);
  }

  .ar-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #e2a63d;
  }

  /* ── Payload ── */
  .ar-payload {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.6rem;
    margin-bottom: 0.8rem;
  }

  .ar-field {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.5rem 0.7rem;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.04);
  }

  .ar-field-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #555a6e;
    font-weight: 500;
  }

  .ar-field-value {
    font-size: 0.85rem;
    color: #c8cbd3;
    font-weight: 400;
    word-break: break-all;
  }

  /* ── Request ID ── */
  .ar-request-id {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .ar-id-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #44475a;
    font-weight: 600;
  }

  .ar-id-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.72rem;
    color: #555a6e;
    background: rgba(255, 255, 255, 0.03);
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.04);
  }

  /* ── Divider ── */
  .ar-divider {
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.06) 20%,
      rgba(255, 255, 255, 0.06) 80%,
      transparent
    );
    margin-bottom: 1.25rem;
  }

  /* ── Form ── */
  .ar-form-grid {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    margin-bottom: 1.25rem;
  }

  .ar-form-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .ar-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6b7084;
    font-weight: 600;
  }

  .ar-select-wrap {
    position: relative;
  }

  .ar-select {
    width: 100%;
    appearance: none;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 0.6rem 2.2rem 0.6rem 0.85rem;
    font-size: 0.85rem;
    color: #c8cbd3;
    font-family: "DM Sans", system-ui, sans-serif;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      background 0.15s ease;
    outline: none;
  }

  .ar-select:hover {
    border-color: rgba(99, 132, 255, 0.25);
    background: rgba(255, 255, 255, 0.04);
  }

  .ar-select:focus {
    border-color: rgba(99, 132, 255, 0.4);
    box-shadow: 0 0 0 3px rgba(99, 132, 255, 0.08);
  }

  .ar-select option {
    background: #1a1d26;
    color: #c8cbd3;
  }

  .ar-select-chevron {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: #555a6e;
  }

  .ar-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 0.6rem 0.85rem;
    font-size: 0.85rem;
    color: #c8cbd3;
    font-family: "JetBrains Mono", monospace;
    outline: none;
    transition:
      border-color 0.15s ease,
      background 0.15s ease;
    box-sizing: border-box;
  }

  .ar-input::placeholder {
    color: #44475a;
  }

  .ar-input:hover {
    border-color: rgba(99, 132, 255, 0.25);
  }

  .ar-input:focus {
    border-color: rgba(99, 132, 255, 0.4);
    box-shadow: 0 0 0 3px rgba(99, 132, 255, 0.08);
  }

  /* ── Slide-in animation for conditional fields ── */
  .ar-slide-in {
    animation: ar-slide 0.25s ease-out;
  }

  @keyframes ar-slide {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ── Actions ── */
  .ar-form-actions {
    display: flex;
    justify-content: flex-end;
  }

  .ar-btn-approve {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.4rem;
    font-size: 0.85rem;
    font-weight: 600;
    font-family: "DM Sans", system-ui, sans-serif;
    color: #0c0e13;
    background: linear-gradient(135deg, #6ee7a0, #3abf72);
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition:
      transform 0.12s ease,
      box-shadow 0.2s ease,
      filter 0.15s ease;
    letter-spacing: 0.01em;
  }

  .ar-btn-approve:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(58, 191, 114, 0.25);
    filter: brightness(1.05);
  }

  .ar-btn-approve:active {
    transform: translateY(0);
    filter: brightness(0.95);
  }

  /* ── Responsive ── */
  @media (max-width: 600px) {
    .ar-root {
      padding: 1.25rem 0.75rem 3rem;
    }

    .ar-header {
      flex-direction: column;
      gap: 0.75rem;
    }

    .ar-card {
      padding: 1.15rem;
    }

    .ar-payload {
      grid-template-columns: 1fr;
    }
  }
</style>
