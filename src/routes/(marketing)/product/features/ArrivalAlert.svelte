script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { onMount } from 'svelte';

  export interface Alert {
    id: string;
    vehicleId: string;
    routeNum: string;
    message: string;
    eta: string; 
    severity: "early" | "delay" | "info";
  }

  let alerts = $state<Alert[]>([]);

  const routePool = ["5", "12", "82", "101", "44", "9", "27"];
  const vehiclePrefix = ["BUS-", "VAN-", "EXP-"];
  const messagePool = ["Approaching Station", "Boarding active", "Final approach", "Inbound: Express", "On-site"];
  const severities: ("early" | "delay" | "info")[] = ["early", "early", "early", "delay", "info"]; 

  function addRandomAlert() {
    const id = Math.random().toString(36).substring(2, 9);
    const newAlert: Alert = {
      id,
      vehicleId: vehiclePrefix[Math.floor(Math.random() * vehiclePrefix.length)] + Math.floor(Math.random() * 999),
      routeNum: routePool[Math.floor(Math.random() * routePool.length)],
      message: messagePool[Math.floor(Math.random() * messagePool.length)],
      eta: (Math.floor(Math.random() * 8) + 1) + " min",
      severity: severities[Math.floor(Math.random() * severities.length)]
    };
    alerts = [newAlert, ...alerts].slice(0, 6); 
  }

  function tickTime() {
    if (Math.random() > 0.6) addRandomAlert();
    alerts = alerts.map(a => {
      const mins = parseFloat(a.eta);
      if (mins <= 0.5) return null;
      return { ...a, eta: (mins - 0.5).toFixed(1) + " min" };
    }).filter((a): a is Alert => a !== null);
  }

  const getMins = (eta: string) => {
    const val = parseFloat(eta.replace(/[^\d.]/g, ''));
    return isNaN(val) ? 0 : val;
  };

  let enrichedAlerts = $derived(alerts.map((a) => {
    const mins = getMins(a.eta);
    const criticality = Math.max(0, Math.min(1, 1 - mins / 12));
    
    const meta = {
      delay: { label: "DELAYED", cls: "delay", icon: "⚠", color: "#f26522", bg: "rgba(242, 101, 34, 0.08)" },
      early: { label: "INBOUND", cls: "early", icon: "◈", color: "#00ff9d", bg: "rgba(0, 255, 157, 0.12)" },
      info:  { label: "EN ROUTE", cls: "info", icon: "○", color: "#00d1ff", bg: "rgba(0, 209, 255, 0.08)" }
    }[a.severity];

    return {
      ...a,
      ...meta,
      mins,
      progress: Math.max(2, Math.min(98, criticality * 100)),
      // Card-level glow triggers when vehicle is close (<= 3 mins)
      cardGlow: mins <= 3 ? `0 0 25px ${meta.color}33` : '0 4px 12px rgba(0,0,0,0.5)'
    };
  }));

  onMount(() => {
    addRandomAlert();
    addRandomAlert();
    const timer = setInterval(tickTime, 3500);
    return () => clearInterval(timer);
  });
</script>

<div class="alerts-wrap">
  <div class="alerts-header">
    <div class="alerts-title">
      <div class="status-dot"></div>
      Active Fleet Telemetry
    </div>
    <div class="alerts-count">
      <span class="count-val">{alerts.length}</span> UNITS DETECTED
    </div>
  </div>

  <div class="alerts-list">
    {#if enrichedAlerts.length === 0}
      <div class="empty" in:fade> Establishing Uplink... </div>
    {:else}
      {#each enrichedAlerts as alert (alert.id)}
        <div 
          animate:flip={{ duration: 600 }}
          class="alert-card alert-{alert.cls}" 
          style:box-shadow={alert.cardGlow}
          style:background={alert.bg}
          transition:fly={{ y: 20, duration: 400 }}
        >
          <div class="accent-line" style:background={alert.color}></div>
          <div class="alert-body">
            <div class="alert-top">
              <div class="vehicle-info">
                <svg class="bus-icon" viewBox="0 0 24 24" fill="none" stroke={alert.color} stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h8m-8 4h8m-9 8h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM8 21v-2m8 2v-2" />
                </svg>
                <div class="naming">
                  <span class="route-badge">ROUTE {alert.routeNum}</span>
                  <span class="vehicle-id">{alert.vehicleId}</span>
                </div>
              </div>
              <span class="tag" style:color={alert.color} style:border-color="{alert.color}66">
                <span class="tag-icon">{alert.icon}</span> {alert.label}
              </span>
            </div>

            <div class="alert-msg">{alert.message}</div>

            <div class="eta-container">
              <div class="track-info">
                <span class="track-label">DOCKING SEQUENCE</span>
                <div class="eta-display" class:urgent={alert.mins <= 2}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span class="eta-text">{alert.eta}</span>
                </div>
              </div>
              <div class="progress-outer">
                <div class="progress-inner" style:width="{alert.progress}%" style:background="linear-gradient(90deg, transparent, {alert.color})"></div>
                <div class="glow-head" style:left="{alert.progress}%" style:background={alert.color} style:box-shadow="0 0 15px {alert.color}"></div>
              </div>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .alerts-wrap {
    width: 100%;
    height: 100vh;
    background: radial-gradient(circle at top right, #121212, #050505);
    display: flex;
    flex-direction: column;
    padding: 30px;
    box-sizing: border-box;
    'JetBrains Mono', monospace;
    color: #fff;
    overflow: hidden;
  }

  .alerts-header { display: flex; justify-content: space-between; align-items: center; 25px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 20px; }
  .alerts-title { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.15em; color: #555; display: flex; align-items: center; gap: 12px; }
  .status-dot { width: 8px; height: 8px; background: #00ff9d; border-radius: 50%; box-shadow: 0 0 12px #00ff9d; animation: pulse 2s infinite; }
  @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }

  .alerts-list { flex: 1; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
  
  .alert-card { 
    position: relative; 
    border-radius: 12px; 
    border: 1px solid rgba(255, 255, 255, 0.05); 
    backdrop-filter: blur(20px); 
    transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  }

  .accent-line { position: absolute; left: 0; top: 20%; height: 60%; width: 3px; border-radius: 0 4px 4px 0; }
  .alert-body { padding: 20px 24px; }
  .alert-top { display: flex; justify-content: space-between; align-items: flex-start; 12px; }
  .vehicle-info { display: flex; align-items: center; gap: 14px; }
  .bus-icon { width: 22px; height: 22px; }
  .naming { display: flex; flex-direction: column; }
  .route-badge { font-size: 0.55rem; color: #ffffff44; letter-spacing: 0.1em; }
  .vehicle-id { font-size: 1.1rem; font-weight: 700; color: #fff; }
  .tag { font-size: 0.6rem; font-weight: 800; padding: 4px 12px; border-radius: 20px; border: 1px solid; display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.3); }
  .alert-msg { font-size: 0.8rem; color: #999; 24px; }
  
  .eta-container { display: flex; flex-direction: column; gap: 10px; }
  .track-info { display: flex; justify-content: space-between; align-items: center; }
  .track-label { font-size: 0.55rem; font-weight: 700; color: #666; letter-spacing: 0.15em; }

  /* --- OLED TIMER STYLES --- */
  .eta-display {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    background: #000;
    border-radius: 6px;
    color: #fff;
    border: 1px solid #222;
    position: relative;
    will-change: opacity, box-shadow;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.05);
    animation: oled-flicker 0.15s infinite, timer-breathe 4s infinite ease-in-out;
  }

  .eta-text { font-size: 0.95rem; font-weight: 800; font-variant-numeric: tabular-nums; }

  .urgent { 
    color: #00ff9d; 
    border-color: rgba(0, 255, 157, 0.4); 
    text-shadow: 0 0 8px rgba(0, 255, 157, 0.6);
    animation: 
      urgent-pulse 0.8s infinite alternate, 
      oled-flicker 0.1s infinite,
      urgent-glow 1.5s infinite ease-in-out !important;
  }

  @keyframes oled-flicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.96; }
  }

  @keyframes timer-breathe {
    0%, 100% { box-shadow: 0 0 8px rgba(255, 255, 255, 0.03); }
    50% { box-shadow: 0 0 15px rgba(255, 255, 255, 0.08); }
  }

  @keyframes urgent-glow {
    0%, 100% { box-shadow: 0 0 10px rgba(0, 255, 157, 0.1); }
    50% { box-shadow: 0 0 30px rgba(0, 255, 157, 0.4); }
  }

  @keyframes urgent-pulse { 
    from { transform: scale(1); } 
    to { transform: scale(1.05); } 
  }

  /* --- PROGRESS BAR --- */
  .progress-outer { height: 4px; background: rgba(255, 255, 255, 0.03); border-radius: 10px; position: relative; 4px; }
  .progress-inner { height: 100%; border-radius: 10px; transition: width 3.5s linear; }
  .glow-head {
    position: absolute;
    top: 50%;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: left 3.5s linear;
    z-index: 2;
  }

  .empty { height: 100%; display: flex; align-items: center; justify-content: center; color: #444; font-size: 0.7rem; letter-spacing: 0.2em; }
</style>

