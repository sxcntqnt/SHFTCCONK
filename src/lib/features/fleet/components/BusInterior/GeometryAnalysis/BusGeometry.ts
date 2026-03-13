import * as THREE from 'three';
import { GRID_RESOLUTION } from './BusConstants.js';

export class BusGeometry {
  constructor(busModel) {
    this.busModel = busModel;
    this.raycaster = new THREE.Raycaster();
    this.busBounds = null;
    this.busSize = new THREE.Vector3();
    this.busCenter = new THREE.Vector3();
  }

  computeBusBounds() {
    this.busBounds = new THREE.Box3().setFromObject(this.busModel);
    this.busBounds.getSize(this.busSize);
    this.busBounds.getCenter(this.busCenter);
  }

  generateInteriorGrid() {
    const cells = [];
    const cols = Math.floor(this.busSize.x / GRID_RESOLUTION);
    const rows = Math.floor(this.busSize.z / GRID_RESOLUTION);

    for (let x = 0; x < cols; x++) {
      for (let z = 0; z < rows; z++) {
        const worldX = this.busBounds.min.x + x * GRID_RESOLUTION;
        const worldZ = this.busBounds.min.z + z * GRID_RESOLUTION;
        cells.push({ x, z, position: new THREE.Vector3(worldX, 0.5, worldZ), blocked: false });
      }
    }

    return cells;
  }

  detectWalls(cells) {
    const directions = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0)];
    cells.forEach(cell => {
      directions.forEach(dir => {
        this.raycaster.set(cell.position, dir);
        const hits = this.raycaster.intersectObject(this.busModel, true);
        if (hits.length && hits[0].distance < 0.35) cell.blocked = true;
      });
    });
  }

  detectWheelWells(cells) {
    cells.forEach(cell => {
      const origin = new THREE.Vector3(cell.position.x, this.busBounds.max.y, cell.position.z);
      this.raycaster.set(origin, new THREE.Vector3(0, -1, 0));
      const hits = this.raycaster.intersectObject(this.busModel, true);
      if (!hits.length) return;
      if (hits[0].point.y > 0.4) cell.blocked = true;
    });
  }

  detectEngineHump(cells) {
    cells.forEach(cell => {
      const origin = new THREE.Vector3(cell.position.x, this.busBounds.max.y, cell.position.z);
      this.raycaster.set(origin, new THREE.Vector3(0, -1, 0));
      const hits = this.raycaster.intersectObject(this.busModel, true);
      if (!hits.length) return;
      if (hits[0].point.y > 0.3) cell.blocked = true;
    });
  }

  detectDoorGaps(cells) {
    cells.forEach(cell => {
      this.raycaster.set(cell.position, new THREE.Vector3(1, 0, 0));
      const hits = this.raycaster.intersectObject(this.busModel, true);
      if (!hits.length) cell.blocked = true;
    });
  }
}