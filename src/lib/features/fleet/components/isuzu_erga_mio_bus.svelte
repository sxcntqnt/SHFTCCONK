<script>
  import { T } from "@threlte/core"
  import { useGltfWithDraco } from "$lib/features/fleet/services/three/useGltfWithDraco"
  let {
    fallback,
    error,
    children,
    ref = $bindable(),
    onload,
    ...props
  } = $props()
  const gltf = useGltfWithDraco("/models/isuzu_erga_mio_bus-transformed.glb")
  // Notify SceneContents when model is ready (for door/seat discovery)
  gltf.then((g) => onload?.(g.scene)).catch(() => {})
</script>

<T.Group bind:ref dispose={false} {...props}>
  {#await gltf}
    {@render fallback?.()}
  {:then gltf}
    <T.Mesh
      geometry={gltf.nodes.Object_2.geometry}
      material={gltf.materials.standard}
      rotation={[-Math.PI / 2, 0, 0]}
    />
  {:catch err}
    {@render error?.({ error: err })}
  {/await}
  {@render children?.({ ref })}
</T.Group>
