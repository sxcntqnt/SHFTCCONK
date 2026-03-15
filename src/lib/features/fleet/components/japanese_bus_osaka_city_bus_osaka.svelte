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
  const gltf = useGltfWithDraco(
    "/models/japanese_bus_osaka_city_bus_osaka-transformed.glb",
  )
  gltf.then((g) => onload?.(g.scene)).catch(() => {})
</script>

<T.Group bind:ref dispose={false} {...props}>
  {#await gltf}
    {@render fallback?.()}
  {:then gltf}
    <T.Mesh
      geometry={gltf.nodes.Cube003_OsakaCity_0.geometry}
      material={gltf.materials.OsakaCity}
      position={[0, 89.69, 4921.14]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={100}
    />
  {:catch err}
    {@render error?.({ error: err })}
  {/await}
  {@render children?.({ ref })}
</T.Group>
