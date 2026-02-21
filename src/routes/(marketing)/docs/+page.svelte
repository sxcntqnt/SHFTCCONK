<svelte:head>
  <title>Documentation — Matatu Pulse | Developer & API Reference</title>
  <meta name="description" content="Matatu Pulse developer documentation. API reference, quickstart guides, WebSocket telemetry feeds, authentication, SDKs, and integration examples for building on Kenya's matatu data layer." />
</svelte:head>

<style>
  .page { background: var(--ink); }

  /* ── HERO ── */
  .hero {
    padding: 88px 2rem 72px; text-align: center;
    position: relative; overflow: hidden; border-bottom: 1px solid var(--rim);
  }
  .hero::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse 55% 65% at 50% -5%, rgba(242,101,34,0.1), transparent 60%);
    pointer-events: none;
  }
  .hero-inner { position: relative; max-width: 680px; margin: 0 auto; }
  .eyebrow { display: inline-block; margin-bottom: 22px; padding: 5px 14px; border-radius: 100px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--orange); background: rgba(242,101,34,0.1); border: 1px solid rgba(242,101,34,0.22); }
  h1 { font-family: var(--font-display); font-size: clamp(2rem,5vw,3.4rem); font-weight: 800; letter-spacing: -0.04em; color: var(--text-1); line-height: 1.1; margin-bottom: 18px; }
  h1 em { font-style: normal; color: var(--orange); }
  .hero-sub { font-size: 1.05rem; color: var(--text-2); line-height: 1.7; max-width: 540px; margin: 0 auto 36px; }

  /* Search bar */
  .search-wrap { max-width: 480px; margin: 0 auto; position: relative; }
  .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-3); }
  .search-input {
    width: 100%; padding: 13px 16px 13px 44px;
    background: var(--surface); border: 1px solid var(--rim-2); border-radius: 14px;
    font-size: 0.9rem; color: var(--text-1); font-family: var(--font-body);
    outline: none; transition: border-color 0.2s, box-shadow 0.2s;
  }
  .search-input:focus { border-color: rgba(242,101,34,0.45); box-shadow: 0 0 0 3px rgba(242,101,34,0.08); }
  .search-input::placeholder { color: var(--text-3); }

  /* ── LAYOUT ── */
  .docs-layout {
    display: grid; grid-template-columns: 240px 1fr;
    max-width: 1200px; margin: 0 auto; min-height: 70vh;
    border-left: 1px solid var(--rim); border-right: 1px solid var(--rim);
  }

  /* ── SIDEBAR ── */
  .docs-sidebar {
    border-right: 1px solid var(--rim); padding: 36px 0;
    position: sticky; top: 0; height: calc(100vh - 54px);
    overflow-y: auto; scrollbar-width: none;
  }
  .docs-sidebar::-webkit-scrollbar { display: none; }

  .sidebar-section { margin-bottom: 28px; }
  .sidebar-section-label {
    padding: 0 20px 8px; font-size: 0.64rem; font-weight: 700;
    letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-3);
    display: block;
  }
  .sidebar-link {
    display: flex; align-items: center; gap: 9px;
    padding: 8px 20px; font-size: 0.845rem; color: var(--text-2);
    text-decoration: none; border-left: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }
  .sidebar-link:hover { color: var(--text-1); background: rgba(255,255,255,0.02); }
  .sidebar-link.active { color: var(--orange); border-left-color: var(--orange); background: rgba(242,101,34,0.05); }
  .sidebar-link :global(svg) { flex-shrink: 0; opacity: 0.5; }
  .sidebar-link:hover :global(svg), .sidebar-link.active :global(svg) { opacity: 1; }
  .sidebar-badge { margin-left: auto; padding: 1px 7px; border-radius: 100px; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
  .badge-new { background: rgba(0,176,155,0.15); color: var(--teal); border: 1px solid rgba(0,176,155,0.25); }
  .badge-beta { background: rgba(242,101,34,0.1); color: var(--orange); border: 1px solid rgba(242,101,34,0.2); }

  /* ── MAIN CONTENT ── */
  .docs-main { padding: 48px 56px; }

  .section-tag { display: inline-block; margin-bottom: 12px; padding: 4px 12px; border-radius: 100px; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--orange); background: rgba(242,101,34,0.08); border: 1px solid rgba(242,101,34,0.18); }

  /* ── QUICKSTART CARDS ── */
  .quickstart-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; margin-bottom: 56px; }
  .qs-card {
    background: var(--surface); border: 1px solid var(--rim); border-radius: 16px; padding: 24px 22px;
    text-decoration: none; display: block;
    transition: border-color 0.3s, transform 0.2s;
  }
  .qs-card:hover { border-color: rgba(242,101,34,0.3); transform: translateY(-2px); }
  .qs-icon { width: 40px; height: 40px; border-radius: 11px; background: rgba(242,101,34,0.1); border: 1px solid rgba(242,101,34,0.2); display: flex; align-items: center; justify-content: center; color: var(--orange); margin-bottom: 16px; }
  .qs-title { font-family: var(--font-display); font-size: 0.95rem; font-weight: 700; color: var(--text-1); margin-bottom: 6px; }
  .qs-desc { font-size: 0.8rem; color: var(--text-2); line-height: 1.6; }

  /* ── CODE BLOCK ── */
  .code-section { margin-bottom: 56px; }
  .code-section h2 { font-family: var(--font-display); font-size: 1.4rem; font-weight: 800; letter-spacing: -0.03em; color: var(--text-1); margin-bottom: 10px; }
  .code-section p { font-size: 0.9rem; color: var(--text-2); line-height: 1.75; margin-bottom: 18px; }

  .code-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--rim); margin-bottom: 0; }
  .code-tab {
    padding: 8px 16px; font-size: 0.78rem; font-weight: 600; color: var(--text-3);
    border-bottom: 2px solid transparent; margin-bottom: -1px; cursor: pointer;
    transition: color 0.2s, border-color 0.2s;
  }
  .code-tab.active { color: var(--orange); border-bottom-color: var(--orange); }

  .code-block {
    background: #0d0d0f; border: 1px solid var(--rim); border-top: none;
    border-radius: 0 0 14px 14px; padding: 24px; overflow-x: auto;
    position: relative;
  }
  .code-block pre { margin: 0; font-size: 0.82rem; line-height: 1.7; color: #c9d1d9; font-family: 'JetBrains Mono', 'Fira Code', monospace; }
  .code-kw { color: #ff7b72; }
  .code-str { color: #a5d6ff; }
  .code-fn { color: #d2a8ff; }
  .code-cmt { color: #8b949e; font-style: italic; }
  .code-num { color: #79c0ff; }
  .code-copy {
    position: absolute; top: 14px; right: 14px;
    padding: 5px 10px; background: var(--rim); border: 1px solid var(--rim-2);
    border-radius: 6px; font-size: 0.72rem; font-weight: 600; color: var(--text-3);
    cursor: pointer; transition: background 0.15s;
  }
  .code-copy:hover { background: var(--rim-2); color: var(--text-2); }

  /* ── ENDPOINTS TABLE ── */
  .endpoint-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  .endpoint-table th { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-3); padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--rim-2); background: var(--surface); }
  .endpoint-table td { padding: 14px; font-size: 0.845rem; color: var(--text-2); border-bottom: 1px solid var(--rim); }
  .endpoint-table tr:last-child td { border-bottom: none; }
  .method { display: inline-block; padding: 2px 8px; border-radius: 5px; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.05em; font-family: monospace; }
  .get { background: rgba(0,176,155,0.15); color: var(--teal); }
  .ws { background: rgba(139,92,246,0.15); color: #a78bfa; }
  .endpoint-path { font-family: monospace; font-size: 0.82rem; color: var(--text-1); }

  /* ── CHANGELOG ── */
  .changelog-list { display: flex; flex-direction: column; gap: 16px; }
  .cl-item { display: flex; gap: 20px; align-items: flex-start; }
  .cl-version { font-family: monospace; font-size: 0.78rem; font-weight: 700; color: var(--orange); min-width: 64px; padding-top: 2px; }
  .cl-body { flex: 1; }
  .cl-date { font-size: 0.72rem; color: var(--text-3); margin-bottom: 4px; }
  .cl-title { font-size: 0.875rem; font-weight: 600; color: var(--text-1); margin-bottom: 4px; }
  .cl-desc { font-size: 0.82rem; color: var(--text-2); line-height: 1.6; }

  @media (max-width: 900px) {
    .docs-layout { grid-template-columns: 1fr; }
    .docs-sidebar { display: none; }
    .docs-main { padding: 36px 24px; }
    .quickstart-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 600px) {
    .hero { padding: 64px 1.25rem 56px; }
    .docs-main { padding: 28px 16px; }
  }
</style>

<div class="page">

  <!-- Hero -->
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow">Documentation</div>
      <h1>Build on Nairobi's<br/><em>Transit Data Layer</em></h1>
      <p class="hero-sub">API reference, integration guides, and code examples for developers building on real-time matatu telemetry and the Matatu Pulse platform.</p>
      <div class="search-wrap">
        <span class="search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
        <input class="search-input" type="search" placeholder="Search docs — e.g. 'authentication', 'WebSocket'" />
      </div>
    </div>
  </section>

  <!-- Docs layout -->
  <div class="docs-layout">

    <!-- Sidebar -->
    <nav class="docs-sidebar">
      {#each [
        {
          label: "Getting Started",
          links: [
            { href:"/docs/introduction", label:"Introduction" },
            { href:"/docs/quickstart", label:"Quickstart Guide" },
            { href:"/docs/authentication", label:"Authentication" },
            { href:"/docs/rate-limits", label:"Rate Limits" },
          ]
        },
        {
          label: "Core API",
          links: [
            { href:"/docs/api/vehicles", label:"Vehicles" },
            { href:"/docs/api/routes", label:"Routes" },
            { href:"/docs/api/stops", label:"Stops & Stages" },
            { href:"/docs/api/eta", label:"ETA Predictions" },
            { href:"/docs/api/fares", label:"Fares", badge:"new" },
          ]
        },
        {
          label: "Real-Time",
          links: [
            { href:"/docs/websocket", label:"WebSocket Feed" },
            { href:"/docs/websocket/events", label:"Event Types" },
            { href:"/docs/webhooks", label:"Webhooks", badge:"beta" },
          ]
        },
        {
          label: "Historical Data",
          links: [
            { href:"/docs/historical/trips", label:"Trip History" },
            { href:"/docs/historical/congestion", label:"Congestion Data" },
            { href:"/docs/historical/export", label:"Data Export" },
          ]
        },
        {
          label: "SDKs & Tools",
          links: [
            { href:"/docs/sdk/javascript", label:"JavaScript SDK" },
            { href:"/docs/sdk/python", label:"Python SDK", badge:"beta" },
            { href:"/docs/sdk/android", label:"Android SDK" },
            { href:"/docs/postman", label:"Postman Collection" },
          ]
        },
        {
          label: "Reference",
          links: [
            { href:"/docs/changelog", label:"Changelog" },
            { href:"/docs/status", label:"API Status" },
            { href:"/docs/errors", label:"Error Codes" },
            { href:"/docs/glossary", label:"Glossary" },
          ]
        },
      ] as section}
        <div class="sidebar-section">
          <span class="sidebar-section-label">{section.label}</span>
          {#each section.links as link}
            <a href={link.href} class="sidebar-link {link.href === '/docs/quickstart' ? 'active' : ''}">
              {link.label}
              {#if link.badge}
                <span class="sidebar-badge badge-{link.badge}">{link.badge}</span>
              {/if}
            </a>
          {/each}
        </div>
      {/each}
    </nav>

    <!-- Main content -->
    <main class="docs-main">

      <span class="section-tag">Quickstart</span>
      <h1 style="font-family:var(--font-display);font-size:2rem;font-weight:800;letter-spacing:-0.04em;color:var(--text-1);margin-bottom:12px;">Getting Started in 5 Minutes</h1>
      <p style="font-size:1rem;color:var(--text-2);line-height:1.75;margin-bottom:36px;">The Matatu Pulse API provides real-time vehicle telemetry, route data, ETA predictions, and historical trip records for Nairobi's matatu network. Here's how to make your first request.</p>

      <!-- Quickstart cards -->
      <div class="quickstart-grid">
        {#each [
          { title:"Your First API Call", desc:"Authenticate and pull live positions for all vehicles on a route in under 2 minutes.", href:"/docs/quickstart", icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>` },
          { title:"WebSocket Live Feed", desc:"Stream real-time GPS position updates as they happen — ideal for live map applications.", href:"/docs/websocket", icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.7A2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.15a16 16 0 006.94 6.94l1.41-1.41a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>` },
          { title:"ETA Predictions", desc:"Query real-time arrival estimates for any stage on any tracked route with congestion-aware modelling.", href:"/docs/api/eta", icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>` },
          { title:"Historical Trips", desc:"Access aggregated, anonymised trip history for research, planning, and analytics use cases.", href:"/docs/historical/trips", icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>` },
        ] as q}
          <a href={q.href} class="qs-card">
            <div class="qs-icon">{@html q.icon}</div>
            <div class="qs-title">{q.title}</div>
            <p class="qs-desc">{q.desc}</p>
          </a>
        {/each}
      </div>

      <!-- Authentication -->
      <div class="code-section">
        <h2>Authentication</h2>
        <p>All API requests require a Bearer token passed in the <code style="font-family:monospace;background:var(--surface);padding:2px 6px;border-radius:5px;font-size:0.82rem;color:var(--orange);">Authorization</code> header. Obtain your API key from the <a href="/account" style="color:var(--orange);text-decoration:none;">developer dashboard</a>.</p>

        <div class="code-tabs">
          <span class="code-tab active">cURL</span>
          <span class="code-tab">JavaScript</span>
          <span class="code-tab">Python</span>
        </div>
        <div class="code-block">
          <button class="code-copy">Copy</button>
          <pre><span class="code-cmt"># Get live vehicle positions for Route 46</span>
<span class="code-fn">curl</span> -X GET <span class="code-str">"https://api.matatupulse.co.ke/v1/routes/46/vehicles"</span> \
  -H <span class="code-str">"Authorization: Bearer YOUR_API_KEY"</span> \
  -H <span class="code-str">"Accept: application/json"</span></pre>
        </div>
      </div>

      <!-- Response example -->
      <div class="code-section">
        <h2>Example Response</h2>
        <p>Vehicle positions are returned as GeoJSON-compatible objects with heading, speed, and sacco metadata.</p>
        <div class="code-block" style="border-radius:14px;border-top:1px solid var(--rim);">
          <button class="code-copy">Copy</button>
         <pre>{@html `
  {
    <span class="code-str">"route_id"</span>: <span class="code-str">"46"</span>,
    <span class="code-str">"route_name"</span>: <span class="code-str">"CBD → Kangemi"</span>,
    <span class="code-str">"updated_at"</span>: <span class="code-str">"2025-02-21T08:14:32Z"</span>,
    <span class="code-str">"vehicles"</span>: [
      {
        <span class="code-str">"id"</span>: <span class="code-str">"KBZ-441A"</span>,
        <span class="code-str">"lat"</span>: <span class="code-num">-1.2687</span>,
        <span class="code-str">"lng"</span>: <span class="code-num">36.8031</span>,
        <span class="code-str">"heading"</span>: <span class="code-num">274</span>,
        <span class="code-str">"speed_kmh"</span>: <span class="code-num">32</span>,
        <span class="code-str">"sacco"</span>: <span class="code-str">"Supermetro"</span>,
        <span class="code-str">"occupancy"</span>: <span class="code-str">"medium"</span>,
        <span class="code-str">"timestamp"</span>: <span class="code-str">"2025-02-21T08:14:29Z"</span>
      }
    ]
  }
`}</pre>

<button class="code-copy">Copy</button>
        </div>
      </div>

      <!-- Endpoints -->
      <div class="code-section">
        <h2>Core Endpoints</h2>
        <p>All endpoints are versioned under <code style="font-family:monospace;background:var(--surface);padding:2px 6px;border-radius:5px;font-size:0.82rem;color:var(--orange);">https://api.matatupulse.co.ke/v1</code>. The WebSocket feed is available at <code style="font-family:monospace;background:var(--surface);padding:2px 6px;border-radius:5px;font-size:0.82rem;color:#a78bfa;">wss://stream.matatupulse.co.ke/v1</code>.</p>
        <table class="endpoint-table">
          <thead>
            <tr><th>Method</th><th>Endpoint</th><th>Description</th></tr>
          </thead>
          <tbody>
            {#each [
              { method:"GET", type:"get", path:"/routes", desc:"List all tracked routes with metadata" },
              { method:"GET", type:"get", path:"/routes/{id}/vehicles", desc:"Live vehicle positions for a route" },
              { method:"GET", type:"get", path:"/routes/{id}/eta", desc:"ETA predictions for all stops on a route" },
              { method:"GET", type:"get", path:"/vehicles/{id}", desc:"Single vehicle live status and metadata" },
              { method:"GET", type:"get", path:"/stops/{id}/arrivals", desc:"Upcoming arrivals at a specific stage" },
              { method:"GET", type:"get", path:"/fares", desc:"Current fare estimates by route" },
              { method:"WS",  type:"ws",  path:"/stream/routes/{id}", desc:"Real-time position stream for a route" },
              { method:"WS",  type:"ws",  path:"/stream/vehicles/{id}", desc:"Real-time stream for a single vehicle" },
            ] as e}
              <tr>
                <td><span class="method {e.type}">{e.method}</span></td>
                <td class="endpoint-path">{e.path}</td>
                <td>{e.desc}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Changelog -->
      <div class="code-section">
        <h2>Recent Changelog</h2>
        <p>Subscribe to <a href="/docs/changelog" style="color:var(--orange);text-decoration:none;">the full changelog</a> for detailed release notes.</p>
        <div class="changelog-list">
          {#each [
            { version:"v1.4.0", date:"Feb 2025", title:"Fares endpoint GA", desc:"The /fares endpoint is now generally available after 3 months in beta. Returns current and peak-hour estimates by route." },
            { version:"v1.3.2", date:"Jan 2025", title:"Occupancy field added", desc:"Vehicle responses now include an `occupancy` field (low / medium / high) derived from sacco-reported load data." },
            { version:"v1.3.0", date:"Nov 2024", title:"WebSocket heartbeats", desc:"Added 30s ping/pong heartbeat to WebSocket connections to prevent silent disconnections on mobile data." },
            { version:"v1.2.0", date:"Sep 2024", title:"Historical trip API", desc:"Opened historical trip data endpoints covering all routes back to January 2024 in 15-minute aggregated intervals." },
          ] as c}
            <div class="cl-item">
              <div class="cl-version">{c.version}</div>
              <div class="cl-body">
                <div class="cl-date">{c.date}</div>
                <div class="cl-title">{c.title}</div>
                <p class="cl-desc">{c.desc}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>

    </main>
  </div>

</div>