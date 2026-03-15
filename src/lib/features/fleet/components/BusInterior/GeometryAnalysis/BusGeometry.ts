// src/lib/features/fleet/components/BusInterior/GeometryAnalysis/BusGeometry.js

import * as THREE from 'three'
import { GRID_RESOLUTION } from '.././BusConstants'

export class BusGeometry {
  constructor(busModel) {
    this.busModel    = busModel
    this.raycaster   = new THREE.Raycaster()
    this.busBounds   = null
    this.busSize     = new THREE.Vector3()
    this.busCenter   = new THREE.Vector3()
    // Scaling factor: detected from the model's world-space bounds vs local bounds.
    // Handles cases where scale is applied on the T.Mesh (e.g. Osaka bus scale:100)
    // rather than on the THREE.Group that we receive.
    this._scaleFactor = 1
  }

  computeBusBounds() {
    // Use world-space bounding box so Threlte component-level scale is included
    this.busBounds = new THREE.Box3().setFromObject(this.busModel)
    this.busBounds.getSize(this.busSize)
    this.busBounds.getCenter(this.busCenter)

    // Safety: if bounds are degenerate (model not yet in scene), log and bail
    if (this.busSize.length() < 0.001) {
      console.warn('[BusGeometry] Bounding box is near-zero — model may not be in the scene yet')
    }
  }

  generateInteriorGrid() {
    const cells = []
    // Use a resolution that adapts to the model's actual size.
    // For a normal-scale bus (~10 units long) GRID_RESOLUTION=0.25 gives ~40 rows.
    // For Osaka bus at scale:100 (~1000 units) we scale up to avoid creating 4000+ cells.
    const maxDim = Math.max(this.busSize.x, this.busSize.z)
    const res    = maxDim > 50 ? GRID_RESOLUTION * (maxDim / 10) : GRID_RESOLUTION

    const cols = Math.max(1, Math.floor(this.busSize.x / res))
    const rows = Math.max(1, Math.floor(this.busSize.z / res))

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

  detectWalls(cells) {
    const dirs = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0)]
    // Wall proximity threshold scales with bus size
    const threshold = Math.max(0.35, this.busSize.x * 0.05)

    cells.forEach(cell => {
      dirs.forEach(dir => {
        this.raycaster.set(cell.position, dir)
        const hits = this.raycaster.intersectObject(this.busModel, true)
        if (hits.length && hits[0].distance < threshold) cell.blocked = true
      })
    })
  }

  detectWheelWells(cells) {
    const floorY = this.busBounds.min.y + this.busSize.y * 0.15
    cells.forEach(cell => {
      const origin = new THREE.Vector3(cell.position.x, this.busBounds.max.y, cell.position.z)
      this.raycaster.set(origin, new THREE.Vector3(0, -1, 0))
      const hits = this.raycaster.intersectObject(this.busModel, true)
      if (!hits.length) return
      // Floor hit is higher than expected — wheel well bump
      if (hits[hits.length - 1].point.y > floorY) cell.blocked = true
    })
  }

  detectEngineHump(cells) {
    const floorY = this.busBounds.min.y + this.busSize.y * 0.12
    cells.forEach(cell => {
      const origin = new THREE.Vector3(cell.position.x, this.busBounds.max.y, cell.position.z)
      this.raycaster.set(origin, new THREE.Vector3(0, -1, 0))
      const hits = this.raycaster.intersectObject(this.busModel, true)
      if (!hits.length) return
      if (hits[hits.length - 1].point.y > floorY) cell.blocked = true
    })
  }

  detectDoorGaps(cells) {
    cells.forEach(cell => {
      this.raycaster.set(cell.position, new THREE.Vector3(1, 0, 0))
      const hits = this.raycaster.intersectObject(this.busModel, true)
      // No hit from inside means we're outside the mesh — block the cell
      if (!hits.length) cell.blocked = true
    })
  }
}