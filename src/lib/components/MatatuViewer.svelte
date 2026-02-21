<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import * as THREE from 'three'
  import { OrbitControls } from 'three-stdlib'
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
  import { EffectComposer } from 'three-stdlib'
  import { RenderPass } from 'three-stdlib'
  import { BokehPass } from 'three-stdlib'
  import { RGBELoader } from 'three-stdlib'
  import { gsap } from 'gsap'

  export let selectedSeats: number[] = []
  export let toggleSeat: (n: number) => void
  export let capacity: string = '14'
  export let modelKey: string

  let container: HTMLDivElement

  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let renderer: THREE.WebGLRenderer
  let composer: EffectComposer
  let bokehPass: BokehPass
  let controls: OrbitControls
  let raycaster: THREE.Raycaster
  let mouse: THREE.Vector2

  let animationId: number
  let pollingInterval: any

  let viewMode: 'exterior' | 'interior' = 'exterior'
  let loading = true
  let interiorLoaded = false

  const exteriorGroup = new THREE.Group()
  const interiorGroup = new THREE.Group()

  const seatMeshes: Map<number, THREE.Mesh> = new Map()
  let reservedSeats: number[] = []

  let doorMesh: THREE.Object3D | null = null
  let doorPivot: THREE.Object3D | null = null
  let doorShaft: THREE.Mesh

  let interiorLight: THREE.PointLight
  let ambientInterior: THREE.AmbientLight

  let doorAudio: HTMLAudioElement

  let needsRender = true
  const requestRender = () => (needsRender = true)

  /* =========================
     INIT SCENE
  ========================== */

  function initScene() {
    scene = new THREE.Scene()

    camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / 500,
      0.1,
      1000
    )
    camera.position.set(0, 3, 8)

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(container.clientWidth, 500)

    renderer.physicallyCorrectLights = true
    renderer.outputEncoding = THREE.sRGBEncoding
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1

    container.appendChild(renderer.domElement)

    composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))

    bokehPass = new BokehPass(scene, camera, {
      focus: 5.0,
      aperture: 0.0002,
      maxblur: 0.01
    })

    composer.addPass(bokehPass)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableZoom = false
    controls.enablePan = false
    controls.enableDamping = true

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1)
    scene.add(hemi)

    ambientInterior = new THREE.AmbientLight(0xffffff, 0.05)
    interiorLight = new THREE.PointLight(0xffffff, 0.1, 20)
    interiorLight.position.set(0, 2, 0)

    interiorGroup.add(ambientInterior)
    interiorGroup.add(interiorLight)

    scene.add(exteriorGroup)
    scene.add(interiorGroup)
    interiorGroup.visible = false

    raycaster = new THREE.Raycaster()
    mouse = new THREE.Vector2()

    // HDR environment
    new RGBELoader().load('/hdr/studio.hdr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping
      scene.environment = texture
      scene.background = texture
      requestRender()
    })
  }

  /* =========================
     LOAD MODELS
  ========================== */

  function loadExterior() {
    const loader = new GLTFLoader()

    loader.load(`/models/${modelKey}-exterior.glb`, (gltf) => {
      gltf.scene.traverse((child: any) => {
        if (child.name === 'Door_Main') {
          doorMesh = child
        }
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

  /* =========================
     DOOR + LIGHT SHAFT
  ========================== */

  function createDoorPivot() {
    if (!doorMesh) return

    const hingeOffset = new THREE.Vector3(-0.6, 0, 0)
    const hingeWorld = doorMesh.position.clone().add(hingeOffset)

    doorPivot = new THREE.Object3D()
    doorPivot.position.copy(hingeWorld)
    exteriorGroup.add(doorPivot)

    doorMesh.position.sub(hingeWorld)
    doorPivot.add(doorMesh)

    createLightShaft()
  }

  function createLightShaft() {
    const geometry = new THREE.ConeGeometry(1.2, 4, 32, 1, true)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
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
        ease: 'back.out(1.7)',
        onUpdate: requestRender,
        onComplete: resolve
      })

      gsap.to(doorShaft.material, {
        opacity: 0.4,
        duration: 1,
        ease: 'power2.out',
        onUpdate: requestRender
      })
    })
  }

  function closeDoor() {
    if (!doorPivot) return

    gsap.to(doorPivot.rotation, {
      y: 0.05,
      duration: 0.6,
      ease: 'power3.in',
      onUpdate: requestRender
    })

    gsap.to(doorPivot.rotation, {
      y: 0,
      duration: 0.2,
      delay: 0.6,
      ease: 'power1.out',
      onUpdate: requestRender
    })

    gsap.to(doorShaft.material, {
      opacity: 0,
      duration: 0.5,
      onUpdate: requestRender
    })
  }

  /* =========================
     CAMERA FX
  ========================== */

  function addHeadBob() {
    const originalY = camera.position.y

    gsap.to(camera.position, {
      y: originalY + 0.1,
      duration: 0.15,
      yoyo: true,
      repeat: 3,
      ease: 'sine.inOut',
      onUpdate: requestRender
    })
  }

  function focusOnAvailableSeat() {
    const available = [...seatMeshes.keys()].find(
      (s) => !reservedSeats.includes(s)
    )
    if (!available) return

    const mesh = seatMeshes.get(available)
    if (!mesh) return

    const target = mesh.getWorldPosition(new THREE.Vector3())

    bokehPass.materialBokeh.uniforms.focus.value = 2.0

    gsap.to(camera.position, {
      x: target.x,
      y: target.y + 1,
      z: target.z + 2,
      duration: 1.2,
      ease: 'power4.inOut',
      onUpdate: requestRender
    })
  }

  /* =========================
     TRANSITIONS
  ========================== */

  async function enterInterior() {
    if (!interiorLoaded) loadInterior()

    await openDoor()

    addHeadBob()

    await new Promise<void>((resolve) => {
      gsap.to(camera.position, {
        x: 0,
        y: 2,
        z: 2.5,
        duration: 1,
        ease: 'expo.out',
        onUpdate: requestRender,
        onComplete: resolve
      })
    })

    exteriorGroup.visible = false
    interiorGroup.visible = true

    gsap.to(ambientInterior, { intensity: 0.6, duration: 1.2 })
    gsap.to(interiorLight, { intensity: 1.4, duration: 1.2 })

    setTimeout(focusOnAvailableSeat, 600)

    viewMode = 'interior'
  }

  function goBack() {
    interiorGroup.visible = false
    exteriorGroup.visible = true

    gsap.to(camera.position, {
      x: 0,
      y: 3,
      z: 8,
      duration: 1,
      ease: 'power4.inOut',
      onUpdate: requestRender,
      onComplete: closeDoor
    })

    gsap.to(ambientInterior, { intensity: 0.05, duration: 0.6 })
    gsap.to(interiorLight, { intensity: 0.1, duration: 0.6 })

    viewMode = 'exterior'
  }

  /* =========================
     SEAT REACTIVITY
  ========================== */

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
          ease: 'sine.inOut'
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

  /* =========================
     RENDER LOOP
  ========================== */

  function animate() {
    animationId = requestAnimationFrame(animate)

    if (!needsRender) return

    controls.update()
    composer.render()
    needsRender = false
  }

  /* =========================
     CLICK HANDLING
  ========================== */

  function handleClick(event: MouseEvent) {
    const rect = renderer.domElement.getBoundingClientRect()

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(mouse, camera)

    const intersects =
      viewMode === 'exterior'
        ? raycaster.intersectObjects(exteriorGroup.children, true)
        : raycaster.intersectObjects(interiorGroup.children, true)

    if (!intersects.length) return

    const object = intersects[0].object

    if (viewMode === 'exterior' && object.name === 'Door_Main') {
      enterInterior()
      return
    }

    if (viewMode === 'interior' && object.name.startsWith('Seat_')) {
      if (object.userData.disabled) return
      const seatNumber = parseInt(object.name.split('_')[1])
      toggleSeat(seatNumber)
    }
  }

  /* =========================
     LIFECYCLE
  ========================== */

  onMount(() => {
    initScene()
    loadExterior()

    doorAudio = new Audio('/sounds/door-open.mp3')
    doorAudio.volume = 0.5

    renderer.domElement.addEventListener('click', handleClick)

    pollingInterval = setInterval(fetchReservedSeats, 10000)
    fetchReservedSeats()

    animate()
  })

  async function fetchReservedSeats() {
    try {
      const res = await fetch(`/reserve/status?capacity=${capacity}`)
      const data = await res.json()
      reservedSeats = data.reserved || []
      requestRender()
    } catch (err) {
      console.error('Seat polling failed', err)
    }
  }

  onDestroy(() => {
  if (typeof window !== 'undefined') {
    cancelAnimationFrame(animationId);
    clearInterval(pollingInterval);
    renderer.dispose();
  }
});
</script>

<div bind:this={container} class="w-full h-[500px] relative"></div>

{#if loading}
  <div class="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
    <div class="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
  </div>
{/if}

{#if viewMode === 'interior'}
  <button
    on:click={goBack}
    class="absolute top-4 left-4 bg-white px-4 py-2 rounded shadow z-20"
  >
    ← Back
  </button>
{/if}