<script>
  import { onMount, onDestroy } from 'svelte';

  // ── State ────────────────────────────────────────────────────────────
  let phase = 'idle'; // idle | priming | loading | firing | running
  let theta = -Math.PI / 2;  // crank angle — start at TDC
  let omega = 0;              // angular velocity rad/s
  let rpm = 0;
  let loadPct = 0;
  let primes = 0;
  let kickT = 0;
  let leverDeg = -28;
  let sparkOn = false;
  let puffs = [];
  let pid = 0;
  let vibX = 0, vibY = 0;
  let raf, prev = 0;
  let heatGlow = 0;

  // ── Engine geometry ──────────────────────────────────────────────────
  const CX = 118, CY = 308; // crank center
  const R = 48, L = 115;    // crank radius, con-rod length

  const ppY = (a) =>
    CY + R * Math.sin(a) - Math.sqrt(Math.max(0, L * L - R * R * Math.cos(a) ** 2));

  // ── Fourier kick-force model ─────────────────────────────────────────
  // The kick impulse is decomposed into a Fourier cosine series with
  // exponential decay envelope — connecting the mechanical kick motion
  // to the crankpoint torque:
  //   F(t) = [Σₙ Aₙ · cos(n·ω₀·t)] · e^{−γ·t}
  //
  // Each harmonic Aₙ·cos(nω₀t) drives the crank at a distinct frequency.
  // The envelope e^{−γt} models energy dissipation through the ratchet.
  const HARM_AMPS  = [1.00, 0.46, 0.21, 0.11, 0.05, 0.025];
  const KICK_W0    = Math.PI * 5.2;
  const KICK_GAMMA = 7.8;
  const KICK_DUR   = 0.52;
  const KICK_SCALE = 5600;

  function kickForce(t) {
    if (t <= 0 || t >= KICK_DUR) return 0;
    let f = 0;
    for (let n = 0; n < HARM_AMPS.length; n++)
      f += HARM_AMPS[n] * Math.cos((n + 1) * KICK_W0 * t);
    return Math.max(0, f) * Math.exp(-KICK_GAMMA * t) * KICK_SCALE;
  }

  function harmonic(n, t) {
    if (t <= 0 || t >= KICK_DUR) return 0;
    return HARM_AMPS[n] * Math.cos((n + 1) * KICK_W0 * t)
      * Math.exp(-KICK_GAMMA * t) * KICK_SCALE;
  }

  // Pre-compute waveforms
  const WN = 90;
  const waveT   = Array.from({ length: WN + 1 }, (_, i) => (i / WN) * KICK_DUR);
  const waveF   = waveT.map(kickForce);
  const waveMax = Math.max(...waveF, 1);
  const harmonicWaves = [0, 1, 2].map(n => waveT.map(t => harmonic(n, t)));

  function pts2path(ys, W, H, ox, oy) {
    return ys.map((y, i) =>
      `${i === 0 ? 'M' : 'L'}${(ox + (i / WN) * W).toFixed(1)},${(oy + H - (y / waveMax) * H).toFixed(1)}`
    ).join(' ');
  }

  // ── Animation loop ───────────────────────────────────────────────────
  function frame(ts) {
    const dt = Math.min((ts - prev) / 1000, 0.033);
    prev = ts;

    if (phase !== 'idle') {
      if (kickT > 0) {
        omega += kickForce(kickT) * dt;
        kickT += dt;
        const half = KICK_DUR / 2;
        leverDeg = kickT < half
          ? -28 + (kickT / half) * 76
          : 48 - ((kickT - half) / half) * 76;
        if (kickT >= KICK_DUR) { kickT = 0; leverDeg = -28; }
      }

      if (phase === 'priming') omega *= Math.exp(-4.2 * dt);
      if (phase === 'loading') {
        omega *= Math.exp(-2 * dt);
        loadPct = Math.min(loadPct + dt * 28, 100);
        if (loadPct >= 100) {
          phase = 'firing'; omega = 2400;
          setTimeout(() => { phase = 'running'; }, 780);
        }
      }
      if (phase === 'firing') omega *= Math.exp(-0.5 * dt);
      if (phase === 'running') {
        const pulse = Math.max(0, Math.sin(theta)) * 185;
        omega += (860 + pulse - omega) * 2.8 * dt;
        vibX = Math.sin(ts / 32) * 1.4;
        vibY = Math.sin(ts / 48) * 0.7;
        heatGlow = Math.min(heatGlow + dt * 0.4, 1);
        if (Math.sin(theta) > 0.95 && Math.random() < 0.08)
          puffs = [...puffs.slice(-6), { id: pid++, born: ts, dx: (Math.random() - 0.5) * 8 }];
      } else {
        heatGlow = Math.max(heatGlow - dt * 0.5, 0);
      }

      omega = Math.max(omega, 0);
      theta += omega * dt;
      rpm = Math.round(omega * 60 / (2 * Math.PI));
      sparkOn = (phase === 'firing' || phase === 'running') && Math.sin(theta) < -0.86;
      puffs = puffs.filter(p => ts - p.born < 1100);
    }
    raf = requestAnimationFrame(frame);
  }

  // ── Kick handler ─────────────────────────────────────────────────────
  function doKick() {
    if (phase === 'idle') phase = 'priming';
    if (phase === 'priming') {
      primes++;
      kickT = 0.001;
      if (primes >= 3) { phase = 'loading'; loadPct = 0; }
    } else if (phase === 'loading') {
      kickT = 0.001;
    } else if (phase === 'running') {
      omega += 520;
    }
  }

  // ── Reactive geometry ────────────────────────────────────────────────
  $: cpX = CX + R * Math.cos(theta);
  $: cpY = CY + R * Math.sin(theta);
  $: _ppY = ppY(theta);

  // Counterweight — opposite the crank pin, weighted arc
  $: cwA = theta + Math.PI;
  $: cwArc = (() => {
    const rr = 35;
    const a1 = cwA - 0.7, a2 = cwA + 0.7;
    return [
      CX + 8 * Math.cos(a1), CY + 8 * Math.sin(a1),
      CX + rr * Math.cos(a1), CY + rr * Math.sin(a1),
      CX + rr * Math.cos(a2), CY + rr * Math.sin(a2),
      CX + 8 * Math.cos(a2),  CY + 8 * Math.sin(a2),
    ];
  })();
  $: cwPath = `M${cwArc[0].toFixed(1)},${cwArc[1].toFixed(1)} L${cwArc[2].toFixed(1)},${cwArc[3].toFixed(1)} A35,35,0,0,1,${cwArc[4].toFixed(1)},${cwArc[5].toFixed(1)} L${cwArc[6].toFixed(1)},${cwArc[7].toFixed(1)} Z`;

  // Kick lever pivot
  const KPX = 186, KPY = 290;
  $: kLR = leverDeg * Math.PI / 180;
  $: kTX = KPX + Math.cos(kLR) * 54;
  $: kTY = KPY + Math.sin(kLR) * 54;

  // Gauge arc (−225° → 45°, sweep 270°)
  const G = { cx: 60, cy: 60, r: 44 };
  $: rpmNorm = Math.min(rpm / 2600, 1);
  $: gaugeArc = (() => {
    const sa = (-225) * Math.PI / 180;
    const ea = sa + rpmNorm * 270 * Math.PI / 180;
    const x1 = G.cx + G.r * Math.cos(sa), y1 = G.cy + G.r * Math.sin(sa);
    const x2 = G.cx + G.r * Math.cos(ea), y2 = G.cy + G.r * Math.sin(ea);
    const large = rpmNorm > 0.5 ? 1 : 0;
    return `M${x1.toFixed(2)},${y1.toFixed(2)} A${G.r},${G.r},0,${large},1,${x2.toFixed(2)},${y2.toFixed(2)}`;
  })();
  $: needleA = (-225 + rpmNorm * 270) * Math.PI / 180;
  $: needleX = G.cx + 36 * Math.cos(needleA);
  $: needleY = G.cy + 36 * Math.sin(needleA);

  const LABELS = { idle: 'COLD', priming: 'PRIMING', loading: 'CHARGING', firing: 'IGNITION', running: 'RUNNING' };
  const COLORS = { idle: '#3a3a4e', priming: '#b050b8', loading: '#e88820', firing: '#f04020', running: '#28c870' };
  $: phaseLabel = LABELS[phase];
  $: phaseColor = COLORS[phase];

  // Piston heat tint (orange when running near TDC)
  $: pistonHeat = (phase === 'running' || phase === 'firing') ? Math.max(0, -Math.sin(theta)) : 0;

  onMount(() => { prev = performance.now(); raf = requestAnimationFrame(frame); });
  onDestroy(() => cancelAnimationFrame(raf));
</script>

<style>
  .wrap {
    position: relative;
    background: #0a0a0f;
    border-radius: 18px;
    padding: 20px 18px 18px;
    font-family: 'Courier New', 'Courier', monospace;
    user-select: none;
    overflow: hidden;
    max-width: 480px;
    border: 1px solid #181820;
  }
  .wrap::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 40% 15%, rgba(242,101,34,0.07) 0%, transparent 65%);
    pointer-events: none;
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }
  .brand {
    font-size: 10px;
    letter-spacing: 0.18em;
    color: #35354a;
    text-transform: uppercase;
  }
  .phase-badge {
    font-size: 9px;
    letter-spacing: 0.14em;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid currentColor;
    transition: color 0.4s, border-color 0.4s;
    text-transform: uppercase;
  }

  /* Layout */
  .body {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }
  .engine-col { flex: 0 0 auto; }
  .right-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }

  /* Gauge */
  .gauge-box {
    background: #0e0e16;
    border: 1px solid #181826;
    border-radius: 10px;
    padding: 8px 10px 6px;
  }
  .gauge-label {
    font-size: 8px;
    letter-spacing: 0.14em;
    color: #2a2a40;
    margin-bottom: 2px;
  }
  .rpm-row {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }
  .rpm-val {
    font-size: 26px;
    font-weight: 700;
    color: #ddd8c8;
    line-height: 1;
    letter-spacing: -0.02em;
    min-width: 60px;
    transition: color 0.3s;
  }
  .rpm-unit {
    font-size: 9px;
    color: #35354a;
    letter-spacing: 0.1em;
  }

  /* Fourier panel */
  .fourier-box {
    background: #0e0e16;
    border: 1px solid #181826;
    border-radius: 10px;
    padding: 8px 10px;
  }
  .f-label {
    font-size: 8px;
    color: #28283a;
    letter-spacing: 0.1em;
    margin-bottom: 4px;
    text-transform: uppercase;
  }

  /* Load bar */
  .load-box {
    background: #0e0e16;
    border: 1px solid #181826;
    border-radius: 10px;
    padding: 8px 10px;
    overflow: hidden;
  }
  .load-track {
    height: 5px;
    background: #15151e;
    border-radius: 3px;
    overflow: hidden;
    margin-top: 4px;
  }
  .load-fill {
    height: 100%;
    border-radius: 3px;
    background: linear-gradient(90deg, #f26522 0%, #ffa030 100%);
    transition: width 0.08s linear;
  }

  /* Prime indicators */
  .primes {
    display: flex;
    gap: 5px;
    justify-content: center;
    margin-top: 2px;
  }
  .prime-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    border: 1px solid #252530;
    transition: background 0.2s, border-color 0.2s;
  }
  .prime-dot.lit {
    background: #f26522;
    border-color: #f26522;
    box-shadow: 0 0 4px rgba(242,101,34,0.4);
  }

  /* Kick button */
  .kick-btn {
    width: 100%;
    margin-top: 14px;
    padding: 13px 0;
    background: transparent;
    border: 1px solid #f26522;
    border-radius: 10px;
    color: #f26522;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    letter-spacing: 0.16em;
    cursor: pointer;
    text-transform: uppercase;
    position: relative;
    overflow: hidden;
    transition: background 0.15s, transform 0.1s;
  }
  .kick-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(242,101,34,0.06), transparent);
    transform: translateX(-100%);
    transition: transform 0s;
  }
  .kick-btn:hover { background: rgba(242,101,34,0.06); }
  .kick-btn:active { transform: scale(0.97); }
  .kick-btn.loading { border-color: #e88820; color: #e88820; }
  .kick-btn.firing  { border-color: #f04020; color: #f04020; }
  .kick-btn.running { border-color: #28c870; color: #28c870; }

  @keyframes puff-rise {
    0%   { opacity: 0.5; transform: translateY(0)  scale(0.4); }
    100% { opacity: 0;   transform: translateY(-32px) scale(1.6); }
  }
  .puff {
    animation: puff-rise 1.1s ease-out forwards;
    pointer-events: none;
  }
  @keyframes spark-pop {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.6; transform: scale(1.3); }
  }
  .spark-el { animation: spark-pop 0.08s ease-in-out infinite; }

  @keyframes ignite-glow {
    0%, 100% { opacity: 0.55; }
    50%       { opacity: 0.85; }
  }
</style>

<div
  class="wrap"
  style="transform: translate({vibX}px, {vibY}px)"
>
  <!-- ── Header ─────────────────────────────────────────────────── -->
  <div class="header">
    <span class="brand">⬡ MATATU PULSE // ENGINE INIT</span>
    <span class="phase-badge" style="color:{phaseColor};border-color:{phaseColor}">{phaseLabel}</span>
  </div>

  <div class="body">
    <!-- ── Engine SVG ─────────────────────────────────────────── -->
    <div class="engine-col">
      <svg
        width="218"
        height="420"
        viewBox="0 0 236 420"
        style="display:block"
      >
        <!-- exhaust pipe -->
        <rect x="38" y="118" width="40" height="12" rx="3" fill="#111118" stroke="#1e1e28" stroke-width="0.6"/>
        <rect x="14" y="120" width="30" height="8" rx="4" fill="#0f0f16" stroke="#1c1c24" stroke-width="0.6"/>
        <!-- exhaust puffs -->
        {#each puffs as p (p.id)}
          <circle
            class="puff"
            cx="{12 + p.dx}"
            cy="122"
            r="7"
            fill="#1e1e28"
            opacity="0.5"
          />
        {/each}

        <!-- intake stub (right) -->
        <rect x="158" y="148" width="28" height="10" rx="3" fill="#111118" stroke="#1c1c26" stroke-width="0.6"/>

        <!-- ── Cylinder head ───────────────────────────────── -->
        <rect x="70" y="56" width="96" height="40" rx="5" fill="#151520" stroke="#1e1e2c" stroke-width="0.75"/>
        <!-- cooling fins -->
        {#each [64, 72, 80, 88] as fy}
          <line x1="72" y1="{fy}" x2="164" y2="{fy}" stroke="#1a1a28" stroke-width="1.4"/>
        {/each}

        <!-- ── Cylinder block ──────────────────────────────── -->
        <!-- left wall -->
        <rect x="70" y="94" width="26" height="208" rx="3" fill="#141420" stroke="#1c1c28" stroke-width="0.6"/>
        <!-- right wall -->
        <rect x="140" y="94" width="26" height="208" rx="3" fill="#141420" stroke="#1c1c28" stroke-width="0.6"/>
        <!-- bore interior -->
        <rect x="96" y="94" width="44" height="208" fill="#090910" stroke="#141420" stroke-width="0.5"/>

        <!-- heat glow in bore when running -->
        {#if heatGlow > 0}
          <rect
            x="96" y="94" width="44" height="80"
            fill="rgba(242,101,34,{heatGlow * 0.12})"
          />
        {/if}

        <!-- ── Crankcase ───────────────────────────────────── -->
        <rect x="58" y="290" width="160" height="88" rx="6" fill="#0f0f18" stroke="#1c1c28" stroke-width="0.75"/>

        <!-- ── Oil pan ─────────────────────────────────────── -->
        <rect x="68" y="372" width="140" height="26" rx="5" fill="#0c0c14" stroke="#18181e" stroke-width="0.6"/>
        <!-- oil fill plug -->
        <rect x="106" y="376" width="26" height="7" rx="3" fill="#141420" stroke="#1c1c28" stroke-width="0.5"/>

        <!-- ── Spark plug ──────────────────────────────────── -->
        <rect x="112" y="56" width="12" height="20" rx="2" fill="#181824" stroke="#252535" stroke-width="0.5"/>
        <rect x="115" y="58" width="6" height="14" rx="1" fill="#0e0e18"/>
        <!-- electrode tip -->
        <line x1="118" y1="74" x2="118" y2="82" stroke="#303040" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="114" y1="80" x2="122" y2="80" stroke="#252535" stroke-width="1" stroke-linecap="round"/>

        <!-- spark flash -->
        {#if sparkOn}
          <g class="spark-el">
            <circle cx="118" cy="78" r="7" fill="rgba(255,220,100,0.18)"/>
            <circle cx="118" cy="78" r="3" fill="#fff8e0" opacity="0.95"/>
            <line x1="116" y1="81" x2="113" y2="87" stroke="#ffd060" stroke-width="1.2" stroke-linecap="round"/>
            <line x1="120" y1="81" x2="123" y2="87" stroke="#ffd060" stroke-width="1.2" stroke-linecap="round"/>
            <line x1="118" y1="75" x2="118" y2="70" stroke="#fff8e0" stroke-width="1" stroke-linecap="round"/>
          </g>
        {/if}

        <!-- ── Piston ──────────────────────────────────────── -->
        <!-- piston body -->
        <rect
          x="{118 - 21}"
          y="{_ppY - 14}"
          width="42"
          height="28"
          rx="3"
          fill="rgba({40 + pistonHeat * 30},{40 + pistonHeat * 12},{52},1)"
          stroke="#303042"
          stroke-width="0.75"
        />
        <!-- piston rings (two thin lines) -->
        <line
          x1="{97}" y1="{_ppY - 7}" x2="{139}" y2="{_ppY - 7}"
          stroke="#282838" stroke-width="1.5"
        />
        <line
          x1="{97}" y1="{_ppY}" x2="{139}" y2="{_ppY}"
          stroke="#282838" stroke-width="1.5"
        />
        <!-- wrist pin -->
        <circle cx="118" cy="{_ppY + 10}" r="5" fill="#1a1a28" stroke="#252535" stroke-width="0.5"/>

        <!-- ── Connecting rod ──────────────────────────────── -->
        <!-- big-end journal (at crank pin) -->
        <circle cx="{cpX.toFixed(1)}" cy="{cpY.toFixed(1)}" r="9" fill="#1c1c28" stroke="#282835" stroke-width="0.75"/>
        <!-- rod shank -->
        <line
          x1="118" y1="{_ppY + 10}"
          x2="{cpX.toFixed(1)}" y2="{cpY.toFixed(1)}"
          stroke="#222232"
          stroke-width="7"
          stroke-linecap="round"
        />
        <line
          x1="118" y1="{_ppY + 10}"
          x2="{cpX.toFixed(1)}" y2="{cpY.toFixed(1)}"
          stroke="#2c2c3e"
          stroke-width="4"
          stroke-linecap="round"
        />
        <!-- inner highlight on rod -->
        <line
          x1="118" y1="{_ppY + 10}"
          x2="{cpX.toFixed(1)}" y2="{cpY.toFixed(1)}"
          stroke="#323244"
          stroke-width="1.5"
          stroke-linecap="round"
        />

        <!-- ── Crankshaft ──────────────────────────────────── -->
        <!-- counterweight -->
        <path d="{cwPath}" fill="#161624" stroke="#22222e" stroke-width="0.6"/>
        <!-- main journal disc -->
        <circle cx="{CX}" cy="{CY}" r="22" fill="#1a1a26" stroke="#242432" stroke-width="0.75"/>
        <!-- crank throw arm -->
        <line
          x1="{CX}" y1="{CY}"
          x2="{cpX.toFixed(1)}" y2="{cpY.toFixed(1)}"
          stroke="#202030"
          stroke-width="8"
          stroke-linecap="round"
        />
        <line
          x1="{CX}" y1="{CY}"
          x2="{cpX.toFixed(1)}" y2="{cpY.toFixed(1)}"
          stroke="#282840"
          stroke-width="4"
          stroke-linecap="round"
        />
        <!-- crank pin -->
        <circle
          cx="{cpX.toFixed(1)}"
          cy="{cpY.toFixed(1)}"
          r="7"
          fill="#1e1e2e"
          stroke="#2a2a3c"
          stroke-width="0.75"
        />
        <!-- main bearing -->
        <circle cx="{CX}" cy="{CY}" r="9" fill="#111118" stroke="#1c1c28" stroke-width="0.5"/>
        <circle cx="{CX}" cy="{CY}" r="3.5" fill="#0a0a10"/>

        <!-- ── Kick-start mechanism ─────────────────────────── -->
        <!-- shaft collar -->
        <circle cx="{KPX}" cy="{KPY}" r="8" fill="#181820" stroke="#22222e" stroke-width="0.75"/>
        <circle cx="{KPX}" cy="{KPY}" r="4" fill="#0f0f16"/>
        <!-- lever arm -->
        <line
          x1="{KPX}" y1="{KPY}"
          x2="{kTX.toFixed(1)}" y2="{kTY.toFixed(1)}"
          stroke="#1c1c28"
          stroke-width="8"
          stroke-linecap="round"
        />
        <line
          x1="{KPX}" y1="{KPY}"
          x2="{kTX.toFixed(1)}" y2="{kTY.toFixed(1)}"
          stroke="#262636"
          stroke-width="5"
          stroke-linecap="round"
        />
        <line
          x1="{KPX}" y1="{KPY}"
          x2="{kTX.toFixed(1)}" y2="{kTY.toFixed(1)}"
          stroke="#303044"
          stroke-width="2"
          stroke-linecap="round"
        />
        <!-- kick pedal -->
        <rect
          x="{kTX - 14}" y="{kTY - 5}"
          width="28" height="10"
          rx="3"
          fill="#1e1e2e"
          stroke="#2c2c40"
          stroke-width="0.6"
          transform="rotate({leverDeg.toFixed(1)}, {kTX.toFixed(1)}, {kTY.toFixed(1)})"
        />
        <!-- grip texture lines on pedal -->
        {#each [-6, -2, 2, 6] as dx}
          <line
            x1="{kTX + dx}" y1="{kTY - 5}"
            x2="{kTX + dx}" y2="{kTY + 5}"
            stroke="#282838" stroke-width="0.6"
            transform="rotate({leverDeg.toFixed(1)}, {kTX.toFixed(1)}, {kTY.toFixed(1)})"
          />
        {/each}

        <!-- kick → crank connection indicator -->
        {#if kickT > 0}
          <line
            x1="{KPX}" y1="{KPY}"
            x2="{CX}" y2="{CY}"
            stroke="rgba(242,101,34,0.18)"
            stroke-width="1"
            stroke-dasharray="3 3"
          />
        {/if}

        <!-- border overlay to re-crisp edges -->
        <rect x="70" y="56" width="96" height="40" rx="5" fill="none" stroke="#1e1e2c" stroke-width="0.5"/>
        <rect x="70" y="94" width="96" height="208" rx="0" fill="none" stroke="none"/>
      </svg>
    </div>

    <!-- ── Right panel ────────────────────────────────────── -->
    <div class="right-col">

      <!-- RPM gauge -->
      <div class="gauge-box">
        <div class="gauge-label">TACHOMETER</div>
        <svg width="120" height="82" viewBox="0 0 120 82" style="display:block;margin:0 auto">
          <!-- gauge track -->
          <path
            d="M14,68 A46,46,0,1,1,106,68"
            fill="none"
            stroke="#141420"
            stroke-width="7"
            stroke-linecap="round"
          />
          <!-- redline zone -->
          {#if rpmNorm > 0}
            <path
              d="{gaugeArc}"
              fill="none"
              stroke="{rpmNorm > 0.85 ? '#e83020' : rpmNorm > 0.6 ? '#e88020' : '#f26522'}"
              stroke-width="7"
              stroke-linecap="round"
              opacity="0.9"
            />
          {/if}
          <!-- tick marks -->
          {#each [0, 0.25, 0.5, 0.75, 1.0] as t}
            {@const ta = (-225 + t * 270) * Math.PI / 180}
            <line
              x1="{(60 + 36 * Math.cos(ta)).toFixed(1)}" y1="{(60 + 36 * Math.sin(ta)).toFixed(1)}"
              x2="{(60 + 43 * Math.cos(ta)).toFixed(1)}" y2="{(60 + 43 * Math.sin(ta)).toFixed(1)}"
              stroke="#252535" stroke-width="1" stroke-linecap="round"
            />
          {/each}
          <!-- needle -->
          <line
            x1="60" y1="60"
            x2="{needleX.toFixed(1)}" y2="{needleY.toFixed(1)}"
            stroke="#f26522"
            stroke-width="1.2"
            stroke-linecap="round"
            opacity="0.9"
          />
          <circle cx="60" cy="60" r="3" fill="#181824"/>
        </svg>
        <div class="rpm-row">
          <span class="rpm-val" style="color:{rpmNorm > 0.85 ? '#e83020' : '#ddd8c8'}">{rpm.toLocaleString()}</span>
          <span class="rpm-unit">RPM</span>
        </div>
      </div>

      <!-- Fourier waveform -->
      <div class="fourier-box">
        <div class="f-label">KICK IMPULSE — FOURIER ∑</div>
        <svg width="100%" height="58" viewBox="0 0 158 58" preserveAspectRatio="none" style="display:block">
          <!-- harmonic components (dim) -->
          {#each harmonicWaves as hw, ni}
            <path
              d="{pts2path(hw, 158, 48, 0, 5)}"
              fill="none"
              stroke="{['#f2652240','#f8a02030','#ffd06020'][ni]}"
              stroke-width="0.8"
            />
          {/each}
          <!-- composite waveform -->
          <path
            d="{pts2path(waveF, 158, 48, 0, 5)}"
            fill="none"
            stroke="#f26522"
            stroke-width="1.5"
            opacity="{kickT > 0 ? 1 : 0.35}"
          />
          <!-- active scan line -->
          {#if kickT > 0}
            <line
              x1="{(kickT / KICK_DUR * 158).toFixed(1)}" y1="5"
              x2="{(kickT / KICK_DUR * 158).toFixed(1)}" y2="53"
              stroke="rgba(255,208,80,0.5)"
              stroke-width="0.8"
            />
          {/if}
          <!-- axes -->
          <line x1="0" y1="53" x2="158" y2="53" stroke="#1a1a26" stroke-width="0.5"/>
        </svg>
        <div style="display:flex;justify-content:space-between;font-size:8px;color:#252538;letter-spacing:0.08em;margin-top:1px">
          <span>N=1</span><span>N=3</span><span>N=5</span>
          <span>∑harmonics</span>
        </div>
      </div>

      <!-- Loading / charge bar -->
      {#if phase === 'loading' || phase === 'firing'}
        <div class="load-box">
          <div class="f-label">COMPRESSION CHARGE</div>
          <div class="load-track">
            <div class="load-fill" style="width:{loadPct.toFixed(1)}%"/>
          </div>
          <div style="text-align:right;font-size:9px;color:#e88820;margin-top:3px">
            {loadPct.toFixed(0)}%
          </div>
        </div>
      {/if}

      <!-- Running stats -->
      {#if phase === 'running' || phase === 'firing'}
        <div class="fourier-box">
          <div class="f-label">ENGINE STATUS</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px">
            <div>
              <div style="font-size:8px;color:#252538;letter-spacing:0.08em">TEMP</div>
              <div style="font-size:13px;color:#e88820">{(80 + heatGlow * 70).toFixed(0)}°C</div>
            </div>
            <div>
              <div style="font-size:8px;color:#252538;letter-spacing:0.08em">LOAD</div>
              <div style="font-size:13px;color:#28c870">{(rpmNorm * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>
      {/if}

      <!-- Prime indicators -->
      <div class="primes">
        {#each [0, 1, 2] as i}
          <div class="prime-dot" class:lit="{primes > i}"/>
        {/each}
      </div>

    </div>
  </div>

  <!-- ── Kick button ──────────────────────────────────────────── -->
  <button
    class="kick-btn"
    class:loading="{phase === 'loading'}"
    class:firing="{phase === 'firing'}"
    class:running="{phase === 'running'}"
    on:click={doKick}
    on:keydown={(e) => e.key === ' ' && doKick()}
    aria-label="Kick start engine"
  >
    {#if phase === 'idle'}
      ↓ KICK START
    {:else if phase === 'priming'}
      ↓ PRIME — {3 - primes} MORE KICK{3 - primes !== 1 ? 'S' : ''} NEEDED
    {:else if phase === 'loading'}
      ↻ CHARGING COMPRESSION...
    {:else if phase === 'firing'}
      ⚡ IGNITION SEQUENCE
    {:else}
      ↑ REV ENGINE
    {/if}
  </button>
</div>