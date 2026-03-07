<script>
  import { T, useFrame } from "@threlte/core"
  import * as THREE from "three"
  type Player = {
    id: string
    data: any
    model?: any
  }

  let {
    player,
    isMe = false,
  }: {
    player: Player
    isMe?: boolean
  } = $props()

  let carGroup
  let frontWheels = []
  let rearWheels = []

  // Update car position/rotation each frame (handled by game loop)
</script>

Car component

<T.Group
  bind:ref={carGroup}
  position.x={player.data.x + player.data.xv}
  position.z={player.data.y + player.data.yv}
  rotation.y={player.data.dir}
>
  <!-- Car body -->
  <T.Mesh castShadow receiveShadow>
    <T.BoxGeometry args={[1, 1, 2]} />
    <T.MeshLambertMaterial color={`hsl(${player.data.color}, 100%, 50%)`} />
  </T.Mesh>

  <!-- Wheels -->
  <T.Group position={[0.6, -0.1, 0.7]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
    <T.Mesh castShadow receiveShadow>
      <T.CylinderGeometry args={[0.5, 0.5, 0.2, 10]} />
      <T.MeshLambertMaterial color="#222" />
    </T.Mesh>
  </T.Group>
  <T.Group
    position={[-0.6, -0.1, 0.7]}
    rotation={[Math.PI / 2, 0, Math.PI / 2]}
  >
    <T.Mesh castShadow receiveShadow>
      <T.CylinderGeometry args={[0.5, 0.5, 0.2, 10]} />
      <T.MeshLambertMaterial color="#222" />
    </T.Mesh>
  </T.Group>
  <T.Group
    position={[0.6, -0.1, -0.7]}
    rotation={[Math.PI / 2, 0, Math.PI / 2]}
  >
    <T.Mesh castShadow receiveShadow>
      <T.CylinderGeometry args={[0.5, 0.5, 0.2, 10]} />
      <T.MeshLambertMaterial color="#222" />
    </T.Mesh>
  </T.Group>
  <T.Group
    position={[-0.6, -0.1, -0.7]}
    rotation={[Math.PI / 2, 0, Math.PI / 2]}
  >
    <T.Mesh castShadow receiveShadow>
      <T.CylinderGeometry args={[0.5, 0.5, 0.2, 10]} />
      <T.MeshLambertMaterial color="#222" />
    </T.Mesh>
  </T.Group>
</T.Group>
