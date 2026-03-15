/**
 * gltfLoader.ts
 *
 * BEFORE: called `useDraco()` from @threlte/extras at module level.
 *         useDraco is a Threlte hook — it MUST be called inside a component
 *         that lives within a <Canvas> tree. At module level it has no context
 *         and returns undefined, so the DRACOLoader was never actually set,
 *         giving: "THREE.GLTFLoader: No DRACOLoader instance provided."
 *
 * FIX:    Use DRACOLoader from three-stdlib directly. It is a plain class and
 *         does not need any Svelte/Threlte context. This is exactly what
 *         useDraco does internally — we just do it ourselves.
 */

import { browser } from "$app/environment"
import { GLTFLoader, DRACOLoader } from "three-stdlib"

let gltfLoader: GLTFLoader

if (browser) {
  // 1. Create a DRACOLoader and point it at the decoder bundle in /static/draco/
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath("/draco/")
  dracoLoader.preload() // warm-start the WASM decoder in a worker

  // 2. Create the GLTFLoader and wire in DRACO support
  gltfLoader = new GLTFLoader()
  gltfLoader.setDRACOLoader(dracoLoader)
}

export { gltfLoader }

// Also export the classes for callers that need to create their own instances
export { GLTFLoader, DRACOLoader }