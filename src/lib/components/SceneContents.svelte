<script lang="ts">
  import { onMount, onDestroy } from "svelte"
  import { T, useThrelte, useTask } from "@threlte/core"
  import { OrbitControls, interactivity } from "@threlte/extras"
  import * as THREE from "three"
  import { vehicleModelLoaders, resolveModelKey } from "$lib/features/fleet"
  import { BusInterior } from "$lib/features/fleet/components/BusInterior/NgNyAnAN"
  import { useGltfWithDraco } from "$lib/features/fleet/services/three/useGltfWithDraco"
  import {
    RGBELoader,
    EffectComposer,
    RenderPass,
    BokehPass,
  } from "three-stdlib"
  import { gsap } from "gsap"

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

  const { renderer, scene, camera, invalidate } = useThrelte()
  const req = () => invalidate()

  interactivity()

  let ModelComponent = $state<any>(null)
  let showExterior = $state(true)
  let showInterior = $state(false)

  const seatMeshes = new Map<number, THREE.Mesh>()
  let loadedScene: THREE.Group | null = null
  let busInterior: BusInterior | null = null

  // Seat GLB — loaded once, shared across all interiors
  let seatScene: THREE.Group | null = null
  const seatGltf = useGltfWithDraco("/models/seat.glb")
  seatGltf
    .then((g) => {
      seatScene = g.scene
    })
    .catch(() => {
      console.warn(
        "[SceneContents] seat.glb not found — seats will use box fallback",
      )
    })

  let doorPivot: THREE.Object3D | null = null
  let doorShaft: THREE.Mesh
  let doorMeshRef: THREE.Object3D | null = null

  let interiorLight: THREE.PointLight
  let ambientInterior: THREE.AmbientLight
  let doorAudio: HTMLAudioElement

  let cam: THREE.PerspectiveCamera
  let controls: any

  let composer: EffectComposer
  let bokehPass: BokehPass

  let exteriorGroupRef: THREE.Group
  let interiorGroupRef: THREE.Group

  const exteriorPos = new THREE.Vector3()
  const exteriorTarget = new THREE.Vector3()

  // ── Ground snap ───────────────────────────────────────────────────────────
  function groundSnap(group: THREE.Group) {
    const box = new THREE.Box3().setFromObject(group)
    if (box.isEmpty()) return
    group.position.y -= box.min.y
  }

  // ── Camera fit ────────────────────────────────────────────────────────────
  function fitCamera(group: THREE.Group, instant = false) {
    const box = new THREE.Box3().setFromObject(group)
    if (box.isEmpty()) return

    const centre = new THREE.Vector3()
    const size = new THREE.Vector3()
    box.getCenter(centre)
    box.getSize(size)

    const busLength = Math.max(size.x, size.z)
    const busHeight = size.y
    const fovRad = cam.fov * (Math.PI / 180)
    const dist = (busLength / 2 / Math.tan(fovRad / 2)) * 1.8
    const eyeHeight = busHeight * 0.28

    const camPos = new THREE.Vector3(centre.x, eyeHeight, centre.z + dist)
    const lookAt = new THREE.Vector3(centre.x, centre.y * 0.6, centre.z)

    exteriorPos.copy(camPos)
    exteriorTarget.copy(lookAt)

    if (instant) {
      cam.position.copy(camPos)
      if (controls) {
        controls.target.copy(lookAt)
        controls.update()
      }
      req()
    } else {
      gsap.to(cam.position, {
        x: camPos.x,
        y: camPos.y,
        z: camPos.z,
        duration: 1.0,
        ease: "power3.out",
        onUpdate: () => {
          if (controls) {
            controls.target.copy(lookAt)
            controls.update()
          }
          req()
        },
      })
      if (controls) {
        controls.target.copy(lookAt)
        controls.update()
      }
    }
  }

  // ── Model loading ─────────────────────────────────────────────────────────
  async function loadModelFromIndex() {
    const key = resolveModelKey(modelKey || capacity)
    const loader = vehicleModelLoaders[key]
    if (!loader) {
      console.warn(`[SceneContents] No loader for "${key}"`)
      return false
    }
    try {
      const mod = await loader()
      ModelComponent = mod.default
      return true
    } catch (err) {
      console.error("[SceneContents] Load failed:", err)
      return false
    }
  }

  function handleModelLoad(sceneArg: THREE.Group) {
    loadedScene = sceneArg
    sceneArg.traverse((obj) => {
      const m = obj as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = m.receiveShadow = true
      }
    })

    doorMeshRef = null
    sceneArg.traverse((obj) => {
      if (obj.name === "Door_Main") doorMeshRef = obj
    })
    if (doorMeshRef && exteriorGroupRef) setupDoorPivot()

    requestAnimationFrame(() => {
      if (exteriorGroupRef) {
        groundSnap(exteriorGroupRef)
        fitCamera(exteriorGroupRef, true)
      }
    })

    req()
  }

  // ── Mount ─────────────────────────────────────────────────────────────────
  onMount(async () => {
    const r = renderer as THREE.WebGLRenderer
    const s = scene as THREE.Scene
    const c = $camera as THREE.PerspectiveCamera
    cam = c
    cam.position.set(0, 5, 20)

    r.outputColorSpace = THREE.SRGBColorSpace
    r.toneMapping = THREE.ACESFilmicToneMapping
    r.toneMappingExposure = 0.6
    r.shadowMap.enabled = true
    r.shadowMap.type = THREE.PCFSoftShadowMap

    s.background = new THREE.Color(0x07091a)

    composer = new EffectComposer(r)
    composer.addPass(new RenderPass(s, c))
    bokehPass = new BokehPass(s, c, {
      focus: 6.0,
      aperture: 0.00003,
      maxblur: 0.003,
    })
    composer.addPass(bokehPass)

    new RGBELoader().load(
      "/hdr/garage.hdr",
      (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping
        s.environment = tex
        s.background = tex
        req()
      },
      undefined,
      (err) =>
        console.warn(
          "[SceneContents] HDR load failed — check /static/hdr/garage.hdr:",
          err,
        ),
    )

    ambientInterior = new THREE.AmbientLight(0xffeedd, 0.05)
    interiorLight = new THREE.PointLight(0xffeedd, 0.1, 20)
    interiorLight.position.set(0, 2, 0)

    doorAudio = new Audio("/sounds/door-open.mp3")
    doorAudio.volume = 0.5

    const loaded = await loadModelFromIndex()
    if (!loaded) loadPlaceholderExterior()

    loading = false
    req()
  })

  useTask(
    () => {
      controls?.update()
      composer?.render()
    },
    { autoInvalidate: false },
  )

  // ── Placeholder ───────────────────────────────────────────────────────────
  function loadPlaceholderExterior() {
    if (!exteriorGroupRef) return
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1.2, 4),
      new THREE.MeshStandardMaterial({
        color: 0xf26522,
        roughness: 0.4,
        metalness: 0.3,
      }),
    )
    body.position.y = 0.6
    body.castShadow = true
    exteriorGroupRef.add(body)
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
    )
    door.name = "Door_Main"
    door.position.set(0.8, 0.5, 2)
    exteriorGroupRef.add(door)
    doorMeshRef = door
    setupDoorPivot()
    groundSnap(exteriorGroupRef)
    fitCamera(exteriorGroupRef, true)
  }

  // ── Build interior seats ──────────────────────────────────────────────────
  function buildInteriorSeats() {
    if (!interiorGroupRef) return

    if (loadedScene) {
      busInterior = new BusInterior(loadedScene, interiorGroupRef)

      // Wire seat GLB if loaded
      if (seatScene) {
        busInterior.setSeatModel(seatScene)
      } else {
        console.info(
          "[SceneContents] seat.glb not ready — using box geometry fallback",
        )
      }

      // Wire toggleSeat so interaction.handleClick works
      busInterior.setToggleSeat(toggleSeat)

      busInterior.buildInterior()

      // Map seat instances for colour reactivity
      seatMeshes.clear()
      const inst = busInterior.seats.seatInstance
      const idxMap = busInterior.seats.seatIndexMap
      if (inst && idxMap) {
        // InstancedMesh: expose via userData so click handler can read instanceId
        inst.userData.isSeatInstance = true
        idxMap.forEach((mi: number, sn: number) => {
          // For InstancedMesh we store a proxy mesh for colour reactivity
          // The actual colour update goes through BusSeatState
          const proxy = new THREE.Mesh(
            new THREE.BoxGeometry(0),
            new THREE.MeshStandardMaterial(),
          )
          proxy.name = `Seat_${sn}`
          proxy.userData.seatNumber = sn
          proxy.userData.instanceIdx = mi
          seatMeshes.set(sn, proxy)
        })
      }
    } else {
      // No real model — plain box seats
      const count = parseInt(capacity) || 14
      for (let i = 1; i <= count; i++) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.4, 0.4),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
        )
        const col = (i - 1) % 4
        const row = Math.floor((i - 1) / 4)
        mesh.position.set(col * 0.6 - 0.9, 0.5, row * 0.7 - 1)
        mesh.name = `Seat_${i}`
        mesh.castShadow = true
        interiorGroupRef.add(mesh)
        seatMeshes.set(i, mesh)
      }
    }

    interiorGroupRef.add(ambientInterior, interiorLight)
    interiorLoaded = true
    req()
  }

  // ── Door ──────────────────────────────────────────────────────────────────
  function setupDoorPivot() {
    if (!doorMeshRef || !exteriorGroupRef) return
    const hinge = doorMeshRef.position
      .clone()
      .add(new THREE.Vector3(-0.6, 0, 0))
    doorPivot = new THREE.Object3D()
    doorPivot.position.copy(hinge)
    exteriorGroupRef.add(doorPivot)
    doorMeshRef.position.sub(hinge)
    doorPivot.add(doorMeshRef)
    const shaftMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    doorShaft = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 4, 32, 1, true),
      shaftMat,
    )
    doorShaft.position.set(0, 2, 1.5)
    doorShaft.rotation.x = Math.PI
    exteriorGroupRef.add(doorShaft)
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
        onUpdate: req,
        onComplete: resolve,
      })
      if (doorShaft?.material)
        gsap.to(doorShaft.material as THREE.MeshBasicMaterial, {
          opacity: 0.4,
          duration: 1,
          ease: "power2.out",
          onUpdate: req,
        })
    })
  }

  function closeDoor() {
    if (!doorPivot) return
    gsap.to(doorPivot.rotation, {
      y: 0.05,
      duration: 0.6,
      ease: "power3.in",
      onUpdate: req,
    })
    gsap.to(doorPivot.rotation, {
      y: 0,
      duration: 0.2,
      delay: 0.6,
      ease: "power1.out",
      onUpdate: req,
    })
    if (doorShaft?.material)
      gsap.to(doorShaft.material as THREE.MeshBasicMaterial, {
        opacity: 0,
        duration: 0.5,
        onUpdate: req,
      })
  }

  // ── Interior camera ───────────────────────────────────────────────────────
  function focusSeat() {
    if (!busInterior?.seats.seatInstance) {
      // Plain mesh seats
      const n = [...seatMeshes.keys()].find((s) => !reservedSeats.includes(s))
      if (!n) return
      const pos = seatMeshes.get(n)?.position
      if (!pos) return
      gsap.to(cam.position, {
        x: pos.x,
        y: pos.y + 0.8,
        z: pos.z + 1.5,
        duration: 1.2,
        ease: "power4.inOut",
        onUpdate: req,
      })
      return
    }

    // InstancedMesh — get first available seat position
    const inst = busInterior.seats.seatInstance
    const idxMap = busInterior.seats.seatIndexMap
    let targetPos: THREE.Vector3 | null = null
    idxMap.forEach((mi: number, sn: number) => {
      if (targetPos || reservedSeats.includes(sn)) return
      const mat = new THREE.Matrix4()
      inst.getMatrixAt(mi, mat)
      targetPos = new THREE.Vector3().setFromMatrixPosition(mat)
    })
    if (!targetPos) return

    const t = targetPos as THREE.Vector3
    gsap.to(cam.position, {
      x: t.x,
      y: t.y + 0.8,
      z: t.z + 1.5,
      duration: 1.2,
      ease: "power4.inOut",
      onUpdate: req,
    })
    if (controls)
      gsap.to(controls.target, {
        x: t.x,
        y: t.y,
        z: t.z,
        duration: 1.2,
        ease: "power4.inOut",
        onUpdate: () => {
          controls.update()
          req()
        },
      })
  }

  // ── View transitions ──────────────────────────────────────────────────────
  async function enterInterior() {
    if (!interiorLoaded) buildInteriorSeats()
    await openDoor()

    const box = new THREE.Box3().setFromObject(
      exteriorGroupRef ?? new THREE.Group(),
    )
    const centre = new THREE.Vector3()
    const size = new THREE.Vector3()
    box.getCenter(centre)
    box.getSize(size)
    const interior = new THREE.Vector3(
      centre.x,
      centre.y + size.y * 0.1,
      centre.z,
    )

    gsap.to(cam.position, {
      y: cam.position.y + 0.1,
      duration: 0.15,
      yoyo: true,
      repeat: 3,
      ease: "sine.inOut",
      onUpdate: req,
    })

    await new Promise<void>((resolve) => {
      gsap.to(cam.position, {
        x: interior.x,
        y: interior.y,
        z: interior.z,
        duration: 1.0,
        ease: "expo.out",
        onUpdate: req,
        onComplete: resolve,
      })
    })

    if (controls) {
      controls.target.copy(
        new THREE.Vector3(interior.x, interior.y, interior.z - 1),
      )
      controls.update()
    }

    showExterior = false
    showInterior = true
    gsap.to(ambientInterior, { intensity: 0.6, duration: 1.2 })
    gsap.to(interiorLight, { intensity: 1.4, duration: 1.2 })
    setTimeout(focusSeat, 600)
    viewMode = "interior"
  }

  export function goBack() {
    showInterior = false
    showExterior = true
    gsap.to(cam.position, {
      x: exteriorPos.x,
      y: exteriorPos.y,
      z: exteriorPos.z,
      duration: 1.0,
      ease: "power4.inOut",
      onUpdate: req,
      onComplete: closeDoor,
    })
    if (controls)
      gsap.to(controls.target, {
        x: exteriorTarget.x,
        y: exteriorTarget.y,
        z: exteriorTarget.z,
        duration: 1.0,
        ease: "power4.inOut",
        onUpdate: () => {
          controls.update()
          req()
        },
      })
    gsap.to(ambientInterior, { intensity: 0.05, duration: 0.6 })
    gsap.to(interiorLight, { intensity: 0.1, duration: 0.6 })
    viewMode = "exterior"
  }

  // ── Click handling ────────────────────────────────────────────────────────
  function onExteriorClick(e: CustomEvent<{ object: THREE.Object3D }>) {
    let node: THREE.Object3D | null = e.detail?.object
    while (node) {
      if (node.name === "Door_Main") {
        enterInterior()
        return
      }
      node = node.parent
    }
  }

  function onInteriorClick(e: CustomEvent<{ object: THREE.Object3D }>) {
    const obj = e.detail?.object
    if (!obj) return

    // InstancedMesh click — BusInteraction handles via setToggleSeat
    if (busInterior?.interaction) {
      busInterior.interaction.handleClick(obj)
      return
    }

    // Plain mesh fallback
    let node: THREE.Object3D | null = obj
    while (node) {
      if (node.name.startsWith("Seat_")) {
        if (!node.userData.disabled)
          toggleSeat(parseInt(node.name.split("_")[1]))
        return
      }
      node = node.parent
    }
  }

  // ── Seat colour — drives BusSeatState for InstancedMesh ──────────────────
  $effect(() => {
    void reservedSeats.length
    void selectedSeats.length

    if (busInterior?.seatState?.updateSeatColors) {
      busInterior.seatState.updateSeatColors(reservedSeats, selectedSeats)
      req()
      return
    }

    // Plain mesh fallback colour
    seatMeshes.forEach((mesh, n) => {
      const mat = mesh.material as THREE.MeshStandardMaterial
      if (!mat?.color) return
      if (reservedSeats.includes(n)) {
        mat.color.set(0xef4444)
        mesh.userData.disabled = true
      } else if (selectedSeats.includes(n)) {
        mat.color.set(0x0ea5e9)
        mesh.userData.disabled = false
      } else {
        mat.color.set(0xffffff)
        mesh.userData.disabled = false
      }
    })
    req()
  })

  onDestroy(() => {
    gsap.killTweensOf(cam?.position)
    composer?.dispose()
  })
</script>

<T.PerspectiveCamera
  fov={55}
  near={0.01}
  far={5000}
  position={[0, 5, 20]}
  on:create={({ ref }) => {
    cam = ref as THREE.PerspectiveCamera
    useThrelte().camera.set(ref as THREE.PerspectiveCamera)
  }}
>
  <OrbitControls
    enableZoom={true}
    enablePan={false}
    enableDamping
    dampingFactor={0.08}
    minDistance={0.5}
    maxDistance={500}
    on:create={({ ref }) => {
      controls = ref
    }}
  />
</T.PerspectiveCamera>

<T.AmbientLight intensity={0.4} color={0xd0e8ff} />
<T.HemisphereLight skyColor={0xd0e8ff} groundColor={0x303040} intensity={0.9} />
<T.DirectionalLight
  intensity={1.4}
  position={[4, 8, 5]}
  castShadow
  shadow.mapSize.width={2048}
  shadow.mapSize.height={2048}
  shadow.camera.near={0.5}
  shadow.camera.far={500}
/>
<T.DirectionalLight intensity={0.3} position={[-4, 4, -4]} />

{#if showExterior}
  <T.Group
    on:click={onExteriorClick}
    on:create={({ ref }) => {
      exteriorGroupRef = ref
    }}
  >
    {#if ModelComponent}
      <ModelComponent
        onload={handleModelLoad}
        capacity={parseInt(capacity) || 14}
      />
    {/if}
  </T.Group>
{/if}

{#if showInterior}
  <T.Group
    on:click={onInteriorClick}
    on:create={({ ref }) => {
      interiorGroupRef = ref
    }}
  />
{/if}
