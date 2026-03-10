<!-- src/lib/models/GenericMatatu.svelte -->
<script lang="ts">
  import { T, useTask } from "@threlte/core"
  import { OrbitControls, Grid, ContactShadows } from "@threlte/extras"
  import * as THREE from "three"
  import { onMount } from "svelte"

  // ── Exposed for parent SceneContents.svelte ──
  export let scale: number = 1
  export let position: [number, number, number] = [0, 0, 0]
  export let rotation: [number, number, number] = [0, 0, 0]

  // For seat/door discovery compatibility (even if procedural)
  export let doorMesh: THREE.Object3D | null = null
  export let seatMeshes: Map<number, THREE.Mesh> = new Map()

  // ── Internal refs ──
  let body: THREE.Mesh
  let roof: THREE.Mesh
  let doorGroup: THREE.Group

  // Simple matatu color palette (very Nairobi style)
  const matatuYellow = new THREE.Color(0xffd700)
  const matatuGreen = new THREE.Color(0x006400)
  const chrome = new THREE.Color(0xcccccc)
  const windowDark = new THREE.Color(0x111133)

  onMount(() => {
    // Fake door mesh for pivot/animation compatibility
    const doorGeo = new THREE.BoxGeometry(0.9, 1.6, 0.12)
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x222244 })
    doorMesh = new THREE.Mesh(doorGeo, doorMat)
    doorMesh.name = "Door_Main"
    doorMesh.position.set(1.35, 0.8, 1.4) // right side, front-ish

    if (doorGroup) {
      doorGroup.add(doorMesh)
    }

    // Generate fake seats (14 seater layout example)
    const cols = 4
    const rows = 4 // last row sometimes 2-3, but simplified
    for (let i = 1; i <= 14; i++) {
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.38, 0.48),
        new THREE.MeshStandardMaterial({
          color: 0x0a2f5c,
          roughness: 0.9,
        }),
      )
      const row = Math.floor((i - 1) / cols)
      const col = (i - 1) % cols

      seat.position.set(
        (col - 1.5) * 0.55, // x spread
        0.55, // height above floor
        -row * 0.8 - 0.8, // z from front to back
      )

      seat.name = `Seat_${i}`
      seat.userData.seatNumber = i
      seatMeshes.set(i, seat)

      // Add to interior group or directly (depending on your scene setup)
      // Here we add to body for simplicity
      if (body) body.add(seat)
    }
  })

  // Gentle floating animation (very matatu vibe)
  useTask((delta) => {
    if (!body) return
    body.position.y = Math.sin(Date.now() * 0.001) * 0.04
  })
</script>

<T.Group {scale} {position} {rotation}>
  <!-- Main body (classic matatu boxy shape) -->
  <T.Mesh bind:mesh={body} castShadow receiveShadow>
    <T.BoxGeometry args={[3.2, 1.9, 7.2]} />
    <T.MeshStandardMaterial
      color={matatuYellow}
      metalness={0.05}
      roughness={0.7}
    />
  </T.Mesh>

  <!-- Roof / top rack simulation -->
  <T.Mesh position={[0, 1.05, 0]}>
    <T.BoxGeometry args={[3.0, 0.18, 6.8]} />
    <T.MeshStandardMaterial color={0x111111} roughness={0.9} />
  </T.Mesh>

  <!-- Green stripes (very common matatu style) -->
  <T.Mesh position={[0, 0.4, 0]}>
    <T.BoxGeometry args={[3.25, 0.3, 7.25]} />
    <T.MeshStandardMaterial color={matatuGreen} transparent opacity={0.85} />
  </T.Mesh>

  <!-- Door area group (for pivot animation) -->
  <T.Group bind:group={doorGroup} position={[1.3, 0, 1.3]}>
    <!-- Door frame / cutout simulation -->
    <T.Mesh position={[0.1, 0, 0]}>
      <T.BoxGeometry args={[0.95, 1.7, 0.15]} />
      <T.MeshStandardMaterial color={0x000000} />
    </T.Mesh>
  </T.Group>

  <!-- Windows (dark tint) -->
  {#each [-2.4, -1.6, -0.8, 0, 0.8, 1.6] as z}
    <T.Mesh position={[1.62, 0.6, z]}>
      <T.PlaneGeometry args={[0.9, 0.9]} />
      <T.MeshStandardMaterial
        color={windowDark}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
      />
    </T.Mesh>
    <T.Mesh position={[-1.62, 0.6, z]}>
      <T.PlaneGeometry args={[0.9, 0.9]} />
      <T.MeshStandardMaterial
        color={windowDark}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
      />
    </T.Mesh>
  {/each}

  <!-- Wheels (simple cylinders) -->
  {#each [-2.6, 2.6] as z}
    {#each [-0.9, 0.9] as x}
      <T.Mesh position={[x, -0.6, z]} rotation={[Math.PI / 2, 0, 0]}>
        <T.CylinderGeometry args={[0.45, 0.45, 0.3, 24]} />
        <T.MeshStandardMaterial color={0x111111} roughness={0.9} />
      </T.Mesh>
    {/each}
  {/each}

  <!-- Floor (for interior feel when camera inside) -->
  <T.Mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <T.PlaneGeometry args={[3.1, 7.1]} />
    <T.MeshStandardMaterial color={0x222233} roughness={0.95} />
  </T.Mesh>

  <!-- Optional helpers during development -->
  <!-- <Grid infinite fadeDistance={40} fadeStrength={4} /> -->
  <!-- <ContactShadows scale={12} blur={2} opacity={0.4} far={5} /> -->

  <!-- You can add <slot /> here if you want to inject extra elements from parent -->
  <slot />
</T.Group>

<style>
  /* Optional: if you want canvas-level styles */
</style>
