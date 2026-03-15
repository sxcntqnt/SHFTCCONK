<script>
  import { T } from "@threlte/core"
  import * as THREE from "three"
  import { useGltfWithDraco } from "$lib/features/fleet/services/three/useGltfWithDraco"
  let {
    fallback,
    error,
    children,
    ref = $bindable(),
    onload,
    ...props
  } = $props()
  const gltf = useGltfWithDraco("/models/seat.glb")
  gltf.then((g) => onload?.(g.scene)).catch(() => {})
</script>

<T.Group bind:ref dispose={false} {...props}>
  {#await gltf}
    {@render fallback?.()}
  {:then gltf}
    <T.Group rotation={[-0.78, -1.04, -1.88]}>
      <T.Mesh
        geometry={gltf.nodes.Object_2.geometry}
        material={gltf.materials.material_0}
      />
      <T.Mesh
        geometry={gltf.nodes.Object_3.geometry}
        material={gltf.materials.material_0}
      />
      <T.Mesh
        geometry={gltf.nodes.Object_4.geometry}
        material={gltf.materials.material_0}
      />
      <T.Mesh
        geometry={gltf.nodes.Object_5.geometry}
        material={gltf.materials.material_0}
      />
      <T.Mesh
        geometry={gltf.nodes.Object_6.geometry}
        material={gltf.materials.material_0}
      />
    </T.Group>
  {:catch err}
    {@render error?.({ error: err })}
  {/await}
  {@render children?.({ ref })}
</T.Group>
