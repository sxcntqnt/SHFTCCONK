<script lang="ts">
  import { onMount } from 'svelte';
  import { tick } from 'svelte';

  interface Destination { destination: string; destination_hexid: string; }
  interface RouteItem {
    route_number: string | number;
    pickup_point: { pickup_point: string; pickup_hexid: string };
    destinations: Destination[];
  }

  let routes: RouteItem[] = [];
  let scored: any[] = [];
  let isLoading = true;
  let error: string | null = null;

  const TOKENS = {
    accent: '#00f2ff',
    accentGlobal: '#0ff'
  };

  function getTimeState() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour <= 9 || hour >= 16 && hour <= 20) return 'peak';
    if (hour >= 10 && hour <= 15) return 'mid';
    return 'off';
  }

  async function fetchRoutes() {
    try {
      const res = await fetch('https://raw.githubusercontent.com/sxcntqnt/sxcntqnt.github.io/refs/heads/main/json/YesBana.json');
      const json = await res.json();
      routes = json.non_null_objects || json;
    } catch (e) {
      error = 'Network Sync Failed';
    } finally {
      isLoading = false;
    }
  }

  function routeScore(num: string | number): number {
    const n = parseInt(String(num).replace(/\D/g, '') || '7', 10);
    return parseFloat((0.6 + ((n * 17 + 13) % 37) / 100).toFixed(2));
  }

  function bayesScore(route: RouteItem, alpha = 2, beta = 2) {
    const prior = routeScore(route.route_number);
    const timeFactor = getTimeState() === 'peak' ? 1.2 : 0.8;
    const loadFactor = (route.destinations?.length || 1) / 10;
    const posterior = (alpha + prior * timeFactor) / (alpha + beta + loadFactor);
    return Math.min(Math.max(posterior, 0), 1);
  }

  function classify(s: number) {
    if (s >= 0.85) return 'great';
    if (s >= 0.72) return 'good';
    if (s >= 0.58) return 'warn';
    return 'low';
  }

  function label(cls: string) {
    return cls === 'great' ? 'Optimal' : cls === 'good' ? 'Stable' : cls === 'warn' ? 'Moderate' : 'Congested';
  }

  function getGradient(cls: string, posterior: number) {
    const base = cls === 'great' ? '#0ff' : cls === 'good' ? '#0f0' : cls === 'warn' ? '#ff0' : '#f00';
    const secondary = cls === 'great' ? '#00cfff' : cls === 'good' ? '#00aa00' : cls === 'warn' ? '#ffaa00' : '#ff3300';
    const intensity = Math.floor(posterior * 100);
    return `linear-gradient(90deg, ${base} ${intensity}%, ${secondary} 100%)`;
  }

  function updateScores() {
    scored = routes.map(r => {
    let posterior = bayesScore(r) + (Math.random() - 0.5) * 0.05; // small fluctuation

    // exaggerate some routes randomly for visual drama
    if (Math.random() < 0.2) posterior *= 1.2;

    posterior = Math.min(Math.max(posterior, 0), 1);

    const cls = classify(posterior);
    return { ...r, posterior, cls, label: label(cls), accent: TOKENS.accent };
  });
  }

  onMount(async () => {
    await fetchRoutes();
    updateScores();
    const interval = setInterval(() => updateScores(), 2000); // dynamic updates
    return () => clearInterval(interval);
  });
</script>

<div class="os">
  <header class="header">
    <div class="brand">
      <div class="pulse" style="background:{TOKENS.accentGlobal}; box-shadow:0 0 10px {TOKENS.accentGlobal};"></div>
      <h1>TRANSIT OS DASHBOARD</h1>
    </div>
    <div class="iq">
      <svg viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#222" stroke-width="2.5"/>
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="{TOKENS.accentGlobal}" stroke-width="2.5"
          stroke-dasharray="{scored.length ? scored.reduce((a,r)=>a.posterior + a,0)/scored.length*100 : 0},100"
          stroke-linecap="round"/>
      </svg>
      <span>{scored.length ? ((scored.reduce((a,r)=>a.posterior+a,0)/scored.length)*100).toFixed(1) : '0.0'}</span>
    </div>
  </header>

  <div class="viewport">
    {#if isLoading}
      <div class="loader">
        <div class="scan" style="background:{TOKENS.accentGlobal}; box-shadow:0 0 10px {TOKENS.accentGlobal};"></div>
        <p>LOADING ROUTE DATA...</p>
      </div>
    {:else if error}
      <p>{error}</p>
    {:else}
      {#each scored as r (r.route_number)}
        <div class="card" style="--accent:{r.accent}">
          <div>
            <div class="route">{r.route_number}</div>
            <div class="nodes">{r.destinations?.length || 0} NODES</div>
          </div>
          <div class="mid">
            <div class="origin">{r.pickup_point?.pickup_point || 'TERMINUS'}</div>
            <div class="bar">
              <div class="fill" style="width:{r.posterior*100}%; background:{getGradient(r.cls,r.posterior)};"></div>
            </div>
          </div>
          <div class="right">
            <div class="tag">{r.label}</div>
            <div class="pct">{(r.posterior*100).toFixed(0)}%</div>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <footer class="footer">
    AUTHENTICATED ACCESS: DYNAMIC BAYES v2.0
  </footer>
</div>

<style>
  .os {
    --bg: #050505;
    --glass: rgba(255,255,255,0.05);
    --border: rgba(255,255,255,0.08);
    height: 100%;
    display: flex;
    flex-direction: column;
    background: radial-gradient(circle at top, #111, #050505);
    color: white;
    font-family: 'JetBrains Mono', monospace;
  }
  .header {
    display: flex;
    justify-content: space-between;
    padding: 20px;
    backdrop-filter: blur(12px);
    background: var(--glass);
    border-bottom: 1px solid var(--border);
  }
  .brand { display: flex; gap: 10px; align-items: center; }
  .brand h1 { font-size: 0.9rem; letter-spacing: 0.2em; color: var(--accent-global); }
  .pulse { width: 8px; height: 8px; background: var(--accent-global); border-radius: 50%; box-shadow: 0 0 10px var(--accent-global); animation: pulse 1.5s infinite; }
  @keyframes pulse { 50% { transform: scale(1.5); opacity: 0.5; } }
  .iq { width: 50px; position: relative; }
  .iq svg { transform: rotate(-90deg); }
  .iq span { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; }
  .viewport { flex: 1; overflow: auto; padding: 20px; }
  .card { display: flex; gap: 16px; padding: 14px; margin-bottom: 10px; backdrop-filter: blur(14px); background: var(--glass); border: 1px solid var(--border); border-radius: 10px; position: relative; overflow: hidden; transition: 0.3s; }
  .card::before { content: ""; position: absolute; inset: 0; border-radius: 10px; background: linear-gradient(120deg, transparent, var(--accent), transparent); opacity: 0.4; }
  .card:hover { transform: translateY(-3px); box-shadow: 0 0 20px var(--accent); }
  .route { font-weight: 900; font-size: 1.1rem; }
  .nodes { font-size: 0.6rem; color: #666; }
  .mid { flex: 1; }
  .origin { font-size: 0.7rem; color: #aaa; margin-bottom: 6px; }
  .bar { height: 4px; background: #222; border-radius: 2px; overflow: hidden; }
	.fill {
    height: 100%;
    position: relative;
    overflow: hidden;
    background-size: 200% 100%;
    animation: flow 3s linear infinite;
    border-radius: 2px;
    transition: width 0.8s ease-in-out; /* Smooth progressive bar */
  }
  .fill::after { content:""; position:absolute; inset:0; background: linear-gradient(120deg, rgba(255,255,255,0) 20%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 80%); animation: sweep 2s linear infinite; }
  @keyframes flow { 0% { background-position:0 0; } 100% { background-position:200% 0; } }
  @keyframes sweep { 0% { transform:translateX(-100%);} 100% { transform:translateX(100%);} }
  .card:hover .fill { filter: brightness(1.4) saturate(1.2); }
  .right { text-align: right; }
  .tag { font-size: 0.6rem; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 6px; }
  .pct { font-size: 1rem; font-weight: 900; }
  .loader { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .scan { width: 100px; height: 2px; background: var(--accent-global); box-shadow: 0 0 10px var(--accent-global); animation: scan 2s infinite; }
  @keyframes scan { 50% { transform: translateY(20px); opacity: 1; } 0%,100% { transform: translateY(-20px); opacity: 0; } }
  .footer { padding: 10px 20px; font-size: 0.55rem; color: #555; border-top: 1px solid #111; }
</style>