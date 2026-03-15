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
    "/models/retro_anime_vintage_volkswagen_van-transformed.glb",
  )
  gltf.then((g) => onload?.(g.scene)).catch(() => {})
</script>

<T.Group bind:ref dispose={false} {...props}>
  {#await gltf}
    {@render fallback?.()}
  {:then gltf}
    <T.Mesh
      geometry={gltf.nodes.Object_4.geometry}
      material={gltf.materials.material_0}
      rotation={[Math.PI / 2, 0, 0]}
    />
  {:catch err}
    {@render error?.({ error: err })}
  {/await}
  {@render children?.({ ref })}
</T.Group>
