<script lang="ts">
  /**
   * VehicleModelWrapper.svelte
   *
   * Generic Threlte component that accepts a pre-built GLTFLoader (with DRACO)
   * and loads any .glb file. Fires `onload` when the THREE scene is ready so
   * the parent (SceneContents) can hook in BusInterior and door detection.
   *
   * All fleet model components can use this directly OR extend this pattern.
   */

  import { T } from "@threlte/core"
  import { onMount, onDestroy } from "svelte"
  import * as THREE from "three"
  import type { GLTFLoader } from "three-stdlib"

  let {
    loader,
    glbPath = "/models/generic_matatu.glb",
    onload,
  }: {
    loader: GLTFLoader
    glbPath?: string
    onload?: (scene: THREE.Group) => void
  } = $props()

  let scene = $state<THREE.Group | null>(null)
  let loadError = $state<string | null>(null)

  onMount(() => {
    if (!loader) {
      loadError = "GLTFLoader not available"
      console.error("[VehicleModelWrapper] loader prop is undefined")
      return
    }

    loader.load(
      glbPath,
      (gltf) => {
        // Enable shadows on every mesh in the model
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })
        scene = gltf.scene
        onload?.(gltf.scene)
      },
      undefined,
      (err) => {
        loadError = `Failed to load "${glbPath}": ${err}`
        console.error("[VehicleModelWrapper]", err)
      },
    )
  })

  onDestroy(() => {
    // Dispose geometry/materials to avoid GPU leaks when component unmounts
    scene?.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (mesh.isMesh) {
        mesh.geometry?.dispose()
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose())
        } else {
          mesh.material?.dispose()
        }
      }
    })
  })
</script>

{#if scene}
  <T is={scene} />
{/if}

{#if loadError}
  <!-- Silent in production — error surfaced in console -->
{/if}
