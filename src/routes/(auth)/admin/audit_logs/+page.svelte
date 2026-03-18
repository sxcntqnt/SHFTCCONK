<script lang="ts">
  /**
   * /admin/audit_logs/+page.svelte
   *
   * Changes from previous version:
   *   - Full dark theme matching /admin/actor_requests aesthetic
   *   - event_type filter is now a <select> with real options
   *   - performed_by resolved to full_name via profileMap
   *   - details rendered as formatted key→value pills, not raw JSON.stringify
   *   - Cursor pagination (prev / next / page X of Y)
   *   - Event type color-coded by category (approve=green, reject=red, etc.)
   *   - Copy-to-clipboard on UUID cells
   */

  type LogRow = {
    id: string
    event_type: string
    actor_id: string | null
    profile_id: string | null
    performed_by: string | null
    details: Record<string, unknown> | null
    created_at: string
    performer: { full_name: string | null; avatar_url: string | null } | null
  }

  type Data = {
    logs: LogRow[]
    profileMap: Record<string, string>
    eventTypes: string[]
    totalCount: number
    page: number
    totalPages: number
    filters: {
      eventType: string | null
      performedBy: string | null
      from: string | null
      to: string | null
    }
  }

  let { data }: { data: Data } = $props()

  // ── Helpers ──────────────────────────────────────────────────

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString("en-KE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function parseDetails(
    details: Record<string, unknown> | null,
  ): { label: string; value: string }[] {
    if (!details || typeof details !== "object") return []
    return Object.entries(details).map(([k, v]) => ({
      label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: typeof v === "object" ? JSON.stringify(v) : String(v),
    }))
  }

  type EventCategory =
    | "approve"
    | "reject"
    | "create"
    | "deactivate"
    | "system"
    | "default"

  function eventCategory(type: string): EventCategory {
    if (type.includes("approved") || type.includes("activated"))
      return "approve"
    if (type.includes("rejected") || type.includes("denied")) return "reject"
    if (type.includes("created") || type.includes("invited")) return "create"
    if (type.includes("deactivated") || type.includes("removed"))
      return "deactivate"
    if (type.includes("system") || type.includes("bootstrap")) return "system"
    return "default"
  }

  const categoryColors: Record<
    EventCategory,
    { dot: string; text: string; bg: string; border: string }
  > = {
    approve: {
      dot: "#4ade80",
      text: "#86efac",
      bg: "rgba(74,222,128,.08)",
      border: "rgba(74,222,128,.15)",
    },
    reject: {
      dot: "#f87171",
      text: "#fca5a5",
      bg: "rgba(248,113,113,.08)",
      border: "rgba(248,113,113,.15)",
    },
    create: {
      dot: "#60a5fa",
      text: "#93c5fd",
      bg: "rgba(96,165,250,.08)",
      border: "rgba(96,165,250,.15)",
    },
    deactivate: {
      dot: "#fb923c",
      text: "#fdba74",
      bg: "rgba(251,146,60,.08)",
      border: "rgba(251,146,60,.15)",
    },
    system: {
      dot: "#a78bfa",
      text: "#c4b5fd",
      bg: "rgba(167,139,250,.08)",
      border: "rgba(167,139,250,.15)",
    },
    default: {
      dot: "#94a3b8",
      text: "#cbd5e1",
      bg: "rgba(148,163,184,.06)",
      border: "rgba(148,163,184,.1)",
    },
  }

  function resolvePerformer(log: LogRow): string {
    if (log.performer?.full_name) return log.performer.full_name
    if (log.performed_by && data.profileMap[log.performed_by])
      return data.profileMap[log.performed_by]
    if (log.performed_by) return log.performed_by.slice(0, 8) + "…"
    return "System"
  }

  function initials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  let copied: Record<string, boolean> = $state({})
  function copyId(id: string, key: string) {
    navigator.clipboard.writeText(id).then(() => {
      copied[key] = true
      setTimeout(() => {
        copied[key] = false
      }, 1500)
    })
  }

  // Page navigation helpers
  function pageUrl(p: number): string {
    const params = new URLSearchParams()
    if (data.filters.eventType) params.set("event_type", data.filters.eventType)
    if (data.filters.performedBy)
      params.set("performed_by", data.filters.performedBy)
    if (data.filters.from) params.set("from", data.filters.from)
    if (data.filters.to) params.set("to", data.filters.to)
    params.set("page", String(p))
    return `?${params.toString()}`
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

<div class="al-root">
  <div class="al-bg-glow"></div>

  <div class="al-container">
    <!-- Header -->
    <header class="al-header">
      <div class="al-header-left">
        <div class="al-icon-badge">
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
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <div>
          <h1 class="al-title">Audit Logs</h1>
          <p class="al-subtitle">
            Platform event history — all actor and permission changes
          </p>
        </div>
      </div>
      <div class="al-count-badge">
        <span class="al-count-dot"></span>
        {data.totalCount.toLocaleString()} events
      </div>
    </header>

    <!-- Filter bar -->
    <form method="get" class="al-filters">
      <div class="al-filter-group">
        <label class="al-filter-label" for="event_type_filter">Event Type</label
        >
        <div class="al-select-wrap">
          <select id="event_type_filter" name="event_type" class="al-select">
            <option value="">All events</option>
            {#each data.eventTypes as et}
              <option value={et} selected={data.filters.eventType === et}
                >{et}</option
              >
            {/each}
          </select>
          <svg
            class="al-select-chevron"
            width="14"
            height="14"
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

      <div class="al-filter-group">
        <label class="al-filter-label" for="from_filter">From</label>
        <input
          id="from_filter"
          name="from"
          type="date"
          class="al-input"
          value={data.filters.from ?? ""}
        />
      </div>

      <div class="al-filter-group">
        <label class="al-filter-label" for="to_filter">To</label>
        <input
          id="to_filter"
          name="to"
          type="date"
          class="al-input"
          value={data.filters.to ?? ""}
        />
      </div>

      <input type="hidden" name="page" value="1" />

      <div class="al-filter-actions">
        <button type="submit" class="al-btn-filter">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="22" y1="3" x2="2" y2="3" /><line
              x1="17"
              y1="8"
              x2="7"
              y2="8"
            />
            <line x1="14" y1="13" x2="10" y2="13" />
          </svg>
          Apply
        </button>
        {#if data.filters.eventType || data.filters.performedBy || data.filters.from || data.filters.to}
          <a href="/admin/audit_logs" class="al-btn-clear">Clear</a>
        {/if}
      </div>
    </form>

    <!-- Empty state -->
    {#if data.logs.length === 0}
      <div class="al-empty">
        <div class="al-empty-icon">
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8" /><line
              x1="21"
              y1="21"
              x2="16.65"
              y2="16.65"
            />
          </svg>
        </div>
        <h2 class="al-empty-title">No events found</h2>
        <p class="al-empty-text">
          Try clearing the filters or widening the date range.
        </p>
      </div>
    {:else}
      <!-- Log rows -->
      <div class="al-list">
        {#each data.logs as log, i}
          {@const cat = eventCategory(log.event_type)}
          {@const colors = categoryColors[cat]}
          {@const details = parseDetails(log.details)}
          {@const performer = resolvePerformer(log)}

          <div class="al-row" style="animation-delay: {i * 30}ms">
            <!-- Left: event type dot + name -->
            <div class="al-row-type">
              <span
                class="al-event-badge"
                style="color:{colors.text}; background:{colors.bg}; border-color:{colors.border}"
              >
                <span class="al-event-dot" style="background:{colors.dot}"
                ></span>
                {log.event_type}
              </span>
              <span class="al-time" title={formatDate(log.created_at)}>
                {timeAgo(log.created_at)}
              </span>
            </div>

            <!-- Middle: who did it -->
            <div class="al-row-actor">
              <div class="al-mini-avatar">
                {#if log.performer?.avatar_url}
                  <img
                    src={log.performer.avatar_url}
                    alt={performer}
                    class="al-mini-avatar-img"
                  />
                {:else}
                  <span class="al-mini-avatar-initials"
                    >{initials(performer)}</span
                  >
                {/if}
              </div>
              <div class="al-actor-info">
                <span class="al-actor-name">{performer}</span>
                {#if log.actor_id}
                  <button
                    type="button"
                    class="al-uuid-chip"
                    onclick={() => copyId(log.actor_id!, "actor_" + log.id)}
                    title="Copy actor ID"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      {#if copied["actor_" + log.id]}
                        <polyline points="20 6 9 17 4 12" />
                      {:else}
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          ry="2"
                        />
                        <path
                          d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                        />
                      {/if}
                    </svg>
                    {copied["actor_" + log.id]
                      ? "Copied"
                      : log.actor_id.slice(0, 8) + "…"}
                  </button>
                {/if}
              </div>
            </div>

            <!-- Right: details pills -->
            <div class="al-row-details">
              {#if details.length > 0}
                {#each details.slice(0, 4) as d}
                  <div class="al-detail-pill">
                    <span class="al-detail-key">{d.label}</span>
                    <span class="al-detail-val"
                      >{d.value.length > 40
                        ? d.value.slice(0, 40) + "…"
                        : d.value}</span
                    >
                  </div>
                {/each}
                {#if details.length > 4}
                  <span class="al-detail-more">+{details.length - 4} more</span>
                {/if}
              {:else}
                <span class="al-no-details">—</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <!-- Pagination -->
      {#if data.totalPages > 1}
        <div class="al-pagination">
          <a
            href={pageUrl(data.page - 1)}
            class="al-page-btn"
            class:al-page-btn-disabled={data.page <= 1}
            aria-disabled={data.page <= 1}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Prev
          </a>

          <span class="al-page-info">
            Page <strong>{data.page}</strong> of
            <strong>{data.totalPages}</strong>
            <span class="al-page-total"
              >({data.totalCount.toLocaleString()} events)</span
            >
          </span>

          <a
            href={pageUrl(data.page + 1)}
            class="al-page-btn"
            class:al-page-btn-disabled={data.page >= data.totalPages}
            aria-disabled={data.page >= data.totalPages}
          >
            Next
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  :global(body) {
    font-family: "DM Sans", system-ui, sans-serif;
  }

  .al-root {
    position: relative;
    min-height: 100vh;
    background: #0c0e13;
    color: #e2e4e9;
    padding: 2rem 1rem 4rem;
    overflow: hidden;
  }
  .al-bg-glow {
    position: fixed;
    top: -20%;
    left: 50%;
    transform: translateX(-50%);
    width: 900px;
    height: 500px;
    background: radial-gradient(
      ellipse,
      rgba(167, 139, 250, 0.05) 0%,
      transparent 70%
    );
    pointer-events: none;
    z-index: 0;
  }
  .al-container {
    position: relative;
    z-index: 1;
    max-width: 1100px;
    margin: 0 auto;
  }

  /* Header */
  .al-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 1.75rem;
    gap: 1rem;
  }
  .al-header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .al-icon-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    flex-shrink: 0;
    background: linear-gradient(
      135deg,
      rgba(167, 139, 250, 0.15),
      rgba(167, 139, 250, 0.05)
    );
    border: 1px solid rgba(167, 139, 250, 0.2);
    color: #c4b5fd;
  }
  .al-title {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #f0f1f4;
    margin: 0;
  }
  .al-subtitle {
    font-size: 0.82rem;
    color: #6b7084;
    margin: 0.2rem 0 0;
  }
  .al-count-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
    font-size: 0.8rem;
    font-weight: 500;
    color: #a78bfa;
    background: rgba(167, 139, 250, 0.08);
    border: 1px solid rgba(167, 139, 250, 0.18);
    border-radius: 100px;
    padding: 0.35rem 0.85rem;
  }
  .al-count-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #a78bfa;
    animation: al-pulse 2s ease-in-out infinite;
  }
  @keyframes al-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  /* Filter bar */
  .al-filters {
    display: flex;
    align-items: flex-end;
    gap: 0.85rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
    padding: 1.1rem 1.25rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 14px;
  }
  .al-filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    flex: 1;
    min-width: 160px;
  }
  .al-filter-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #555a6e;
    font-weight: 600;
  }
  .al-select-wrap {
    position: relative;
  }
  .al-select {
    width: 100%;
    appearance: none;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 9px;
    padding: 0.55rem 2rem 0.55rem 0.75rem;
    font-size: 0.82rem;
    color: #c8cbd3;
    font-family: "DM Sans", system-ui, sans-serif;
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s;
  }
  .al-select:focus {
    border-color: rgba(167, 139, 250, 0.4);
    box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.08);
  }
  .al-select option {
    background: #1a1d26;
  }
  .al-select-chevron {
    position: absolute;
    right: 0.65rem;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: #555a6e;
  }
  .al-input {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 9px;
    padding: 0.55rem 0.75rem;
    font-size: 0.82rem;
    color: #c8cbd3;
    font-family: "DM Sans", system-ui, sans-serif;
    outline: none;
    transition: border-color 0.15s;
    width: 100%;
    box-sizing: border-box;
  }
  .al-input:focus {
    border-color: rgba(167, 139, 250, 0.4);
    box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.08);
  }
  .al-filter-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding-bottom: 0.05rem;
  }
  .al-btn-filter {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    font-size: 0.82rem;
    font-weight: 600;
    font-family: "DM Sans", system-ui, sans-serif;
    color: #0c0e13;
    background: linear-gradient(135deg, #c4b5fd, #a78bfa);
    border: none;
    border-radius: 9px;
    cursor: pointer;
    transition: filter 0.15s;
  }
  .al-btn-filter:hover {
    filter: brightness(1.08);
  }
  .al-btn-clear {
    padding: 0.5rem 0.9rem;
    font-size: 0.78rem;
    color: #6b7084;
    text-decoration: none;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 9px;
    transition:
      color 0.15s,
      border-color 0.15s;
  }
  .al-btn-clear:hover {
    color: #c8cbd3;
    border-color: rgba(255, 255, 255, 0.14);
  }

  /* Empty */
  .al-empty {
    text-align: center;
    padding: 4rem 2rem;
  }
  .al-empty-icon {
    color: #3d4158;
    margin-bottom: 1rem;
  }
  .al-empty-title {
    font-size: 1.2rem;
    font-weight: 600;
    color: #d1d5db;
    margin: 0 0 0.4rem;
  }
  .al-empty-text {
    font-size: 0.88rem;
    color: #6b7084;
    margin: 0;
  }

  /* Log rows */
  .al-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .al-row {
    display: grid;
    grid-template-columns: 1fr 1fr 2fr;
    gap: 1rem;
    align-items: center;
    padding: 0.9rem 1.1rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 11px;
    animation: al-row-in 0.35s ease-out both;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .al-row:hover {
    background: rgba(255, 255, 255, 0.035);
    border-color: rgba(255, 255, 255, 0.09);
  }
  @keyframes al-row-in {
    from {
      opacity: 0;
      transform: translateX(-8px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* Event type */
  .al-row-type {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .al-event-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    font-weight: 600;
    font-family: "JetBrains Mono", monospace;
    padding: 0.28rem 0.65rem;
    border-radius: 7px;
    border: 1px solid;
    letter-spacing: 0.01em;
    width: fit-content;
  }
  .al-event-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .al-time {
    font-size: 0.72rem;
    color: #44475a;
  }

  /* Actor / performer */
  .al-row-actor {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .al-mini-avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    flex-shrink: 0;
    background: rgba(167, 139, 250, 0.12);
    border: 1px solid rgba(167, 139, 250, 0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .al-mini-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .al-mini-avatar-initials {
    font-size: 0.65rem;
    font-weight: 700;
    color: #c4b5fd;
  }
  .al-actor-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }
  .al-actor-name {
    font-size: 0.82rem;
    font-weight: 500;
    color: #d4d7e0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .al-uuid-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.65rem;
    font-family: "JetBrains Mono", monospace;
    color: #44475a;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 0.15rem 0.45rem;
    border-radius: 5px;
    cursor: pointer;
    transition:
      color 0.15s,
      border-color 0.15s;
    width: fit-content;
  }
  .al-uuid-chip:hover {
    color: #c4b5fd;
    border-color: rgba(167, 139, 250, 0.2);
  }

  /* Details */
  .al-row-details {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }
  .al-detail-pill {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.22rem 0.55rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 6px;
  }
  .al-detail-key {
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #44475a;
    font-weight: 600;
  }
  .al-detail-val {
    font-size: 0.75rem;
    color: #9aa0b4;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .al-detail-more {
    font-size: 0.7rem;
    color: #44475a;
    font-style: italic;
  }
  .al-no-details {
    font-size: 0.78rem;
    color: #2e3040;
  }

  /* Pagination */
  .al-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    margin-top: 2rem;
  }
  .al-page-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    font-size: 0.82rem;
    font-weight: 500;
    text-decoration: none;
    color: #c8cbd3;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 9px;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .al-page-btn:hover:not(.al-page-btn-disabled) {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.14);
  }
  .al-page-btn-disabled {
    opacity: 0.3;
    pointer-events: none;
  }
  .al-page-info {
    font-size: 0.82rem;
    color: #6b7084;
  }
  .al-page-info strong {
    color: #c8cbd3;
  }
  .al-page-total {
    margin-left: 0.35rem;
    color: #44475a;
  }

  @media (max-width: 768px) {
    .al-row {
      grid-template-columns: 1fr;
      gap: 0.65rem;
    }
    .al-filters {
      flex-direction: column;
    }
    .al-filter-group {
      min-width: 100%;
    }
  }
</style>
