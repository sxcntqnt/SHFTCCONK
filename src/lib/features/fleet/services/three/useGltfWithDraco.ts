/**
 * useGltfWithDraco.ts
 *
 * Returns a Promise<ThrelteGltf> — matches exactly how the @threlte/gltf CLI
 * generates components, which use:
 *
 *   {#await gltf}          ← needs a Promise, not a Readable store
 *     <Fallback />
 *   {:then gltf}
 *     <T.Mesh geometry={gltf.nodes.Object_2.geometry} ... />
 *   {:catch err}
 *     ...
 *   {/await}
 *
 * Threlte's own useGltf returns an AsyncWritable (Promise + Readable).
 * We only need the Promise half since none of these generated components
 * use the $gltf reactive store syntax in their templates.
 *
 * Uses the existing gltfLoader singleton from gltfLoader.ts which already
 * has DRACOLoader wired up — no new loader code needed.
 */

import { browser } from "$app/environment"
import type { GLTF } from "three-stdlib"
import * as THREE from "three"
import { gltfLoader } from "$lib/features/fleet/services/three/gltfLoader"

export type ThrelteGltf = GLTF & {
  nodes: Record<string, THREE.Object3D>
  materials: Record<string, THREE.Material>
}

export function useGltfWithDraco(path: string): Promise<ThrelteGltf> {
  // Return a never-resolving promise on the server — Threlte only runs in browser
  if (!browser) return new Promise(() => {})

  if (!gltfLoader) {
    return Promise.reject(
      new Error(
        "[useGltfWithDraco] gltfLoader is undefined — check /static/draco/ exists",
      ),
    )
  }

  return new Promise<ThrelteGltf>((resolve, reject) => {
    gltfLoader.load(
      path,
      (gltf: GLTF) => {
        // Build nodes map — all named Object3Ds in the scene graph
        const nodes: Record<string, THREE.Object3D> = {}
        gltf.scene.traverse((obj) => {
          if (obj.name) nodes[obj.name] = obj
        })

        // Build materials map — all named materials on meshes
        const materials: Record<string, THREE.Material> = {}
        gltf.scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh
          if (!mesh.isMesh) return
          const mats = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]
          for (const m of mats) {
            if (m?.name) materials[m.name] = m
          }
        })

        resolve({ ...gltf, nodes, materials })
      },
      undefined,
      (err) => reject(err),
    )
  })
}
