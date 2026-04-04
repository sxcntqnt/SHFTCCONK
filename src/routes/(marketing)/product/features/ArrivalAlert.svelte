<script lang="ts">
  interface Alert {
    routeNum: string;
    message:  string;
    eta:      string;
    severity: "early" | "delay" | "info";
  }

  export let alerts: Alert[] = [];

  // Enrich severity display
  function sev(a: Alert) {
    if (a.severity === "delay")  return { label: "DELAY",   cls: "delay",  icon: "⚠" };
    if (a.severity === "early")  return { label: "ARRIVING", cls: "early",  icon: "●" };
    return                               { label: "EN ROUTE", cls: "info",   icon: "→" };
  }

  // Fake progress bar for ETA (parse minutes)
  function etaProgress(eta: string): number {
    const m = parseFloat(eta);
    if (isNaN(m)) return 50;
    return Math.max(8, Math.min(96, 100 - (m / 15) * 100));
  }
</script>

<div class="alerts-wrap">
  <!-- Header -->
  <div class="alerts-header">
    <div class="alerts-title">
      <span class="pulse-ring"></span>
      Stage Alerts
    </div>
    <div class="alerts-count">{alerts.length} active</div>
  </div>

  <!-- Alert cards -->
  <div class="alerts-list">
    {#if alerts.length === 0}
      <div class="empty">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <span>No active alerts</span>
      </div>
    {:else}
      {#each alerts as alert (alert.routeNum + alert.severity)}
        {@const s = sev(alert)}
        {@const pct = etaProgress(alert.eta)}
        <div class="alert-card alert-{s.cls}">
          <!-- Left accent bar -->
          <div class="accent-bar bar-{s.cls}"></div>

          <div class="alert-body">
            <!-- Top row -->
            <div class="alert-top">
              <div class="alert-route">
                <span class="hex-g">⬡</span>
                Route {alert.routeNum}
              </div>
              <span class="severity-tag tag-{s.cls}">
                <span class="sev-icon">{s.icon}</span>
                {s.label}
              </span>
            </div>

            <!-- Message -->
            <div class="alert-msg">{alert.message}</div>

            <!-- Progress bar + ETA -->
            <div class="eta-row">
              <div class="eta-track">
                <div class="eta-fill fill-{s.cls}" style="width:{pct}%"></div>
                <div class="eta-cursor" style="left:{pct}%"></div>
              </div>
              <div class="eta-chip chip-{s.cls}">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {alert.eta}
              </div>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Footer -->
  <div class="alerts-footer">
    <span class="footer-note">Alerts fire at ≤ 3 min ETA · updated every 5s</span>
  </div>
</div>

<style>
  .alerts-wrap {
    width: 100%; height: 100%;
    background: var(--ink, #0d0d0d);
    display: flex;
    flex-direction: column;
    padding: 20px 20px 16px;
    box-sizing: border-box;
    gap: 0;
  }

  /* Header */
  .alerts-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .alerts-title {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-2, #999);
  }
  .pulse-ring {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #f26522;
    box-shadow: 0 0 0 2px rgba(242,101,34,0.25);
    animation: pr 1.8s ease infinite;
  }
  @keyframes pr { 0%,100%{box-shadow:0 0 0 2px rgba(242,101,34,0.25)} 50%{box-shadow:0 0 0 5px rgba(242,101,34,0)} }
  .alerts-count {
    font-size: 0.64rem;
    font-weight: 700;
    color: var(--text-3, #555);
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 100px;
    padding: 2px 9px;
  }

  /* List */
  .alerts-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.08) transparent;
  }

  /* Empty */
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 100%;
    color: var(--text-3, #555);
    font-size: 0.78rem;
    min-height: 80px;
  }

  /* Alert card */
  .alert-card {
    display: flex;
    border-radius: 14px;
    overflow: hidden;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    transition: border-color 0.2s;
  }
  .alert-card:hover { border-color: rgba(255,255,255,0.14); }
  .alert-delay { border-color: rgba(242,101,34,0.18); }
  .alert-early { border-color: rgba(0,176,155,0.18); }

  .accent-bar {
    width: 3px;
    flex-shrink: 0;
  }
  .bar-early { background: #00b09b; }
  .bar-delay { background: #f26522; }
  .bar-info  { background: rgba(255,255,255,0.2); }

  .alert-body {
    flex: 1;
    padding: 13px 14px;
  }

  /* Top row */
  .alert-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  .alert-route {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.82rem;
    font-weight: 800;
    color: var(--text-1, #f0f0f0);
    letter-spacing: -0.01em;
  }
  .hex-g { color: rgba(242,101,34,0.6); font-size: 0.9rem; }

  .severity-tag {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 100px;
  }
  .tag-early { background: rgba(0,176,155,0.14); color: #00b09b; border: 1px solid rgba(0,176,155,0.25); }
  .tag-delay { background: rgba(242,101,34,0.14); color: #f26522; border: 1px solid rgba(242,101,34,0.25); }
  .tag-info  { background: rgba(255,255,255,0.06); color: var(--text-3,#666); border: 1px solid rgba(255,255,255,0.1); }
  .sev-icon  { font-size: 0.6rem; }

  /* Message */
  .alert-msg {
    font-size: 0.78rem;
    color: var(--text-2, #999);
    margin-bottom: 10px;
    line-height: 1.4;
  }

  /* ETA row */
  .eta-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .eta-track {
    flex: 1;
    height: 4px;
    background: rgba(255,255,255,0.07);
    border-radius: 100px;
    position: relative;
    overflow: visible;
  }
  .eta-fill {
    height: 100%;
    border-radius: 100px;
    transition: width 0.6s ease;
  }
  .fill-early { background: linear-gradient(90deg, rgba(0,176,155,0.3), #00b09b); }
  .fill-delay { background: linear-gradient(90deg, rgba(242,101,34,0.3), #f26522); }
  .fill-info  { background: rgba(255,255,255,0.2); }
  .eta-cursor {
    position: absolute;
    top: 50%;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #fff;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 4px rgba(255,255,255,0.3);
  }
  .eta-chip {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.72rem;
    font-weight: 800;
    border-radius: 8px;
    padding: 3px 9px;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .chip-early { background: rgba(0,176,155,0.12); color: #00b09b; border: 1px solid rgba(0,176,155,0.22); }
  .chip-delay { background: rgba(242,101,34,0.12); color: #f26522; border: 1px solid rgba(242,101,34,0.22); }
  .chip-info  { background: rgba(255,255,255,0.06); color: var(--text-2,#999); border: 1px solid rgba(255,255,255,0.1); }

  /* Footer */
  .alerts-footer {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.07);
  }
  .footer-note {
    font-size: 0.58rem;
    color: var(--text-3, #555);
    font-weight: 500;
    letter-spacing: 0.03em;
  }
</style>