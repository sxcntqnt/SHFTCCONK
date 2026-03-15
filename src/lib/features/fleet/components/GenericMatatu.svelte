<script lang="ts">
  /**
   * GenericMatatu.svelte
   *
   * Procedural matatu — no GLB, no DRACO.
   * Renders via <T is={rootGroup} /> inside the Threlte Canvas tree.
   * Calls onload(rootGroup) so SceneContents can discover Door_Main / seats.
   */

  import { T, useTask } from "@threlte/core"
  import { ContactShadows } from "@threlte/extras"
  import * as THREE from "three"
  import { onMount } from "svelte"

  export let scale: number = 1
  export let position: [number, number, number] = [0, 0, 0]
  export let rotation: [number, number, number] = [0, 0, 0]
  export let capacity: number = 14
  export let onload: ((scene: THREE.Group) => void) | undefined = undefined

  // Refs surfaced to SceneContents for door/seat wiring
  export let doorMesh: THREE.Object3D | null = null
  export let seatMeshes: Map<number, THREE.Mesh> = new Map()

  // ── Materials ──────────────────────────────────────────────────────────────
  const matYellow = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.05,
    roughness: 0.65,
  })
  const matGreen = new THREE.MeshStandardMaterial({
    color: 0x005a1e,
    transparent: true,
    opacity: 0.88,
    roughness: 0.8,
  })
  const matWindow = new THREE.MeshStandardMaterial({
    color: 0x0a0e2a,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  })
  const matTyre = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.95,
  })
  const matRoof = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.9,
  })
  const matFloor = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    roughness: 0.95,
  })
  const matDoor = new THREE.MeshStandardMaterial({
    color: 0x1a1a33,
    roughness: 0.8,
    metalness: 0.1,
  })
  const matSeat = new THREE.MeshStandardMaterial({
    color: 0x0a2f5c,
    roughness: 0.9,
  })

  // ── Build scene graph (eagerly, before any render tick) ────────────────────
  const rootGroup = new THREE.Group()
  rootGroup.name = "GenericMatatu_Root"

  const bodyGroup = new THREE.Group() // sub-group that floats

  // Body
  const bodyMesh = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 1.9, 7.2),
    matYellow,
  )
  bodyMesh.castShadow = bodyMesh.receiveShadow = true
  bodyGroup.add(bodyMesh)

  // Roof
  const roofMesh = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 0.18, 6.8),
    matRoof,
  )
  roofMesh.position.set(0, 1.05, 0)
  bodyGroup.add(roofMesh)

  // Green stripe
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(3.26, 0.3, 7.26),
    matGreen,
  )
  stripe.position.set(0, 0.4, 0)
  bodyGroup.add(stripe)

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 7.1), matFloor)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.01
  bodyGroup.add(floor)

  // Windows — both sides
  for (const z of [-2.4, -1.6, -0.8, 0, 0.8, 1.6]) {
    for (const x of [1.62, -1.62]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), matWindow)
      win.position.set(x, 0.6, z)
      bodyGroup.add(win)
    }
  }

  // Wheels
  for (const z of [-2.6, 2.6]) {
    for (const x of [-0.9, 0.9]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.3, 24),
        matTyre,
      )
      wheel.position.set(x, -0.6, z)
      wheel.rotation.set(Math.PI / 2, 0, 0)
      bodyGroup.add(wheel)
    }
  }

  // Door — named "Door_Main" so SceneContents door-pivot code finds it
  const doorObj = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.12), matDoor)
  doorObj.name = "Door_Main"
  doorObj.position.set(1.35, 0.8, 1.4)
  doorObj.castShadow = true
  doorMesh = doorObj
  bodyGroup.add(doorObj)

  // Door frame
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 1.7, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x000000 }),
  )
  frame.position.set(1.35, 0.8, 1.38)
  bodyGroup.add(frame)

  // Seats — cloned material per seat so colour state is independent
  const COLS = 4
  for (let i = 1; i <= capacity; i++) {
    const row = Math.floor((i - 1) / COLS)
    const col = (i - 1) % COLS
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.38, 0.48),
      matSeat.clone(),
    )
    seat.position.set((col - 1.5) * 0.55, 0.55, -row * 0.8 - 0.8)
    seat.name = `Seat_${i}`
    seat.userData.seatNumber = i
    seat.castShadow = true
    seatMeshes.set(i, seat)
    bodyGroup.add(seat)
  }

  rootGroup.add(bodyGroup)

  // ── Floating animation ─────────────────────────────────────────────────────
  let t = 0
  useTask((delta) => {
    t += delta
    bodyGroup.position.y = Math.sin(t * 1.1) * 0.04
  })

  // ── Fire onload after first paint ─────────────────────────────────────────
  onMount(() => {
    onload?.(rootGroup)
  })
</script>

<T is={rootGroup} {scale} {position} {rotation} />

<ContactShadows
  position={[0, -0.95, 0]}
  scale={12}
  blur={2.5}
  opacity={0.35}
  far={4}
  color="#000033"
/>
