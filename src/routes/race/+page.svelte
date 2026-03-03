<script lang="ts">
  import { onMount } from "svelte"
  import "$lib/features/race/style.css"
  import "$lib/index"
  import { T, useTask, useFrame } from "@threlte/core"
  import { Canvas } from "@threlte/core"
  import { OrbitControls } from "@threlte/extras"
  import * as THREE from "three"
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
import { mobile } from '$lib/stores';
import { me } from '$lib/stores';

  // references to DOM elements
  let nameInput: HTMLInputElement
  let colorPicker: HTMLDivElement
  let startButton: HTMLDivElement

  // reactive variables
  let playerName = ""
  let color = 0

  // keep original submodule JS accessible
  let raceModule: any

  onMount(async () => {
    // dynamically import the JS from lib/features/race
    raceModule = await import("src/lib/index.js")

    // call any init functions the submodule exposes
    if (raceModule.init) raceModule.init()

    // if original code expects document.getElementById, it will still work
  })

  let sceneReady = false
  let camera
  let light
  let groundTexture

  // References to map meshes
  let walls = []
  let startLines = []
  let trees = []
  let signs = []

  $effect(() => {
    // When trackCode changes, rebuild map
    const code = $trackCode
    if (code) {
      const {
        walls: newWalls,
        start,
        trees: newTrees,
        signs: newSigns,
      } = loadMap(code)
      walls = newWalls
      startLines = start
      trees = newTrees
      signs = newSigns
    }
  })

  // Game loop
  useFrame((delta) => {
    if (!$gameStarted || $gameCountdown > 0) return

    const meData = $me
    const playersData = $players
    const dt = delta * 60 // approximate warp to 60fps

    // Update my car physics
    if (meData.ref) {
      // Apply steering
      meData.data.dir += (meData.data.steer / 10) * dt
      // Accelerate
      meData.data.xv += Math.sin(meData.data.dir) * SPEED * dt
      meData.data.yv += Math.cos(meData.data.dir) * SPEED * dt
      // Friction
      meData.data.xv *= Math.pow(0.99, dt)
      meData.data.yv *= Math.pow(0.99, dt)
      // Move
      meData.data.x += meData.data.xv * dt
      meData.data.y += meData.data.yv * dt

      // Collisions with walls
      const pos = new THREE.Vector3(meData.data.x, 0, meData.data.y)
      walls.forEach((wall) => {
        // ... (collision detection logic from original)
      })

      // Checkpoints
      startLines.forEach((line, idx) => {
        // ... (checkpoint logic)
      })

      // Out of bounds
      if (pos.length() > OOB_DIST) {
        meData.data.x = 0
        meData.data.y = 0
        meData.data.xv = 0
        meData.data.yv = 0
      }

      // Update Firebase
      firebaseRef.set(meData.ref, meData.data)
    }

    // Update other players from Firebase (data already synced via listeners)
    // But we need to interpolate positions? For simplicity, we just set directly.
    // The Firebase onChildChanged will update the store.

    // Camera follow
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

  onMount(async () => {
    try {
      await connectToFirebase()
      sceneReady = true
    } catch (e) {
      alert("Failed to connect to game server")
    }
  })
</script>

Main page
{#if !sceneReady}
  <div class="loading">Connecting...</div>
{/if}

<Canvas>
  <!-- Scene setup -->
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
      color="#57c115"
      emissive="#0f0f0f"
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

  <!-- Other players' cars -->
  {#each Object.entries($players) as [id, player]}
    {#if id !== $me.id}
      <Car {player} />
    {/if}
  {/each}

  <!-- My car (if exists) -->
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

<!-- UI Overlay -->
<Menu />

<div id="trackcode" class="data">1,5/0,7 0,7/-1,8 ...</div>

<div id="fore">
  <div id="version">v1.1.3.14</div>
  <div class="title" id="title">Online Racing Game!</div>

  <div class="menuitem title">
    Pick a name:<br />
    <input
      bind:this={nameInput}
      bind:value={playerName}
      class="title"
      placeholder="Name"
    />
  </div>

  <div class="menuitem title">
    Choose a color:<br />
    <div
      bind:this={colorPicker}
      id="colorpicker"
      on:mousemove={(e) => {
        if (e.buttons === 1) {
          const x = e.clientX - colorPicker.getBoundingClientRect().left
          color = Math.floor((x / colorPicker.clientWidth) * 360)
          if (raceModule?.updateColor) raceModule.updateColor(color)
        }
      }}
    >
      <div id="slider"></div>
    </div>
  </div>

  <div class="menuitem title">
    <div
      bind:this={startButton}
      id="start"
      on:click={() => raceModule?.menu2?.()}
    >
      Start!
    </div>
  </div>
</div>

<svelte:window on:keydown={handleKeyDown} on:keyup={handleKeyUp} />



if ($mobile) {
  if (DeviceOrientationEvent.requestPermission) {
    DeviceOrientationEvent.requestPermission()
      .then(permission => {
        if (permission === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation);
        }
      });
  } else {
    window.addEventListener('deviceorientation', handleOrientation);
  }
}

function handleOrientation(e) {
  const angle = screen.orientation.type.startsWith('portrait') ? e.gamma : e.beta;
  $me.data.steer = Math.max(-Math.PI/6, Math.min(Math.PI/6, -angle * Math.PI/180));
}

<!-- styles -->
<style>
  .loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 2rem;
    color: white;
    z-index: 1000;
  }
</style>
