<script lang="ts">
  /**
   * SceneContents.svelte
   *
   * Must be rendered inside a Threlte <Canvas>. Contains all scene logic,
   * camera setup, model loading, post-processing, and interaction handling.
   *
   * Uses vehicleModelLoaders from the fleet index to load the correct
   * 3D bus model based on modelKey (capacity or named key).
   */

  import { onMount, onDestroy } from "svelte"
  import { T, useThrelte, useTask } from "@threlte/core"
  import { OrbitControls, interactivity } from "@threlte/extras"
  import * as THREE from "three"
  import { vehicleModelLoaders, resolveModelKey } from "$lib/features/fleet"
  import { gltfLoader } from "$lib/features/fleet/services/three/gltfLoader"
  import { EffectComposer } from "three-stdlib"
  import { RenderPass } from "three-stdlib"
  import { BokehPass } from "three-stdlib"
  import { RGBELoader } from "three-stdlib"
  import { gsap } from "gsap"

  // ── Props ───────────────────────────────────────────────────────────────
  let {
    selectedSeats = [],
    toggleSeat,
    modelKey,
    reservedSeats = [],
    capacity = "14",
    viewMode = $bindable<"exterior" | "interior">("exterior"),
    loading = $bindable<boolean>(true),
    interiorLoaded = $bindable<boolean>(false),
  }: {
    selectedSeats?: number[]
    toggleSeat: (n: number) => void
    modelKey: string
    reservedSeats?: number[]
    capacity?: string
    viewMode: "exterior" | "interior"
    loading: boolean
    interiorLoaded: boolean
  } = $props()

  // ── Threlte context ────────────────────────────────────────────────────────
  const { renderer, scene, camera, invalidate } = useThrelte()
  const requestRender = () => invalidate()

  // ── Post-processing & model ────────────────────────────────────────────────
  let ModelComponent: any = $state(null)

  let composer: EffectComposer
  let bokehPass: BokehPass

  // ── Scene graph refs ───────────────────────────────────────────────────────
  const exteriorGroup = new THREE.Group()
  const interiorGroup = new THREE.Group()
  interiorGroup.visible = false

  const seatMeshes: Map<number, THREE.Mesh> = new Map()

  let doorMesh: THREE.Object3D | null = null
  let doorPivot: THREE.Object3D | null = null
  let doorShaft: THREE.Mesh

  let interiorLight: THREE.PointLight
  let ambientInterior: THREE.AmbientLight

  let doorAudio: HTMLAudioElement

  let cam: THREE.PerspectiveCamera
  let controls: any

  // Enable interactivity plugin
  interactivity()

  async function loadModelFromIndex() {
    const key = resolveModelKey(modelKey || capacity)
    const loader = vehicleModelLoaders[key]

    if (!loader) {
      console.warn(`No model loader for key "${key}"`)
      return false
    }

    try {
      const module = await loader()

      // CHANGES:
      // 1. Do not mutate module.default
      // 2. Pass gltfLoader as a prop when rendering the component
      ModelComponent = module.default

      return true
    } catch (err) {
      console.error(`Failed to load model "${key}":`, err)
      return false
    }
  }
  // ── Mount ──────────────────────────────────────────────────────────────────
  onMount(async () => {
    const r = renderer as THREE.WebGLRenderer
    const s = scene as THREE.Scene
    const c = $camera as THREE.PerspectiveCamera

    cam = c
    cam.position.set(0, 3, 8)

    // Renderer config
    r.outputColorSpace = THREE.SRGBColorSpace
    r.toneMapping = THREE.ACESFilmicToneMapping
    r.toneMappingExposure = 1

    // Post-processing
    composer = new EffectComposer(r)
    composer.addPass(new RenderPass(s, c))
    bokehPass = new BokehPass(s, c, {
      focus: 5.0,
      aperture: 0.0002,
      maxblur: 0.01,
    })
    composer.addPass(bokehPass)

    // HDR environment
    new RGBELoader().load("/hdr/garage.hdr", (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping
      s.environment = texture
      s.background = texture
      requestRender()
    })

    // Interior lights
    ambientInterior = new THREE.AmbientLight(0xffffff, 0.05)
    interiorLight = new THREE.PointLight(0xffffff, 0.1, 20)
    interiorLight.position.set(0, 2, 0)
    interiorGroup.add(ambientInterior, interiorLight)

    // Add groups to scene
    s.add(exteriorGroup)
    s.add(interiorGroup)

    // Audio
    doorAudio = new Audio("/sounds/door-open.mp3")
    doorAudio.volume = 0.5

    // Attempt to load from fleet index, fallback to placeholder
    const loaded = await loadModelFromIndex()
    if (!loaded) {
      loadPlaceholderExterior()
    }

    loading = false
    requestRender()
  })

  // ── Render loop via composer ───────────────────────────────────────────────
  useTask(
    (delta) => {
      if (controls) controls.update()
      composer?.render()
    },
    { autoInvalidate: false },
  )

  // ── Placeholder geometry (fallback when no GLTF available) ─────────────────
  function loadPlaceholderExterior() {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1.2, 4),
      new THREE.MeshStandardMaterial({ color: 0xf26522 }),
    )
    body.position.y = 0.6
    exteriorGroup.add(body)

    doorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
    )
    doorMesh.name = "Door_Main"
    doorMesh.position.set(0.8, 0.5, 2)
    exteriorGroup.add(doorMesh)
    createDoorPivot()
  }

  function loadPlaceholderInterior() {
    const seatCount = parseInt(capacity) || 14
    for (let i = 1; i <= seatCount; i++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xffffff }),
      )
      const col = (i - 1) % 4
      const row = Math.floor((i - 1) / 4)
      mesh.position.set(col * 0.6 - 0.9, 0.5, row * 0.7 - 1)
      mesh.name = `Seat_${i}`
      interiorGroup.add(mesh)
      seatMeshes.set(i, mesh)
    }
    interiorLoaded = true
    requestRender()
  }

  // ── Door pivot + light shaft ──────────────────────────────────────────────
  function createDoorPivot() {
    if (!doorMesh) return
    const hingeOffset = new THREE.Vector3(-0.6, 0, 0)
    const hingeWorld = (doorMesh as THREE.Object3D).position
      .clone()
      .add(hingeOffset)

    doorPivot = new THREE.Object3D()
    doorPivot.position.copy(hingeWorld)
    exteriorGroup.add(doorPivot)
    ;(doorMesh as THREE.Object3D).position.sub(hingeWorld)
    doorPivot.add(doorMesh as THREE.Object3D)

    createLightShaft()
  }

  function createLightShaft() {
    const geometry = new THREE.ConeGeometry(1.2, 4, 32, 1, true)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    doorShaft = new THREE.Mesh(geometry, material)
    doorShaft.position.set(0, 2, 1.5)
    doorShaft.rotation.x = Math.PI
    exteriorGroup.add(doorShaft)
  }

  function openDoor(): Promise<void> {
    return new Promise((resolve) => {
      if (!doorPivot) return resolve()
      doorAudio.currentTime = 0
      doorAudio.play().catch(() => {})

      gsap.to(doorPivot.rotation, {
        y: -Math.PI / 2,
        duration: 1,
        ease: "back.out(1.7)",
        onUpdate: requestRender,
        onComplete: resolve,
      })
      if (doorShaft?.material) {
        gsap.to(doorShaft.material as THREE.MeshBasicMaterial, {
          opacity: 0.4,
          duration: 1,
          ease: "power2.out",
          onUpdate: requestRender,
        })
      }
    })
  }

  function closeDoor() {
    if (!doorPivot) return
    gsap.to(doorPivot.rotation, {
      y: 0.05,
      duration: 0.6,
      ease: "power3.in",
      onUpdate: requestRender,
    })
    gsap.to(doorPivot.rotation, {
      y: 0,
      duration: 0.2,
      delay: 0.6,
      ease: "power1.out",
      onUpdate: requestRender,
    })
    if (doorShaft?.material) {
      gsap.to(doorShaft.material as THREE.MeshBasicMaterial, {
        opacity: 0,
        duration: 0.5,
        onUpdate: requestRender,
      })
    }
  }

  // ── Camera FX ─────────────────────────────────────────────────────────────
  function addHeadBob() {
    const originalY = cam.position.y
    gsap.to(cam.position, {
      y: originalY + 0.1,
      duration: 0.15,
      yoyo: true,
      repeat: 3,
      ease: "sine.inOut",
      onUpdate: requestRender,
    })
  }

  function focusOnAvailableSeat() {
    const available = [...seatMeshes.keys()].find(
      (s) => !reservedSeats.includes(s),
    )
    if (!available) return
    const mesh = seatMeshes.get(available)
    if (!mesh) return
    const target = mesh.getWorldPosition(new THREE.Vector3())
    if (bokehPass?.materialBokeh?.uniforms?.["focus"]) {
      bokehPass.materialBokeh.uniforms["focus"].value = 2.0
    }
    gsap.to(cam.position, {
      x: target.x,
      y: target.y + 1,
      z: target.z + 2,
      duration: 1.2,
      ease: "power4.inOut",
      onUpdate: requestRender,
    })
  }

  // ── View transitions ──────────────────────────────────────────────────────
  async function enterInterior() {
    if (!interiorLoaded) loadPlaceholderInterior()
    await openDoor()
    addHeadBob()

    await new Promise<void>((resolve) => {
      gsap.to(cam.position, {
        x: 0,
        y: 2,
        z: 2.5,
        duration: 1,
        ease: "expo.out",
        onUpdate: requestRender,
        onComplete: resolve,
      })
    })

    exteriorGroup.visible = false
    interiorGroup.visible = true

    gsap.to(ambientInterior, { intensity: 0.6, duration: 1.2 })
    gsap.to(interiorLight, { intensity: 1.4, duration: 1.2 })

    setTimeout(focusOnAvailableSeat, 600)
    viewMode = "interior"
  }

  export function goBack() {
    interiorGroup.visible = false
    exteriorGroup.visible = true

    gsap.to(cam.position, {
      x: 0,
      y: 3,
      z: 8,
      duration: 1,
      ease: "power4.inOut",
      onUpdate: requestRender,
      onComplete: closeDoor,
    })
    gsap.to(ambientInterior, { intensity: 0.05, duration: 0.6 })
    gsap.to(interiorLight, { intensity: 0.1, duration: 0.6 })
    viewMode = "exterior"
  }

  // ── Click handling ────────────────────────────────────────────────────────
  function handleExteriorClick(event: CustomEvent<{ object: THREE.Object3D }>) {
    const obj = event.detail?.object
    if (!obj) return
    let node: THREE.Object3D | null = obj
    while (node) {
      if (node.name === "Door_Main") {
        enterInterior()
        return
      }
      node = node.parent
    }
  }

  function handleInteriorClick(event: CustomEvent<{ object: THREE.Object3D }>) {
    const obj = event.detail?.object
    if (!obj) return
    let node: THREE.Object3D | null = obj
    while (node) {
      if (node.name.startsWith("Seat_")) {
        if (node.userData.disabled) return
        const seatNumber = parseInt(node.name.split("_")[1])
        toggleSeat(seatNumber)
        return
      }
      node = node.parent
    }
  }

  // ── Seat color reactivity ─────────────────────────────────────────────────
  let glowTweens = new Map<number, gsap.core.Tween>()

  $effect(() => {
    // Access reactive deps
    const _r = reservedSeats.length
    const _s = selectedSeats.length

    seatMeshes.forEach((mesh, seatNumber) => {
      const mat = mesh.material as THREE.MeshStandardMaterial
      if (!mat) return

      mat.transparent = false
      let existingTween = glowTweens.get(seatNumber)

      if (reservedSeats.includes(seatNumber)) {
        mat.color.set(0xff0000)
        mat.emissive.set(0x000000)
        existingTween?.kill()
        mesh.userData.disabled = true
      } else if (selectedSeats.includes(seatNumber)) {
        mat.color.set(0x0ea5e9)
        if (!existingTween || !existingTween.isActive()) {
          existingTween?.kill()
          const tween = gsap.to(mat.emissive, {
            r: 0.6,
            g: 0.9,
            b: 1,
            duration: 0.8,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
            onUpdate: requestRender,
          })
          glowTweens.set(seatNumber, tween)
        }
        mesh.userData.disabled = false
      } else {
        mat.color.set(0xffffff)
        mat.emissive.set(0x000000)
        existingTween?.kill()
        glowTweens.delete(seatNumber)
        mesh.userData.disabled = false
      }
    })

    requestRender()
  })

  onDestroy(() => {
    gsap.killTweensOf(cam?.position)
    glowTweens.forEach((t) => t.kill())
  })
</script>

<!-- Camera -->
<T.PerspectiveCamera
  makeDefault={undefined}
  fov={60}
  near={0.1}
  far={1000}
  position={[0, 3, 8]}
  on:create={({ ref }) => {
    cam = ref as THREE.PerspectiveCamera
  }}
>
  <OrbitControls
    enableZoom={false}
    enablePan={false}
    enableDamping
    on:create={({ ref }) => {
      controls = ref
    }}
  />
</T.PerspectiveCamera>

<!-- Global lighting -->
<T.HemisphereLight skyColor={0xffffff} groundColor={0x444444} intensity={1} />

<!-- Exterior group -->
<T.Group on:click={handleExteriorClick}>
  {#if ModelComponent && viewMode === "exterior"}
    <ModelComponent loader={gltfLoader} />
  {/if}
</T.Group>

<!-- Interior group -->
<T.Group on:click={handleInteriorClick}>
  {#if ModelComponent && viewMode === "interior"}
    <ModelComponent loader={gltfLoader} />
  {/if}
</T.Group>
