<!-- src/routes/(auth)/admin/dlq/[orgId]/+page.svelte -->
<script lang="ts">
  import { goto } from "$app/navigation"
  import { page } from "$app/stores"
  import type { DLQEvent, DLQSummary } from "./+page.server"

  interface Props {
    data: {
      orgId: string
      orgName: string
      events: DLQEvent[]
      summary: DLQSummary
      page: number
      perPage: number
      totalPages: number
      filterError: string | null
    }
  }

  let { data }: Props = $props()
  const { orgId, orgName, events, summary, totalPages, filterError } = data

  // ── Selection ─────────────────────────────────────────────────────────────
  let selected = $state<Set<string>>(new Set())
  let selectAll = $state(false)
  let submitting = $state<"replay" | "discard" | null>(null)
  let expandedId = $state<string | null>(null)
  let confirmMode = $state<"replay" | "discard" | null>(null)

  // Result state from fetch calls
  let resultMsg = $state<{ type: "success" | "error"; text: string } | null>(
    null,
  )

  function toggleSelect(id: string) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    selected = next
    selectAll = next.size === events.length && events.length > 0
  }

  function toggleAll() {
    if (selectAll) {
      selected = new Set()
      selectAll = false
    } else {
      selected = new Set(events.map((e) => e.id))
      selectAll = true
    }
  }

  // ── API calls ─────────────────────────────────────────────────────────────

  async function replaySelected() {
    if (!selected.size) return
    submitting = "replay"
    confirmMode = null
    resultMsg = null

    try {
      const res = await fetch(`/admin/dlq/${orgId}/replay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error ?? "Replay failed")

      resultMsg = {
        type: "success",
        text: `${json.replayed} event${json.replayed !== 1 ? "s" : ""} queued for replay.`,
      }
      selected = new Set()
      selectAll = false
      // Refresh the page data without a full navigation
      goto($page.url.pathname + $page.url.search, { invalidateAll: true })
    } catch (err) {
      resultMsg = {
        type: "error",
        text: err instanceof Error ? err.message : "Replay failed",
      }
    } finally {
      submitting = null
    }
  }

  async function discardSelected() {
    if (!selected.size) return
    submitting = "discard"
    confirmMode = null
    resultMsg = null

    // Discard each event individually via DELETE /admin/dlq/{orgId}/{eventId}
    const ids = [...selected]
    let failed = 0
    let discarded = 0

    for (const id of ids) {
      try {
        const res = await fetch(
          `/admin/dlq/${orgId}/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
          },
        )
        if (res.ok) discarded++
        else failed++
      } catch {
        failed++
      }
    }

    resultMsg =
      discarded > 0
        ? {
            type: "success",
            text: `${discarded} event${discarded !== 1 ? "s" : ""} permanently discarded.${failed > 0 ? ` ${failed} failed.` : ""}`,
          }
        : {
            type: "error",
            text: `All ${failed} deletions failed. Check console.`,
          }

    selected = new Set()
    selectAll = false
    submitting = null
    goto($page.url.pathname + $page.url.search, { invalidateAll: true })
  }

  async function discardSingle(id: string) {
    submitting = "discard"
    resultMsg = null

    try {
      const res = await fetch(`/admin/dlq/${orgId}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Discard failed")
      resultMsg = { type: "success", text: "Event permanently discarded." }
      expandedId = null
      goto($page.url.pathname + $page.url.search, { invalidateAll: true })
    } catch (err) {
      resultMsg = {
        type: "error",
        text: err instanceof Error ? err.message : "Discard failed",
      }
    } finally {
      submitting = null
    }
  }

  async function replaySingle(id: string) {
    submitting = "replay"
    resultMsg = null

    try {
      const res = await fetch(`/admin/dlq/${orgId}/replay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Replay failed")
      resultMsg = { type: "success", text: "Event queued for replay." }
      goto($page.url.pathname + $page.url.search, { invalidateAll: true })
    } catch (err) {
      resultMsg = {
        type: "error",
        text: err instanceof Error ? err.message : "Replay failed",
      }
    } finally {
      submitting = null
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const FIX_LABELS: Record<number, string> = {
    0: "NO FIX",
    2: "2D FIX",
    3: "3D FIX",
  }
  const FIX_COLORS: Record<number, string> = {
    0: "#f87171",
    2: "#facc15",
    3: "#4ade80",
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleString("en-KE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const h = diff / 3_600_000
    if (h < 1) return `${Math.floor(diff / 60_000)}m ago`
    if (h < 24) return `${Math.floor(h)}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  function truncErr(err: string) {
    return err.length > 60 ? err.slice(0, 60) + "…" : err
  }

  function filterByError(err: string) {
    const u = new URL($page.url)
    u.searchParams.set("error", err.split(":")[0].trim())
    u.searchParams.set("page", "1")
    goto(u.toString())
  }

  function clearFilter() {
    const u = new URL($page.url)
    u.searchParams.delete("error")
    goto(u.toString())
  }
</script>

<svelte:head><title>DLQ — {orgName} — Matatu Pulse Admin</title></svelte:head>

<!-- ── Confirm modal ──────────────────────────────────────────────────────── -->
{#if confirmMode}
  <div class="modal-backdrop" onclick={() => (confirmMode = null)}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-hd">
        <div
          class="modal-ey"
          style="color:{confirmMode === 'discard' ? '#f87171' : 'var(--teal)'}"
        >
          {confirmMode === "discard"
            ? "⚠ DESTRUCTIVE ACTION"
            : "CONFIRM REPLAY"}
        </div>
        <div class="modal-ti">
          {confirmMode === "discard"
            ? "Permanently Discard Events?"
            : "Replay Events?"}
        </div>
      </div>
      <div class="modal-body">
        <p class="modal-desc">
          {#if confirmMode === "discard"}
            You are about to <strong>permanently delete</strong>
            {selected.size}
            event{selected.size !== 1 ? "s" : ""} from the dead letter queue. This
            cannot be undone. The original GPS data will be lost.
          {:else}
            {selected.size} event{selected.size !== 1 ? "s" : ""} will be re-queued
            into the batch writer pipeline. If the underlying issue is not resolved,
            they will fail again and return to the DLQ.
          {/if}
        </p>
      </div>
      <div class="modal-ft">
        <button class="btn-cancel" onclick={() => (confirmMode = null)}
          >Cancel</button
        >
        <button
          class="btn-confirm {confirmMode === 'discard' ? 'danger' : 'safe'}"
          disabled={submitting !== null}
          onclick={() =>
            confirmMode === "discard" ? discardSelected() : replaySelected()}
        >
          {#if submitting}
            <span class="spin"></span>
            {confirmMode === "discard" ? "Discarding…" : "Replaying…"}
          {:else}
            {confirmMode === "discard" ? "Yes, Discard" : "Yes, Replay"}
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ── Page ────────────────────────────────────────────────────────────────── -->
<div class="content">
  <!-- Breadcrumb -->
  <div class="breadcrumb">
    <a href="/admin/dashboard">Admin</a>
    <span class="sep">›</span>
    <a href="/admin/dlq">Dead Letter Queue</a>
    <span class="sep">›</span>
    <span class="crumb-cur">{orgName}</span>
  </div>

  <!-- Result banner -->
  {#if resultMsg}
    <div class="banner {resultMsg.type}">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        {#if resultMsg.type === "success"}
          <polyline points="20 6 9 17 4 12" />
        {:else}
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" /><line
            x1="12"
            y1="16"
            x2="12.01"
            y2="16"
          />
        {/if}
      </svg>
      {resultMsg.text}
      <button class="banner-close" onclick={() => (resultMsg = null)}>✕</button>
    </div>
  {/if}

  <!-- Header -->
  <div class="page-hd">
    <div>
      <div class="eyebrow">
        <span class="blink-dot"></span>
        GPS PIPELINE · DEAD LETTER QUEUE
      </div>
      <h1 class="page-title">{orgName}</h1>
      <p class="page-sub">
        Events that failed 3 batch write attempts. Inspect, replay, or discard.
      </p>
    </div>
    <a href="/admin/dlq" class="back-btn">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
      All Orgs
    </a>
  </div>

  <!-- Stats -->
  <div class="stat-strip">
    <div class="stat {summary.totalEvents > 0 ? 'warn' : 'ok'}">
      <div class="stat-val">{summary.totalEvents.toLocaleString()}</div>
      <div class="stat-lbl">Total Events</div>
    </div>
    <div class="stat">
      <div class="stat-val">
        {summary.oldestEvent ? timeAgo(summary.oldestEvent) : "—"}
      </div>
      <div class="stat-lbl">Oldest Event</div>
    </div>
    <div class="stat">
      <div class="stat-val">
        {summary.newestEvent ? timeAgo(summary.newestEvent) : "—"}
      </div>
      <div class="stat-lbl">Most Recent</div>
    </div>
    <div class="stat">
      <div class="stat-val">{summary.errorBreakdown.length}</div>
      <div class="stat-lbl">Distinct Errors</div>
    </div>
  </div>

  <!-- Error pills -->
  {#if summary.errorBreakdown.length > 0}
    <div class="error-strip">
      <span class="strip-lbl">Errors:</span>
      {#each summary.errorBreakdown as eb}
        <button
          class="err-pill {filterError === eb.error.split(':')[0].trim()
            ? 'active'
            : ''}"
          onclick={() => filterByError(eb.error)}
        >
          {eb.error.split(":")[0].trim()}
          <span class="err-cnt">{eb.count}</span>
        </button>
      {/each}
      {#if filterError}
        <button class="clear-filter" onclick={clearFilter}>✕ Clear</button>
      {/if}
    </div>
  {/if}

  <!-- Table -->
  <div class="table-card">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <label class="select-all-wrap">
          <input
            type="checkbox"
            class="cb"
            checked={selectAll}
            onchange={toggleAll}
          />
          <span class="cb-label"
            >{selected.size > 0
              ? `${selected.size} selected`
              : "Select all"}</span
          >
        </label>

        {#if selected.size > 0}
          <div class="action-row">
            <button
              class="action-btn replay"
              onclick={() => (confirmMode = "replay")}
              disabled={submitting !== null}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
              </svg>
              Replay {selected.size}
            </button>
            <button
              class="action-btn discard"
              onclick={() => (confirmMode = "discard")}
              disabled={submitting !== null}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path
                  d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"
                />
              </svg>
              Discard {selected.size}
            </button>
          </div>
        {/if}
      </div>
      <span class="event-count"
        >{summary.totalEvents.toLocaleString()} events{filterError
          ? " · filtered"
          : ""}</span
      >
    </div>

    <!-- Column headers -->
    <div class="col-hd">
      <div class="col cb-col"></div>
      <div class="col id-col">Stream ID</div>
      <div class="col veh-col">Vehicle</div>
      <div class="col pos-col">Position</div>
      <div class="col err-col">Error</div>
      <div class="col att-col">Attempts</div>
      <div class="col age-col">Failed</div>
      <div class="col act-col"></div>
    </div>

    {#if events.length === 0}
      <div class="empty">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1"
          opacity="0.15"
        >
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline
            points="22 4 12 14.01 9 11.01"
          />
        </svg>
        <div class="empty-ti">No events in dead letter queue</div>
        <div class="empty-sub">
          {filterError
            ? "Try clearing the filter."
            : "All GPS events are processing successfully."}
        </div>
      </div>
    {:else}
      <div class="rows">
        {#each events as ev}
          {@const isSelected = selected.has(ev.id)}
          {@const isExpanded = expandedId === ev.id}
          {@const fixColor =
            ev.fixStatus != null
              ? (FIX_COLORS[ev.fixStatus] ?? "#888")
              : "#888"}
          {@const fixLabel =
            ev.fixStatus != null ? (FIX_LABELS[ev.fixStatus] ?? "?") : "?"}

          <div
            class="row-wrap {isSelected ? 'sel' : ''} {isExpanded ? 'exp' : ''}"
          >
            <div class="row">
              <div class="col cb-col">
                <input
                  type="checkbox"
                  class="cb"
                  checked={isSelected}
                  onchange={() => toggleSelect(ev.id)}
                />
              </div>
              <div class="col id-col">
                <span class="mono-sm">{ev.id.split("-")[0]}</span>
                <span class="mono-dim">-{ev.id.split("-")[1]}</span>
              </div>
              <div class="col veh-col">
                <div class="veh-id">{ev.vehicleId.slice(0, 12)}…</div>
              </div>
              <div class="col pos-col">
                <div class="pos-coords">
                  {ev.lat.toFixed(5)}, {ev.lng.toFixed(5)}
                </div>
                <div
                  class="fix-badge"
                  style="color:{fixColor}; border-color:{fixColor}30; background:{fixColor}10"
                >
                  {fixLabel}
                </div>
              </div>
              <div class="col err-col">
                <button
                  class="err-text"
                  title={ev.error}
                  onclick={() => filterByError(ev.error)}
                >
                  {truncErr(ev.error)}
                </button>
              </div>
              <div class="col att-col">
                <div class="attempts {ev.attempts >= 3 ? 'max' : ''}">
                  {ev.attempts} / 3
                </div>
              </div>
              <div class="col age-col">
                <div class="age-val">{timeAgo(ev.failedAt)}</div>
                <div class="age-sub">{fmtDate(ev.failedAt)}</div>
              </div>
              <div class="col act-col">
                <button
                  class="row-expand {isExpanded ? 'open' : ''}"
                  onclick={() => (expandedId = isExpanded ? null : ev.id)}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline
                      points={isExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}
                    />
                  </svg>
                </button>
              </div>
            </div>

            {#if isExpanded}
              <div class="detail">
                <div class="detail-grid">
                  <div class="detail-block">
                    <div class="detail-lbl">Vehicle ID</div>
                    <div class="detail-val mono">{ev.vehicleId}</div>
                  </div>
                  <div class="detail-block">
                    <div class="detail-lbl">Stream ID</div>
                    <div class="detail-val mono">{ev.id}</div>
                  </div>
                  <div class="detail-block">
                    <div class="detail-lbl">Device Timestamp</div>
                    <div class="detail-val">{fmtDate(ev.timestamp)}</div>
                  </div>
                  <div class="detail-block">
                    <div class="detail-lbl">Speed</div>
                    <div class="detail-val">
                      {ev.speed != null ? `${ev.speed} km/h` : "—"}
                    </div>
                  </div>
                  <div class="detail-block">
                    <div class="detail-lbl">Heading</div>
                    <div class="detail-val">
                      {ev.heading != null ? `${ev.heading}°` : "—"}
                    </div>
                  </div>
                  <div class="detail-block">
                    <div class="detail-lbl">Attempts</div>
                    <div class="detail-val">{ev.attempts}</div>
                  </div>
                </div>

                <div class="detail-err">
                  <div class="detail-lbl">Error</div>
                  <div class="err-full">{ev.error}</div>
                </div>

                <div class="detail-raw">
                  <div class="detail-lbl">Original Event</div>
                  <pre class="raw-pre">{JSON.stringify(
                      JSON.parse(ev.originalEvent),
                      null,
                      2,
                    )}</pre>
                </div>

                <div class="detail-actions">
                  <button
                    class="det-btn replay"
                    disabled={submitting !== null}
                    onclick={() => replaySingle(ev.id)}
                  >
                    {#if submitting === "replay"}
                      <span class="spin-sm"></span>
                    {:else}
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                      >
                        <polyline points="1 4 1 10 7 10" /><path
                          d="M3.51 15a9 9 0 102.13-9.36L1 10"
                        />
                      </svg>
                    {/if}
                    Replay this event
                  </button>

                  <button
                    class="det-btn discard"
                    disabled={submitting !== null}
                    onclick={() => discardSingle(ev.id)}
                  >
                    {#if submitting === "discard"}
                      <span class="spin-sm"></span>
                    {:else}
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path
                          d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"
                        />
                      </svg>
                    {/if}
                    Discard permanently
                  </button>

                  <a
                    href="https://maps.google.com/?q={ev.lat},{ev.lng}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="det-btn map"
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    View on map
                  </a>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    {#if totalPages > 1}
      <div class="pagination">
        {#each Array.from({ length: totalPages }, (_, i) => i + 1) as pg}
          <a
            href="?page={pg}{filterError
              ? `&error=${encodeURIComponent(filterError)}`
              : ''}"
            class="pg-btn {pg === data.page ? 'cur' : ''}">{pg}</a
          >
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .content {
    flex: 1;
    padding: 32px 40px;
    font-family: var(--font-body);
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.7rem;
    color: var(--text-3);
    margin-bottom: 20px;
  }
  .breadcrumb a {
    color: var(--teal);
    text-decoration: none;
  }
  .breadcrumb a:hover {
    text-decoration: underline;
  }
  .sep {
    opacity: 0.4;
  }
  .crumb-cur {
    color: var(--text-2);
    font-weight: 600;
  }

  .banner {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 11px 16px;
    border-radius: 12px;
    margin-bottom: 20px;
    font-size: 0.8rem;
    font-weight: 600;
  }
  .banner.success {
    background: rgba(0, 176, 155, 0.08);
    border: 1px solid rgba(0, 176, 155, 0.22);
    color: var(--teal);
  }
  .banner.error {
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.22);
    color: #f87171;
  }
  .banner-close {
    margin-left: auto;
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    opacity: 0.6;
    font-size: 0.8rem;
  }
  .banner-close:hover {
    opacity: 1;
  }

  .page-hd {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 22px;
  }
  .eyebrow {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #f87171;
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 6px;
  }
  .blink-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #f87171;
    animation: blink 1.2s ease-in-out infinite;
  }
  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.2;
    }
  }
  .page-title {
    font-family: var(--font-display);
    font-size: clamp(1.4rem, 2vw, 1.9rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  .page-sub {
    font-size: 0.82rem;
    color: var(--text-3);
  }
  .back-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 0.76rem;
    font-weight: 600;
    color: var(--text-2);
    text-decoration: none;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .back-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-1);
  }

  .stat-strip {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 14px;
  }
  .stat {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--rim);
    border-radius: 14px;
    padding: 16px;
  }
  .stat.warn {
    border-color: rgba(248, 113, 113, 0.25);
    background: rgba(248, 113, 113, 0.04);
  }
  .stat.ok {
    border-color: rgba(0, 176, 155, 0.2);
    background: rgba(0, 176, 155, 0.04);
  }
  .stat-val {
    font-family: var(--font-display);
    font-size: 1.6rem;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1;
  }
  .stat.warn .stat-val {
    color: #f87171;
  }
  .stat.ok .stat-val {
    color: var(--teal);
  }
  .stat-lbl {
    font-size: 0.6rem;
    color: var(--text-3);
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
  }

  .error-strip {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
  }
  .strip-lbl {
    font-size: 0.64rem;
    font-weight: 700;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .err-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 100px;
    background: rgba(248, 113, 113, 0.07);
    border: 1px solid rgba(248, 113, 113, 0.18);
    font-size: 0.65rem;
    font-weight: 600;
    color: #f87171;
    cursor: pointer;
    transition: all 0.15s;
  }
  .err-pill:hover,
  .err-pill.active {
    background: rgba(248, 113, 113, 0.15);
    border-color: rgba(248, 113, 113, 0.35);
  }
  .err-cnt {
    background: rgba(248, 113, 113, 0.2);
    border-radius: 100px;
    padding: 1px 5px;
    font-size: 0.58rem;
    font-weight: 800;
  }
  .clear-filter {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 100px;
    padding: 4px 10px;
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text-3);
    cursor: pointer;
    transition: all 0.15s;
  }
  .clear-filter:hover {
    color: var(--text-1);
  }

  .table-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--rim);
    border-radius: 18px;
    overflow: hidden;
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 13px 18px;
    border-bottom: 1px solid var(--rim);
    background: rgba(255, 255, 255, 0.015);
  }
  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .select-all-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }
  .cb {
    width: 15px;
    height: 15px;
    accent-color: var(--teal);
    cursor: pointer;
  }
  .cb-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-2);
  }
  .action-row {
    display: flex;
    gap: 7px;
  }
  .action-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 13px;
    border-radius: 9px;
    border: 1px solid;
    font-family: var(--font-body);
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
  }
  .action-btn.replay {
    background: rgba(0, 176, 155, 0.09);
    border-color: rgba(0, 176, 155, 0.25);
    color: var(--teal);
  }
  .action-btn.replay:hover:not(:disabled) {
    background: rgba(0, 176, 155, 0.18);
  }
  .action-btn.discard {
    background: rgba(248, 113, 113, 0.08);
    border-color: rgba(248, 113, 113, 0.25);
    color: #f87171;
  }
  .action-btn.discard:hover:not(:disabled) {
    background: rgba(248, 113, 113, 0.16);
  }
  .action-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .event-count {
    font-size: 0.68rem;
    color: var(--text-3);
    font-weight: 600;
  }

  .col-hd {
    display: grid;
    grid-template-columns: 40px 140px 1fr 160px 1fr 90px 120px 44px;
    padding: 8px 18px;
    border-bottom: 1px solid var(--rim);
    background: rgba(255, 255, 255, 0.01);
  }
  .col {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    display: flex;
    align-items: center;
    padding: 0 6px;
  }

  .rows {
    display: flex;
    flex-direction: column;
  }
  .row-wrap {
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  .row-wrap.sel {
    background: rgba(0, 176, 155, 0.04);
  }
  .row-wrap.exp {
    background: rgba(255, 255, 255, 0.025);
  }
  .row-wrap:last-child {
    border-bottom: none;
  }
  .row {
    display: grid;
    grid-template-columns: 40px 140px 1fr 160px 1fr 90px 120px 44px;
    padding: 10px 18px;
    align-items: center;
    transition: background 0.1s;
  }
  .row:hover {
    background: rgba(255, 255, 255, 0.025);
  }

  .mono-sm {
    color: var(--teal);
    font-family: monospace;
    font-size: 0.72rem;
  }
  .mono-dim {
    color: var(--text-3);
    font-family: monospace;
    font-size: 0.72rem;
  }
  .veh-id {
    font-size: 0.72rem;
    font-family: monospace;
    color: var(--text-2);
  }
  .pos-col {
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
  }
  .pos-coords {
    font-size: 0.68rem;
    font-family: monospace;
    color: var(--text-2);
  }
  .fix-badge {
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 1px 6px;
    border-radius: 100px;
    border: 1px solid;
  }
  .err-col {
    min-width: 0;
  }
  .err-text {
    background: none;
    border: none;
    cursor: pointer;
    font-family: monospace;
    font-size: 0.68rem;
    color: #fca5a5;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    padding: 0;
  }
  .err-text:hover {
    color: #f87171;
    text-decoration: underline;
  }
  .attempts {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--text-3);
  }
  .attempts.max {
    color: #f87171;
  }
  .age-col {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
  .age-val {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-2);
  }
  .age-sub {
    font-size: 0.6rem;
    color: var(--text-3);
  }
  .row-expand {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-3);
    transition: all 0.15s;
  }
  .row-expand:hover {
    background: rgba(255, 255, 255, 0.09);
    color: var(--text-1);
  }
  .row-expand.open {
    background: rgba(0, 176, 155, 0.1);
    border-color: rgba(0, 176, 155, 0.25);
    color: var(--teal);
  }

  .detail {
    padding: 16px 20px 20px 60px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(0, 0, 0, 0.15);
  }
  .detail-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 14px;
  }
  .detail-lbl {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 4px;
  }
  .detail-val {
    font-size: 0.8rem;
    color: var(--text-1);
  }
  .detail-val.mono {
    font-family: monospace;
    font-size: 0.72rem;
    color: var(--teal);
    word-break: break-all;
  }
  .detail-err {
    margin-bottom: 12px;
  }
  .err-full {
    font-family: monospace;
    font-size: 0.72rem;
    color: #fca5a5;
    background: rgba(248, 113, 113, 0.06);
    border: 1px solid rgba(248, 113, 113, 0.15);
    border-radius: 8px;
    padding: 8px 12px;
    word-break: break-all;
  }
  .detail-raw {
    margin-bottom: 14px;
  }
  .raw-pre {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 12px 16px;
    font-family: "Courier New", monospace;
    font-size: 0.66rem;
    color: #a8d8c8;
    overflow-x: auto;
    max-height: 200px;
    overflow-y: auto;
    white-space: pre;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  }
  .detail-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .det-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 9px;
    border: 1px solid;
    font-family: var(--font-body);
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.15s;
  }
  .det-btn.replay {
    background: rgba(0, 176, 155, 0.08);
    border-color: rgba(0, 176, 155, 0.22);
    color: var(--teal);
  }
  .det-btn.discard {
    background: rgba(248, 113, 113, 0.07);
    border-color: rgba(248, 113, 113, 0.2);
    color: #f87171;
  }
  .det-btn.map {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
    color: var(--text-2);
  }
  .det-btn:hover:not(:disabled) {
    filter: brightness(1.15);
  }
  .det-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .empty {
    padding: 60px 20px;
    text-align: center;
    color: var(--text-3);
  }
  .empty-ti {
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--text-2);
    margin: 14px 0 5px;
  }
  .empty-sub {
    font-size: 0.78rem;
  }

  .pagination {
    display: flex;
    gap: 5px;
    padding: 12px 18px;
    border-top: 1px solid var(--rim);
    flex-wrap: wrap;
  }
  .pg-btn {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.09);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-3);
    text-decoration: none;
    transition: all 0.15s;
  }
  .pg-btn:hover {
    background: rgba(255, 255, 255, 0.09);
    color: var(--text-1);
  }
  .pg-btn.cur {
    background: rgba(0, 176, 155, 0.12);
    border-color: rgba(0, 176, 155, 0.3);
    color: var(--teal);
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 300;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .modal {
    background: var(--ink-2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 18px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6);
    overflow: hidden;
  }
  .modal-hd {
    padding: 20px 24px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  }
  .modal-ey {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    margin-bottom: 4px;
  }
  .modal-ti {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .modal-body {
    padding: 16px 24px;
  }
  .modal-desc {
    font-size: 0.82rem;
    color: var(--text-2);
    line-height: 1.6;
  }
  .modal-desc strong {
    color: #f87171;
  }
  .modal-ft {
    display: flex;
    gap: 9px;
    padding: 14px 24px 18px;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
  }
  .btn-cancel {
    flex: 1;
    padding: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 11px;
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-2);
    cursor: pointer;
  }
  .btn-cancel:hover {
    background: rgba(255, 255, 255, 0.09);
  }
  .btn-confirm {
    flex: 2;
    padding: 10px;
    border: none;
    border-radius: 11px;
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    transition: all 0.15s;
  }
  .btn-confirm.safe {
    background: var(--teal);
  }
  .btn-confirm.danger {
    background: #c0392b;
  }
  .btn-confirm:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
  .btn-confirm:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .spin {
    width: 13px;
    height: 13px;
    border: 2px solid rgba(255, 255, 255, 0.25);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
  }
  .spin-sm {
    width: 10px;
    height: 10px;
    border: 1.5px solid rgba(255, 255, 255, 0.25);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1100px) {
    .content {
      padding: 22px 16px;
    }
    .col-hd,
    .row {
      grid-template-columns: 36px 110px 1fr 130px 1fr 70px 100px 36px;
    }
    .stat-strip {
      grid-template-columns: repeat(2, 1fr);
    }
    .detail-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
