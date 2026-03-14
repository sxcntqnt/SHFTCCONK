import { gltfLoader } from "./gltfLoader"
import type { GLTF } from "three-stdlib"
import * as THREE from "three"

/**
 * Wrap a GLB path into a loader function that returns a Svelte-compatible component.
 *
 * CHANGES:
 * 1. Import THREE explicitly (was missing).
 * 2. The returned component is now a factory that accepts `loader` as a prop.
 *    This avoids mutating the component function directly, which Svelte 5 disallows.
 */
export function createVehicleLoader(path: string) {
  return async (): Promise<{ default: any }> => {
    if (!gltfLoader) throw new Error("GLTFLoader not initialized")

    return new Promise((resolve, reject) => {
      gltfLoader.load(
        path,
        (gltf: GLTF) => {
          // Return a Svelte-compatible component that accepts loader via prop
          const Component = (props: { loader?: typeof gltfLoader }) => {
            const group = new THREE.Group()
            group.add(gltf.scene)
            return group
          }

          resolve({ default: Component })
        },
        undefined,
        (err) => reject(err)
      )
    })
  }
}