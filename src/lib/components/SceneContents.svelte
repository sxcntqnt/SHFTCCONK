<script lang="ts">
  /**
   * SceneContents.svelte
   *
   * Must be rendered inside a Threlte <Canvas>. Contains all scene logic,
   * camera setup, model loading, post-processing, and interaction handling.
   *
   * Dependencies:
   *   @threlte/core       – T, useThrelte, useTask
   *   @threlte/extras     – OrbitControls, interactivity, useGltf
   *   three-stdlib        – EffectComposer, RenderPass, BokehPass, RGBELoader
   *   gsap
   */

  import { onMount, onDestroy, createEventDispatcher } from "svelte"
  import { T, useThrelte, useTask } from "@threlte/core"
  import { OrbitControls, interactivity } from "@threlte/extras"
  import * as THREE from "three"
  import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
  import { EffectComposer } from "three-stdlib"
  import { RenderPass } from "three-stdlib"
  import { BokehPass } from "three-stdlib"
  import { RGBELoader } from "three-stdlib"
  import { gsap } from "gsap"

  // ── Props ─────────────────────────────────────────────────────────────────

  let {
    selectedSeats = [],
    toggleSeat,
    modelKey,
    reservedSeats = [],
    viewMode = "exterior",
    loading = true,
    interiorLoaded = false,
  }: {
    selectedSeats?: number[]
    toggleSeat: (n: number) => void
    modelKey: string
    reservedSeats?: number[]
    viewMode?: "exterior" | "interior"
    loading?: boolean
    interiorLoaded?: boolean
  } = $props()

  // ── Threlte context ────────────────────────────────────────────────────────
  // useThrelte() gives us the renderer, scene, camera managed by <Canvas>.
  const { renderer, scene, camera, invalidate } = useThrelte()

  // Convenience alias so we can call invalidate() wherever needsRender was used.
  const requestRender = () => invalidate()

  // ── Post-processing ────────────────────────────────────────────────────────
  // Threlte renders via its own loop. We intercept it by adding our composer
  // in a useTask that runs every frame.
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

  // ── Camera position (reactive) ─────────────────────────────────────────────
  // We create one camera reference that we animate with gsap.
  let cam: THREE.PerspectiveCamera

  // ── Controls ref ──────────────────────────────────────────────────────────
  let controls: any // OrbitControls instance from @threlte/extras

  // ── Enable interactivity plugin ───────────────────────────────────────────
  // This patches Threlte's event system to emit pointer events on meshes.
  interactivity()

  // ── Post-processing setup (runs once renderer is available) ───────────────
  onMount(() => {
    const r = renderer as THREE.WebGLRenderer
    const s = scene as THREE.Scene
    const c = camera as THREE.PerspectiveCamera

    // Keep a local ref for gsap targets
    cam = c
    cam.position.set(0, 3, 8)

    // Renderer tweaks
    r.physicallyCorrectLights = true
    r.outputEncoding = THREE.sRGBEncoding
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
    new RGBELoader().load("/hdr/studio.hdr", (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping
      s.environment = texture
      s.background = texture
      requestRender()
    })

    // Interior lights (added to interiorGroup declaratively below, but we need
    // refs for gsap animation so we create them imperatively)
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

    loadExterior()
  })

  // ── Threlte task – render via composer each frame ─────────────────────────
  // We stop Threlte's default rendering and drive it ourselves so the composer
  // (with BokehPass) is used instead of the raw renderer.
  useTask(
    (delta) => {
      if (controls) controls.update()
      composer?.render()
    },
    { autoInvalidate: false },
  )

  // ── Model loading ─────────────────────────────────────────────────────────
  /*
  function loadExterior() {
    const loader = new GLTFLoader()
    loader.load(`/models/${modelKey}-exterior.glb`, (gltf) => {
      gltf.scene.traverse((child: any) => {
        if (child.name === 'Door_Main') doorMesh = child
      })
      exteriorGroup.add(gltf.scene)
      if (doorMesh) createDoorPivot()
      loading = false
      requestRender()
    })
  }

  function loadInterior() {
    const loader = new GLTFLoader()
    loader.load(`/models/${modelKey}-interior.glb`, (gltf) => {
      interiorGroup.add(gltf.scene)
      gltf.scene.traverse((child: any) => {
        if (child.isMesh && child.name.startsWith('Seat_')) {
          const seatNumber = parseInt(child.name.split('_')[1])
          seatMeshes.set(seatNumber, child)
        }
      })
      interiorLoaded = true
      requestRender()
    })
  }
 */
  function loadExterior() {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1.2, 4),
      new THREE.MeshStandardMaterial({ color: 0xf26522 }),
    )
    body.position.y = 0.6
    exteriorGroup.add(body)

    // Simulate the door mesh so enterInterior() doesn't break
    doorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
    )
    doorMesh.name = "Door_Main"
    doorMesh.position.set(0.8, 0.5, 2)
    exteriorGroup.add(doorMesh)
    createDoorPivot()

    loading = false
    requestRender()
  }

  function loadInterior() {
    // Placeholder seats
    for (let i = 1; i <= parseInt(capacity); i++) {
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
      doorAudio.play()

      gsap.to(doorPivot.rotation, {
        y: -Math.PI / 2,
        duration: 1,
        ease: "back.out(1.7)",
        onUpdate: requestRender,
        onComplete: resolve,
      })
      gsap.to(doorShaft.material as THREE.MeshBasicMaterial, {
        opacity: 0.4,
        duration: 1,
        ease: "power2.out",
        onUpdate: requestRender,
      })
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
    gsap.to(doorShaft.material as THREE.MeshBasicMaterial, {
      opacity: 0,
      duration: 0.5,
      onUpdate: requestRender,
    })
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
    bokehPass.materialBokeh.uniforms["focus"].value = 2.0
    gsap.to(cam.position, {
      x: target.x,
      y: target.y + 1,
      z: target.z + 2,
      duration: 1.2,
      ease: "power4.inOut",
      onUpdate: requestRender,
    })
  }

  // ── Transitions ───────────────────────────────────────────────────────────

  async function enterInterior() {
    if (!interiorLoaded) loadInterior()
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

  // ── Click handling via Threlte interactivity ──────────────────────────────
  // Instead of a manual raycaster, we attach on:click to T.Group wrappers.
  // The exterior group click handles the door; interior group handles seats.

  function handleExteriorClick(event: CustomEvent<{ object: THREE.Object3D }>) {
    const obj = event.detail?.object
    if (!obj) return
    // Walk up to find Door_Main
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

  // ── Seat reactivity ───────────────────────────────────────────────────────

  $: {
    seatMeshes.forEach((mesh, seatNumber) => {
      const material = mesh.material as THREE.MeshStandardMaterial
      if (!material) return

      material.transparent = false

      if (reservedSeats.includes(seatNumber)) {
        material.color.set(0xff0000)
        material.emissive.set(0x000000)
        mesh.userData.disabled = true
      } else if (selectedSeats.includes(seatNumber)) {
        material.color.set(0x0ea5e9)
        material.emissive.set(0x0ea5e9)
        gsap.to(material.emissive, {
          r: 0.6,
          g: 0.9,
          b: 1,
          duration: 0.8,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        })
        mesh.userData.disabled = false
      } else {
        gsap.killTweensOf(material.emissive)
        material.color.set(0xffffff)
        material.emissive.set(0x000000)
        mesh.userData.disabled = false
      }
    })

    requestRender()
  }

  onDestroy(() => {
    gsap.killTweensOf(cam?.position)
  })
</script>

<!--
  Threlte's declarative scene graph.
  The heavy lifting (model loading, post-processing) is done imperatively above,
  but lights and camera are declared here so Threlte manages them.
-->

<!-- Camera -->
<T.PerspectiveCamera
  makeDefault
  fov={60}
  near={0.1}
  far={1000}
  position={[0, 3, 8]}
  on:create={({ ref }) => {
    cam = ref
  }}
>
  <!-- OrbitControls are a child of the camera in Threlte -->
  <OrbitControls
    enableZoom={false}
    enablePan={false}
    enableDamping
    on:create={({ ref }) => {
      controls = ref
    }}
  />
</T.PerspectiveCamera>

<!-- Global hemisphere light -->
<T.HemisphereLight skyColor={0xffffff} groundColor={0x444444} intensity={1} />

<!--
  Exterior group – click events bubble up through Threlte's interactivity system.
  We forward any click to handleExteriorClick which walks the object hierarchy.
-->
<T.Group
  on:click={handleExteriorClick}
  on:create={({ ref }) => {
    exteriorGroup === ref || Object.assign(exteriorGroup, ref)
  }}
/>

<!--
  Interior group – same pattern.
-->
<T.Group
  on:click={handleInteriorClick}
  on:create={({ ref }) => {
    interiorGroup === ref || Object.assign(interiorGroup, ref)
  }}
/>

<!--
  Note: The actual GLTFs are loaded imperatively in loadExterior / loadInterior
  and added to exteriorGroup / interiorGroup. An alternative is to use
  <GLTF url="..." /> from @threlte/extras and bind its scene, but the imperative
  approach is retained here to preserve the door-pivot and seat-mesh logic
  exactly as in the original.
-->
