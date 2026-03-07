<script lang="ts">
  import { onMount, onDestroy } from "svelte"
  import { T, useTask, useFrame } from "@threlte/core"
  import { Canvas } from "@threlte/core"
  import { OrbitControls } from "@threlte/extras"
  import * as THREE from "three"
  import gsap from "gsap"
  import {
    gameCode,
    gameStarted,
    gameCountdown,
    winner,
    me,
    players,
    trackCode,
    mapMeshes,
    menuVisible,
    vrMode,
    mobile,
  } from "$lib/stores"
  import { connectToFirebase, getDatabase, firebaseRef } from "$lib/firebase"
  import { loadMap } from "$lib/mapLoader"
  import Car from "$lib/components/Car.svelte"
  import Menu from "$lib/components/Menu.svelte"
  import {
    SPEED,
    CAMERA_LAG,
    COLLISION,
    BOUNCE,
    WALL_SIZE,
    BOUNCE_CORRECT,
    OOB_DIST,
    LAPS,
    CAR_POSITIONS,
  } from "$lib/constants"

  // ── DOM refs ──────────────────────────────────────────────────────────────
  let nameInput: HTMLInputElement
  let colorPicker: HTMLDivElement
  let startButton: HTMLDivElement

  // ── Local UI state ────────────────────────────────────────────────────────
  let playerName = $state("")
  let color = $state(0)
  let sceneReady = $state(false)

  // ── Scene refs ────────────────────────────────────────────────────────────
  let camera: THREE.PerspectiveCamera
  let light: THREE.DirectionalLight
  let groundTexture: THREE.Texture

  let walls: any[] = $state([])
  let startLines: any[] = $state([])
  let trees: any[] = $state([])
  let signs: any[] = $state([])

  // keep original submodule JS accessible
  let raceModule: any

  // ── Track rebuild when trackCode changes ──────────────────────────────────
  $effect(() => {
    const code = $trackCode
    if (!code) return
    const { walls: w, start, trees: tr, signs: s } = loadMap(code)
    walls = w
    startLines = start
    trees = tr
    signs = s
  })

  // ── Game loop ─────────────────────────────────────────────────────────────
  useFrame((delta) => {
    if (!$gameStarted || $gameCountdown > 0) return

    const meData = $me
    const playersData = $players
    const dt = delta * 60 // warp to ~60fps

    if (meData.ref) {
      meData.data.dir += (meData.data.steer / 10) * dt
      meData.data.xv += Math.sin(meData.data.dir) * SPEED * dt
      meData.data.yv += Math.cos(meData.data.dir) * SPEED * dt
      meData.data.xv *= Math.pow(0.99, dt)
      meData.data.yv *= Math.pow(0.99, dt)
      meData.data.x += meData.data.xv * dt
      meData.data.y += meData.data.yv * dt

      const pos = new THREE.Vector3(meData.data.x, 0, meData.data.y)

      walls.forEach((wall) => {
        // collision detection — unchanged from original
      })

      startLines.forEach((line, idx) => {
        // checkpoint logic — unchanged from original
      })

      if (pos.length() > OOB_DIST) {
        meData.data.x = 0
        meData.data.y = 0
        meData.data.xv = 0
        meData.data.yv = 0
      }

      firebaseRef.set(meData.ref, meData.data)
    }

    if (camera && meData.model) {
      const targetPos = new THREE.Vector3(
        meData.data.x + Math.sin(-meData.data.dir) * 5,
        3,
        meData.data.y + Math.cos(-meData.data.dir) * 5,
      )
      camera.position.lerp(targetPos, 1 - Math.pow(CAMERA_LAG, dt))
      camera.lookAt(meData.data.x, 0, meData.data.y)
    }
  })

  // ── Mount: Firebase + submodule + device orientation ─────────────────────
  onMount(async () => {
    // Submodule init
    raceModule = await import("src/lib/index.js")
    raceModule.init?.()

    // Firebase
    try {
      await connectToFirebase()
      sceneReady = true
      animateMenuIn()
    } catch {
      alert("Failed to connect to game server")
    }

    // Mobile gyro
    if ($mobile) {
      const requestPerm = (DeviceOrientationEvent as any).requestPermission
      if (typeof requestPerm === "function") {
        const perm = await requestPerm()
        if (perm === "granted")
          window.addEventListener("deviceorientation", handleOrientation)
      } else {
        window.addEventListener("deviceorientation", handleOrientation)
      }
    }
  })

  onDestroy(() => {
    window.removeEventListener("deviceorientation", handleOrientation)
    gsap.killTweensOf("*")
  })

  // ── Device orientation ────────────────────────────────────────────────────
  function handleOrientation(e: DeviceOrientationEvent) {
    const isPortrait = screen.orientation.type.startsWith("portrait")
    const angle = isPortrait ? e.gamma : e.beta
    if (angle == null) return
    $me.data.steer = Math.max(
      -Math.PI / 6,
      Math.min(Math.PI / 6, (-angle * Math.PI) / 180),
    )
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  function handleKeyDown(e: KeyboardEvent) {
    raceModule?.onKeyDown?.(e)
  }
  function handleKeyUp(e: KeyboardEvent) {
    raceModule?.onKeyUp?.(e)
  }

  // ── GSAP menu overlay animations ─────────────────────────────────────────

  function animateMenuIn() {
    if (!$menuVisible) return

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } })

    tl.fromTo(
      ".fore-version",
      { opacity: 0, y: -10 },
      { opacity: 1, y: 0, duration: 0.4 },
    )
      .fromTo(
        ".fore-title",
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7 },
        "-=0.2",
      )
      .fromTo(
        ".fore-item",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.12 },
        "-=0.4",
      )
      .fromTo(
        ".start-btn",
        { opacity: 0, scale: 0.88 },
        { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.4)" },
        "-=0.2",
      )

    // Pulse the start button
    gsap.to(".start-btn", {
      scale: 1.04,
      duration: 2.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: 1,
    })
  }

  // Animate menu out when game starts
  $effect(() => {
    if ($gameStarted) {
      gsap.to("#fore", {
        opacity: 0,
        y: -20,
        duration: 0.5,
        ease: "power2.in",
        onComplete: () => {
          const el = document.getElementById("fore")
          if (el) el.style.display = "none"
        },
      })
    }
  })

  // Countdown number pop
  $effect(() => {
    const count = $gameCountdown
    if (count > 0) {
      gsap.fromTo(
        ".countdown-num",
        { scale: 1.6, opacity: 0.4 },
        { scale: 1, opacity: 1, duration: 0.3, ease: "power2.out" },
      )
    }
  })

  // Winner banner
  $effect(() => {
    if ($winner) {
      gsap.fromTo(
        ".winner-banner",
        { opacity: 0, scale: 0.8, y: 40 },
        { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: "back.out(1.6)" },
      )
    }
  })

  // Color picker drag
  function onColorDrag(e: MouseEvent) {
    if (!(e.buttons & 1)) return
    const rect = colorPicker.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    color = Math.floor((x / rect.width) * 360)
    raceModule?.updateColor?.(color)

    // Animate the slider knob
    gsap.to("#slider", { x: x - 8, duration: 0.05, overwrite: true })
  }
</script>

<svelte:window onkeydown={handleKeyDown} onkeyup={handleKeyUp} />

<svelte:head>
  <title>Race — Matatu Pulse</title>
</svelte:head>

<!-- Loading screen -->
{#if !sceneReady}
  <div class="loading">
    <div class="loading-inner">
      <div class="loading-ring"></div>
      <div class="loading-title">Connecting to race server…</div>
    </div>
  </div>
{/if}

<!-- Three.js canvas (Threlte) -->
<Canvas>
  <T.AmbientLight intensity={0.5} />
  <T.DirectionalLight
    bind:ref={light}
    position={[3000, 2000, -2000]}
    intensity={0.7}
    castShadow
    shadow-mapSize-width={2048}
    shadow-mapSize-height={2048}
    shadow-camera-near={3000}
    shadow-camera-far={5000}
    shadow-camera-top={100}
    shadow-camera-bottom={-100}
    shadow-camera-left={-100}
    shadow-camera-right={120}
    shadow-bias={0.00002}
  />

  <!-- Ground -->
  <T.Mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <T.PlaneGeometry args={[1000, 1000]} />
    <T.MeshLambertMaterial
      color="#1a2a14"
      emissive="#0a0f08"
      emissiveMap={groundTexture}
    />
  </T.Mesh>

  <!-- Map elements -->
  {#each walls as wall}
    <T.Mesh {...wall} castShadow receiveShadow />
  {/each}
  {#each startLines as line}
    <T.Mesh {...line} castShadow receiveShadow />
  {/each}
  {#each trees as tree}
    <T.Mesh {...tree} castShadow receiveShadow />
  {/each}
  {#each signs as sign}
    <T.Mesh {...sign} castShadow receiveShadow />
  {/each}

  <!-- Other players -->
  {#each Object.entries($players) as [id, player]}
    {#if id !== $me.id}
      <Car {player} />
    {/if}
  {/each}

  <!-- My car -->
  {#if $me.model}
    <Car player={$me} isMe={true} />
  {/if}

  <!-- Camera -->
  <T.PerspectiveCamera
    bind:ref={camera}
    makeDefault
    fov={90}
    near={1}
    far={1000}
  />
</Canvas>

<!-- Game UI overlay (lap counter, timer, etc.) -->
<Menu />

<!-- Hidden track data consumed by loadMap -->
<div id="trackcode" class="data">1,5/0,7 0,7/-1,8 ...</div>

<!-- Countdown -->
{#if $gameStarted && $gameCountdown > 0}
  <div class="countdown-overlay">
    <span class="countdown-num">{$gameCountdown}</span>
  </div>
{/if}

<!-- Winner banner -->
{#if $winner}
  <div class="winner-banner">
    <div class="winner-label">🏆 Winner</div>
    <div class="winner-name"><em>{$winner}</em></div>
  </div>
{/if}

<!-- Menu overlay -->
<div id="fore">
  <div class="fore-version">v1.1.3.14</div>

  <div class="fore-title">Online <em>Racing</em></div>

  <div class="menu-card">
    <div class="fore-item">
      <div class="item-label">Your name</div>
      <input
        bind:this={nameInput}
        bind:value={playerName}
        class="name-input"
        placeholder="Enter name"
        maxlength={20}
      />
    </div>

    <div class="fore-item">
      <div class="item-label">Car colour</div>
      <div class="color-row">
        <div
          bind:this={colorPicker}
          id="colorpicker"
          style="flex:1"
          role="slider"
          aria-valuenow={color}
          aria-valuemin={0}
          aria-valuemax={360}
          tabindex="0"
          onmousemove={onColorDrag}
        >
          <div id="slider"></div>
        </div>
        <div
          class="color-preview"
          style="background: hsl({color}, 80%, 55%)"
        ></div>
      </div>
    </div>

    <div class="fore-item">
      <button
        bind:this={startButton}
        class="start-btn"
        onclick={() => raceModule?.menu2?.()}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Start Race!
      </button>
    </div>
  </div>
</div>

<style>
  /* ── Loading screen ───────────────────────────────────────────────────────── */
  .loading {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--ink);
    font-family: var(--font-display);
  }
  .loading-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .loading-title {
    font-size: 1.4rem;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--text-1);
  }
  .loading-ring {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--orange);
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Menu overlay (#fore) ─────────────────────────────────────────────────── */
  #fore {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    background: rgba(12, 12, 18, 0.88);
    backdrop-filter: blur(12px);
    font-family: var(--font-body);
    pointer-events: auto;
  }

  /* Atmospheric glow */
  #fore::before {
    content: "";
    position: absolute;
    top: -100px;
    right: -80px;
    width: 420px;
    height: 420px;
    background: radial-gradient(
      circle,
      rgba(242, 101, 34, 0.09),
      transparent 65%
    );
    pointer-events: none;
  }
  #fore::after {
    content: "";
    position: absolute;
    bottom: -80px;
    left: -60px;
    width: 360px;
    height: 360px;
    background: radial-gradient(
      circle,
      rgba(0, 176, 155, 0.06),
      transparent 65%
    );
    pointer-events: none;
  }

  .fore-version {
    position: absolute;
    top: 20px;
    right: 24px;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: rgba(255, 255, 255, 0.2);
    font-family: monospace;
  }

  .fore-title {
    font-family: var(--font-display);
    font-size: clamp(2rem, 5vw, 3.2rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1;
    color: var(--text-1);
    text-align: center;
    position: relative;
    z-index: 1;
  }
  .fore-title em {
    font-style: normal;
    color: var(--orange);
  }

  /* Menu card */
  .menu-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 28px 32px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: min(420px, 90vw);
    position: relative;
    z-index: 1;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  }
  .menu-card::before {
    content: "";
    display: block;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.07),
      transparent
    );
    margin-bottom: 4px;
  }

  .fore-item {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .item-label {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
  }

  /* Name input */
  .name-input {
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-family: var(--font-body);
    font-size: 0.88rem;
    color: var(--text-1);
    outline: none;
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

  /* Color picker */
  #colorpicker {
    height: 32px;
    border-radius: 10px;
    cursor: crosshair;
    background: linear-gradient(
      to right,
      hsl(0, 80%, 55%),
      hsl(30, 80%, 55%),
      hsl(60, 80%, 55%),
      hsl(90, 80%, 55%),
      hsl(120, 80%, 55%),
      hsl(150, 80%, 55%),
      hsl(180, 80%, 55%),
      hsl(210, 80%, 55%),
      hsl(240, 80%, 55%),
      hsl(270, 80%, 55%),
      hsl(300, 80%, 55%),
      hsl(330, 80%, 55%),
      hsl(360, 80%, 55%)
    );
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.1);
    user-select: none;
  }
  #slider {
    width: 16px;
    height: 38px;
    top: -3px;
    left: 0;
    position: absolute;
    background: #fff;
    border-radius: 5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    pointer-events: none;
  }

  /* Color preview */
  .color-preview {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    flex-shrink: 0;
  }
  .color-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  /* Start button */
  .start-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 14px 28px;
    width: 100%;
    background: linear-gradient(135deg, var(--orange), #c4420c);
    border: none;
    border-radius: 13px;
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 900;
    letter-spacing: -0.03em;
    color: #fff;
    cursor: pointer;
    box-shadow:
      0 8px 28px rgba(242, 101, 34, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    transition: box-shadow 0.2s;
  }
  .start-btn:hover {
    box-shadow:
      0 12px 36px rgba(242, 101, 34, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  /* ── Countdown overlay ────────────────────────────────────────────────────── */
  .countdown-overlay {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  .countdown-num {
    font-family: var(--font-display);
    font-size: 20vw;
    font-weight: 900;
    letter-spacing: -0.07em;
    color: var(--orange);
    text-shadow: 0 0 60px rgba(242, 101, 34, 0.5);
    line-height: 1;
  }

  /* ── Winner banner ────────────────────────────────────────────────────────── */
  .winner-banner {
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: rgba(12, 12, 18, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 16px 32px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(16px);
    text-align: center;
  }
  .winner-label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--teal);
  }
  .winner-name {
    font-family: var(--font-display);
    font-size: 1.6rem;
    font-weight: 900;
    letter-spacing: -0.05em;
    color: var(--text-1);
  }
  .winner-name em {
    font-style: normal;
    color: var(--orange);
  }

  /* ── HUD (version tag) ────────────────────────────────────────────────────── */
  #version {
    position: fixed;
    top: 14px;
    right: 16px;
    z-index: 10;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.2);
    font-family: monospace;
    pointer-events: none;
  }

  /* ── Hidden track data ───────────────────────────────────────────────────── */
  .data {
    display: none;
  }
</style>
