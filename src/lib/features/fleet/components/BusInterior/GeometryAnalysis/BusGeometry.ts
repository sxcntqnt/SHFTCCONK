import * as THREE from 'three'
import { GRID_RESOLUTION } from '../BusConstants'

interface GridCell {
  x: number
  z: number
  position: THREE.Vector3
  blocked: boolean
}

export class BusGeometry {
  busModel:     THREE.Object3D
  raycaster:    THREE.Raycaster
  busBounds:    THREE.Box3 | null
  busSize:      THREE.Vector3
  busCenter:    THREE.Vector3

  constructor(busModel: THREE.Object3D) {
    this.busModel   = busModel
    this.raycaster  = new THREE.Raycaster()
    this.busBounds  = null
    this.busSize    = new THREE.Vector3()
    this.busCenter  = new THREE.Vector3()
  }

  computeBusBounds() {
    this.busBounds = new THREE.Box3().setFromObject(this.busModel)
    this.busBounds.getSize(this.busSize)
    this.busBounds.getCenter(this.busCenter)

    if (this.busSize.length() < 0.001) {
      console.warn('[BusGeometry] Bounding box is near-zero — model may not be in scene yet')
    }
  }

  generateInteriorGrid(): GridCell[] {
    if (!this.busBounds) return []

    const maxDim = Math.max(this.busSize.x, this.busSize.z)
    const res    = maxDim > 50 ? GRID_RESOLUTION * (maxDim / 10) : GRID_RESOLUTION

    const cols = Math.max(1, Math.floor(this.busSize.x / res))
    const rows = Math.max(1, Math.floor(this.busSize.z / res))
    const cells: GridCell[] = []

    for (let x = 0; x < cols; x++) {
      for (let z = 0; z < rows; z++) {
        const worldX = this.busBounds.min.x + (x + 0.5) * res
        const worldZ = this.busBounds.min.z + (z + 0.5) * res
        cells.push({
          x, z,
          position: new THREE.Vector3(worldX, this.busCenter.y, worldZ),
          blocked: false,
        })
      }
    }
    return cells
  }

  detectWalls(cells: GridCell[]) {
    const dirs = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0)]
    const threshold = Math.max(0.35, this.busSize.x * 0.05)

    cells.forEach((cell) => {
      dirs.forEach((dir) => {
        this.raycaster.set(cell.position, dir)
        const hits = this.raycaster.intersectObject(this.busModel, true)
        if (hits.length && hits[0].distance < threshold) cell.blocked = true
      })
    })
  }

  detectWheelWells(cells: GridCell[]) {
    if (!this.busBounds) return
    const floorY = this.busBounds.min.y + this.busSize.y * 0.15

    cells.forEach((cell) => {
      const origin = new THREE.Vector3(cell.position.x, this.busBounds!.max.y, cell.position.z)
      this.raycaster.set(origin, new THREE.Vector3(0, -1, 0))
      const hits = this.raycaster.intersectObject(this.busModel, true)
      if (!hits.length) return
      if (hits[hits.length - 1].point.y > floorY) cell.blocked = true
    })
  }

  detectEngineHump(cells: GridCell[]) {
    if (!this.busBounds) return
    const floorY = this.busBounds.min.y + this.busSize.y * 0.12

    cells.forEach((cell) => {
      const origin = new THREE.Vector3(cell.position.x, this.busBounds!.max.y, cell.position.z)
      this.raycaster.set(origin, new THREE.Vector3(0, -1, 0))
      const hits = this.raycaster.intersectObject(this.busModel, true)
      if (!hits.length) return
      if (hits[hits.length - 1].point.y > floorY) cell.blocked = true
    })
  }

  detectDoorGaps(cells: GridCell[]) {
    cells.forEach((cell) => {
      this.raycaster.set(cell.position, new THREE.Vector3(1, 0, 0))
      const hits = this.raycaster.intersectObject(this.busModel, true)
      if (!hits.length) cell.blocked = true
    })
  }
}