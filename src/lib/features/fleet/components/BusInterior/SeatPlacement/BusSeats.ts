import * as THREE from 'three'

interface SeatPlacement {
  position: THREE.Vector3
}

interface GridCell {
  x: number
  z: number
  position: THREE.Vector3 | { x: number; y: number; z: number }
  blocked: boolean
}

export class BusSeats {
  interiorGroup: THREE.Group
  seatGeometry:  THREE.BufferGeometry | null
  seatMaterial:  THREE.MeshStandardMaterial | null
  seatInstance:  THREE.InstancedMesh | null
  seatIndexMap:  Map<number, number>

  constructor(interiorGroup: THREE.Group) {
    this.interiorGroup = interiorGroup
    this.seatGeometry  = null
    this.seatMaterial  = null
    this.seatInstance  = null
    this.seatIndexMap  = new Map()
  }

  setSeatModel(seatModel: THREE.Group) {
    let seatMesh: THREE.Mesh | null = null
    seatModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && !seatMesh) seatMesh = child as THREE.Mesh
    })
    if (!seatMesh) throw new Error('Seat model has no mesh')

    this.seatGeometry = (seatMesh as THREE.Mesh).geometry.clone()
    this.seatMaterial = ((seatMesh as THREE.Mesh).material as THREE.MeshStandardMaterial).clone()
    this.seatMaterial.vertexColors = true
  }

  getSeatSafeCells(cells: GridCell[]): GridCell[] {
    return cells.filter((cell) => !cell.blocked)
  }

  generateSeatsFromCells(cells: GridCell[]): SeatPlacement[] {
    return cells.map((cell) => ({
      position: new THREE.Vector3(cell.position.x, 0.5, cell.position.z),
    }))
  }

  createSeatInstances(seats: SeatPlacement[]) {
    if (seats.length === 0) {
      console.warn('[BusSeats] No seats to create')
      return
    }

    // Fall back to simple box geometry if no seat model was loaded
    const geometry = this.seatGeometry ?? new THREE.BoxGeometry(0.45, 0.45, 0.45)
    const material = this.seatMaterial ?? new THREE.MeshStandardMaterial({
      color: 0x1a3a6e,
      roughness: 0.8,
    })

    this.seatInstance = new THREE.InstancedMesh(geometry, material, seats.length)
    this.seatInstance.castShadow    = true
    this.seatInstance.receiveShadow = true

    const dummy = new THREE.Object3D()
    seats.forEach((seat, i) => {
      dummy.position.copy(seat.position)
      dummy.rotation.y = Math.PI
      dummy.updateMatrix()
      this.seatInstance!.setMatrixAt(i, dummy.matrix)
      this.seatIndexMap.set(i + 1, i)  // seatNumber → instanceIndex
    })

    this.seatInstance.instanceMatrix.needsUpdate = true
    this.interiorGroup.add(this.seatInstance)
  }
}