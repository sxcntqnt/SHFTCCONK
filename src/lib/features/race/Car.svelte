<!-- src/lib/features/race/Car.svelte -->
<script lang="ts">
  import { T } from "@threlte/core"
  import * as THREE from "three"

  type Player = {
    id: string
    data: {
      x: number
      y: number
      xv: number
      yv: number
      dir: number
      steer: number
      color: number
      name?: string
    }
    model?: any
  }

  let {
    player,
    isMe = false,
  }: {
    player: Player
    isMe?: boolean
  } = $props()

  const WHEEL_POSITIONS = {
    frontLeft: [0.6, -0.1, 0.7] as [number, number, number],
    frontRight: [-0.6, -0.1, 0.7] as [number, number, number],
    rearLeft: [0.6, -0.1, -0.7] as [number, number, number],
    rearRight: [-0.6, -0.1, -0.7] as [number, number, number],
  }

  const baseWheelRotation: [number, number, number] = [
    Math.PI / 2,
    0,
    Math.PI / 2,
  ]

  let frontSteer = $derived([
    Math.PI / 2,
    0,
    Math.PI / 2 - player.data.steer,
  ] as [number, number, number])
</script>

<T.Group
  position.x={player.data.x + player.data.xv}
  position.y={0.6}
  position.z={player.data.y + player.data.yv}
  rotation.y={player.data.dir}
>
  <!-- Car body -->
  <T.Mesh castShadow receiveShadow>
    <T.BoxGeometry args={[1, 1, 2]} />
    <T.MeshLambertMaterial color={`hsl(${player.data.color}, 100%, 50%)`} />
  </T.Mesh>

  <!-- Front-left wheel (steerable) -->
  <T.Group position={WHEEL_POSITIONS.frontLeft} rotation={frontSteer}>
    <T.Mesh castShadow receiveShadow>
      <T.CylinderGeometry args={[0.5, 0.5, 0.2, 10]} />
      <T.MeshLambertMaterial color="#222" />
    </T.Mesh>
  </T.Group>

  <!-- Front-right wheel (steerable) -->
  <T.Group position={WHEEL_POSITIONS.frontRight} rotation={frontSteer}>
    <T.Mesh castShadow receiveShadow>
      <T.CylinderGeometry args={[0.5, 0.5, 0.2, 10]} />
      <T.MeshLambertMaterial color="#222" />
    </T.Mesh>
  </T.Group>

  <!-- Rear-left wheel (fixed) -->
  <T.Group position={WHEEL_POSITIONS.rearLeft} rotation={baseWheelRotation}>
    <T.Mesh castShadow receiveShadow>
      <T.CylinderGeometry args={[0.5, 0.5, 0.2, 10]} />
      <T.MeshLambertMaterial color="#222" />
    </T.Mesh>
  </T.Group>

  <!-- Rear-right wheel (fixed) -->
  <T.Group position={WHEEL_POSITIONS.rearRight} rotation={baseWheelRotation}>
    <T.Mesh castShadow receiveShadow>
      <T.CylinderGeometry args={[0.5, 0.5, 0.2, 10]} />
      <T.MeshLambertMaterial color="#222" />
    </T.Mesh>
  </T.Group>

  <!-- Name label for other players -->
  {#if !isMe && player.data?.name}
    <T.Group position={[0, 1.4, 0]}>
      <!-- Billboard label handled in CSS overlay via store, not in 3D -->
    </T.Group>
  {/if}
</T.Group>
