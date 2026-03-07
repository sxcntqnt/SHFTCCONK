<script lang="ts">
  import { page } from "$app/stores"
  import MapView from "$lib/map/components/MapView.svelte"
  import { geofences, removeGeofence } from "$lib/map/stores/MapStore"
  import type { Geofence, Coordinates } from "$lib/map/types/MapTypes"

  // ── Auth via page data (SvelteKit layout provides supabase) ─────────────────
  let supabase = $derived($page.data.supabase)

  // ── State ────────────────────────────────────────────────────────────────────
  let geofenceName = $state("")
  let savingId = $state<string | null>(null)
  let deletingId = $state<string | null>(null)
  let savedIds = $state<Set<string>>(new Set())
  let errorMsg = $state<string | null>(null)

  const defaultCenter: Coordinates = { lat: -1.286, lng: 36.817 }

  // ── Auth helper ──────────────────────────────────────────────────────────────
  async function getToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }

  // ── Save geofence ────────────────────────────────────────────────────────────
  async function saveGeofence(g: Geofence) {
    errorMsg = null
    savingId = g.id
    const token = await getToken()
    if (!token) {
      errorMsg = "Not authenticated"
      savingId = null
      return
    }

    try {
      const res = await fetch("/api/geofences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(g),
      })
      if (!res.ok) throw new Error(await res.text())
      savedIds = new Set([...savedIds, g.id])
    } catch (e: any) {
      errorMsg = e.message ?? "Failed to save geofence"
    } finally {
      savingId = null
    }
  }

  // ── Delete geofence ──────────────────────────────────────────────────────────
  async function deleteGeofence(id: string) {
    errorMsg = null
    deletingId = id
    const token = await getToken()
    if (!token) {
      errorMsg = "Not authenticated"
      deletingId = null
      return
    }

    try {
      const res = await fetch(`/api/geofences?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(await res.text())
      removeGeofence(id)
      savedIds = new Set([...savedIds].filter((x) => x !== id))
    } catch (e: any) {
      errorMsg = e.message ?? "Failed to delete geofence"
    } finally {
      deletingId = null
    }
  }

  // ── After draw tool creates a new geofence ───────────────────────────────────
  function handleCreated(g: Geofence) {
    geofenceName = ""
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function shapeLabel(g: Geofence) {
    return g.coords.length === 1 ? "Point" : `Polygon · ${g.coords.length} pts`
  }

  function centreLabel(g: Geofence) {
    const lats = g.coords.map((c) => c.lat)
    const lngs = g.coords.map((c) => c.lng)
    const lat = (Math.min(...lats) + Math.max(...lats)) / 2
    const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }
</script>

<svelte:head><title>Geofences — Matatu Pulse</title></svelte:head>

<div class="page">
  <!-- Header -->
  <div class="page-header">
    <div class="eyebrow"><span class="eyebrow-dot"></span>Fleet Management</div>
    <h1 class="page-title">Geo<em>fences</em></h1>
    <p class="page-sub">
      Draw zones on the map to monitor vehicle entry and exit in real time.
    </p>
  </div>

  <div class="body">
    <!-- ── Sidebar ── -->
    <div class="sidebar">
      <!-- Draw tool panel -->
      <div class="panel">
        <div class="panel-head">
          <div class="panel-ey">Draw Tool</div>
          <div class="panel-ti">Create Zone</div>
        </div>

        <div class="input-wrap">
          <input
            class="name-input"
            bind:value={geofenceName}
            placeholder="Zone name (e.g. CBD Pickup)"
            maxlength={48}
          />
        </div>

        <p class="draw-hint">
          Enter a name, then use the <strong>polygon</strong> or
          <strong>point</strong> tool in the map toolbar to draw a zone. It will appear
          in the list below.
        </p>
      </div>

      <!-- Geofence list panel -->
      <div
        class="panel"
        style="flex:1;overflow:hidden;display:flex;flex-direction:column;"
      >
        <div class="panel-head">
          <div class="panel-ey">Saved Zones</div>
          <div class="panel-ti">
            Geofences
            {#if $geofences.length}
              <span
                style="font-family:var(--font-body);font-size:0.75rem;font-weight:600;color:var(--text-3);margin-left:5px;"
                >({$geofences.length})</span
              >
            {/if}
          </div>
        </div>

        {#if errorMsg}
          <div class="error-banner">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              ><circle cx="12" cy="12" r="10" /><line
                x1="12"
                y1="8"
                x2="12"
                y2="12"
              /><line x1="12" y1="16" x2="12.01" y2="16" /></svg
            >
            {errorMsg}
          </div>
        {/if}

        <div class="gf-list" style="overflow-y:auto;flex:1;">
          {#each $geofences as g (g.id)}
            {@const isPoint = g.coords.length === 1}
            {@const isSaved = savedIds.has(g.id)}
            {@const isSaving = savingId === g.id}
            {@const isDeleting = deletingId === g.id}

            <div class="gf-row {isSaved ? 'saved' : ''}">
              <div class="gf-top">
                <div class="gf-icon {isPoint ? 'point' : ''}">
                  {#if isPoint}
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      ><circle cx="12" cy="10" r="3" /><path
                        d="M12 21.7C17.3 17 20 13 20 10a8 8 0 10-16 0c0 3 2.7 6.9 8 11.7z"
                      /></svg
                    >
                  {:else}
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      ><polygon
                        points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"
                      /></svg
                    >
                  {/if}
                </div>
                <div class="gf-info">
                  <div class="gf-name">{g.name}</div>
                  <div class="gf-meta">
                    <span class="gf-shape-pill">{shapeLabel(g)}</span>
                    <span>{centreLabel(g)}</span>
                    {#if isSaved}<span class="gf-saved-chip">Saved</span>{/if}
                  </div>
                </div>
              </div>

              <div class="gf-actions">
                <button
                  class="btn btn-save {isSaved ? 'saved-state' : ''}"
                  onclick={() => saveGeofence(g)}
                  disabled={isSaving || isDeleting || isSaved}
                >
                  {#if isSaving}
                    <span class="spin"></span> Saving…
                  {:else if isSaved}
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      ><polyline points="20 6 9 17 4 12" /></svg
                    >
                    Saved
                  {:else}
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      ><path
                        d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
                      /><polyline points="17 21 17 13 7 13 7 21" /><polyline
                        points="7 3 7 8 15 8"
                      /></svg
                    >
                    Save
                  {/if}
                </button>
                <button
                  class="btn btn-delete"
                  onclick={() => deleteGeofence(g.id)}
                  disabled={isSaving || isDeleting}
                >
                  {#if isDeleting}
                    <span class="spin"></span>
                  {:else}
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      ><polyline points="3 6 5 6 21 6" /><path
                        d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"
                      /><path d="M10 11v6M14 11v6" /><path
                        d="M9 6V4h6v2"
                      /></svg
                    >
                  {/if}
                  Delete
                </button>
              </div>
            </div>
          {:else}
            <div class="empty-state">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                ><polygon
                  points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"
                /></svg
              >
              No geofences yet.<br />
              Enter a name above and draw a zone on the map.
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- ── Map ── -->
    <div class="map-area">
      <div class="zone-count">
        <span class="zone-dot"></span>
        {$geofences.length} zone{$geofences.length !== 1 ? "s" : ""}
      </div>
      <MapView
        initialCenter={defaultCenter}
        initialZoom={12}
        nextName={geofenceName}
        height="100%"
        oncreated={handleCreated}
      />
    </div>
  </div>
</div>

<style>
  /* ── Page shell ─────────────────────────────────────────────────────────── */
  .page {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--ink);
    font-family: var(--font-body);
    position: relative;
    overflow: hidden;
  }

  /* Atmospheric gradients */
  .page::before {
    content: "";
    position: fixed;
    top: -80px;
    right: -80px;
    width: 420px;
    height: 420px;
    background: radial-gradient(
      circle,
      rgba(242, 101, 34, 0.06),
      transparent 65%
    );
    pointer-events: none;
    z-index: 0;
  }
  .page::after {
    content: "";
    position: fixed;
    bottom: -100px;
    left: -80px;
    width: 360px;
    height: 360px;
    background: radial-gradient(
      circle,
      rgba(0, 176, 155, 0.05),
      transparent 65%
    );
    pointer-events: none;
    z-index: 0;
  }

  /* ── Page header ─────────────────────────────────────────────────────────── */
  .page-header {
    padding: 28px 32px 20px;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }
  .eyebrow {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--orange);
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 7px;
  }
  .eyebrow-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--orange);
    animation: pulse-o 2s ease-out infinite;
  }
  @keyframes pulse-o {
    0% {
      box-shadow: 0 0 0 0 rgba(242, 101, 34, 0.5);
    }
    70% {
      box-shadow: 0 0 0 5px rgba(242, 101, 34, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(242, 101, 34, 0);
    }
  }
  .page-title {
    font-family: var(--font-display);
    font-size: clamp(1.5rem, 2.5vw, 2rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1.1;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  .page-title em {
    font-style: normal;
    color: var(--orange);
  }
  .page-sub {
    font-size: 0.875rem;
    color: var(--text-3);
    line-height: 1.6;
  }

  /* ── Body ────────────────────────────────────────────────────────────────── */
  .body {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 16px;
    padding: 0 32px 32px;
    flex: 1;
    min-height: 0;
    position: relative;
    z-index: 1;
  }

  /* ── Sidebar ─────────────────────────────────────────────────────────────── */
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
  }

  /* ── Panel ───────────────────────────────────────────────────────────────── */
  .panel {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--rim);
    border-radius: 16px;
    overflow: hidden;
    flex-shrink: 0;
  }
  .panel::before {
    content: "";
    display: block;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.05),
      transparent
    );
  }
  .panel-head {
    padding: 14px 16px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  .panel-ey {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 3px;
  }
  .panel-ti {
    font-family: var(--font-display);
    font-size: 0.88rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }

  /* ── Name input ──────────────────────────────────────────────────────────── */
  .input-wrap {
    padding: 12px 12px 4px;
  }
  .name-input {
    width: 100%;
    padding: 9px 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-family: var(--font-body);
    font-size: 0.82rem;
    color: var(--text-1);
    outline: none;
    box-sizing: border-box;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }
  .name-input::placeholder {
    color: var(--text-3);
  }
  .name-input:focus {
    border-color: rgba(242, 101, 34, 0.45);
    box-shadow: 0 0 0 3px rgba(242, 101, 34, 0.1);
  }

  .draw-hint {
    padding: 6px 12px 12px;
    font-size: 0.68rem;
    color: var(--text-3);
    line-height: 1.55;
  }
  .draw-hint strong {
    color: var(--text-2);
    font-weight: 600;
  }

  /* ── Error banner ────────────────────────────────────────────────────────── */
  .error-banner {
    margin: 0 12px 10px;
    padding: 8px 12px;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.2);
    border-radius: 9px;
    font-size: 0.72rem;
    color: #f87171;
    display: flex;
    align-items: center;
    gap: 7px;
  }

  /* ── Geofence list ───────────────────────────────────────────────────────── */
  .gf-list {
    padding: 8px 10px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .gf-row {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 11px;
    padding: 10px 11px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .gf-row:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
  }
  .gf-row.saved {
    border-color: rgba(0, 176, 155, 0.2);
  }

  .gf-top {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .gf-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    flex-shrink: 0;
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--orange);
  }
  .gf-icon.point {
    background: rgba(0, 176, 155, 0.1);
    border-color: rgba(0, 176, 155, 0.2);
    color: var(--teal);
  }
  .gf-info {
    flex: 1;
    min-width: 0;
  }
  .gf-name {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-1);
  }
  .gf-meta {
    font-size: 0.62rem;
    color: var(--text-3);
    margin-top: 2px;
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
  }
  .gf-shape-pill {
    padding: 1px 6px;
    border-radius: 100px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-3);
  }
  .gf-saved-chip {
    padding: 1px 7px;
    border-radius: 100px;
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.2);
    font-size: 0.58rem;
    font-weight: 700;
    color: var(--teal);
  }

  .gf-actions {
    display: flex;
    gap: 6px;
  }
  .btn {
    flex: 1;
    padding: 6px 10px;
    border-radius: 8px;
    font-family: var(--font-body);
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    transition:
      background 0.15s,
      transform 0.12s,
      opacity 0.15s;
  }
  .btn:hover {
    transform: translateY(-1px);
  }
  .btn:active {
    transform: scale(0.97);
  }
  .btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }

  .btn-save {
    background: rgba(0, 176, 155, 0.1);
    border-color: rgba(0, 176, 155, 0.25);
    color: var(--teal);
  }
  .btn-save:hover:not(:disabled) {
    background: rgba(0, 176, 155, 0.18);
  }
  .btn-save.saved-state {
    background: rgba(0, 176, 155, 0.06);
    border-color: rgba(0, 176, 155, 0.15);
    color: rgba(0, 176, 155, 0.55);
  }

  .btn-delete {
    background: rgba(248, 113, 113, 0.07);
    border-color: rgba(248, 113, 113, 0.2);
    color: #f87171;
  }
  .btn-delete:hover:not(:disabled) {
    background: rgba(248, 113, 113, 0.14);
  }

  /* Loading spinner */
  .spin {
    width: 12px;
    height: 12px;
    border: 1.5px solid rgba(255, 255, 255, 0.15);
    border-radius: 50%;
    display: inline-block;
  }
  .btn-save .spin {
    border-top-color: var(--teal);
    animation: spin 0.6s linear infinite;
  }
  .btn-delete .spin {
    border-top-color: #f87171;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Empty state */
  .empty-state {
    padding: 20px 12px;
    text-align: center;
    color: var(--text-3);
    font-size: 0.78rem;
    line-height: 1.7;
  }
  .empty-state svg {
    margin: 0 auto 10px;
    display: block;
    opacity: 0.3;
  }

  /* ── Map area ────────────────────────────────────────────────────────────── */
  .map-area {
    min-height: 0;
    border-radius: 20px;
    overflow: hidden;
    position: relative;
    /* Subtle glow on the map card */
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.07),
      0 24px 64px rgba(0, 0, 0, 0.5);
  }

  /* Zone count badge */
  .zone-count {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    background: rgba(13, 13, 20, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 100px;
    backdrop-filter: blur(12px);
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-2);
    pointer-events: none;
  }
  .zone-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--orange);
  }

  /* ── Responsive ──────────────────────────────────────────────────────────── */
  @media (max-width: 1024px) {
    .body {
      grid-template-columns: 1fr;
    }
    .map-area {
      min-height: 420px;
    }
    .page-header {
      padding: 22px 20px 16px;
    }
    .body {
      padding: 0 20px 24px;
    }
  }
</style>
