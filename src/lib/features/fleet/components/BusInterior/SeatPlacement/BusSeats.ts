import * as THREE from 'three';

export class BusSeats {
  constructor(interiorGroup) {
    this.interiorGroup = interiorGroup;
    this.seatGeometry = null;
    this.seatMaterial = null;
    this.seatInstance = null;
    this.seatIndexMap = new Map();
  }

  setSeatModel(seatModel) {
    let seatMesh = null;
    seatModel.traverse(child => { if (child.isMesh && !seatMesh) seatMesh = child; });
    if (!seatMesh) throw new Error('Seat model has no mesh');

    this.seatGeometry = seatMesh.geometry.clone();
    this.seatMaterial = seatMesh.material.clone();
    this.seatMaterial.vertexColors = true;
  }

  getSeatSafeCells(cells) {
    return cells.filter(cell => !cell.blocked);
  }

  generateSeatsFromCells(cells) {
    return cells.map(cell => ({ position: new THREE.Vector3(cell.position.x, 0.5, cell.position.z) }));
  }

  createSeatInstances(seats) {
    if (!this.seatGeometry) throw new Error('Seat model not set. Call setSeatModel() first.');

    this.seatInstance = new THREE.InstancedMesh(this.seatGeometry, this.seatMaterial, seats.length);
    const dummy = new THREE.Object3D();

    seats.forEach((seat, i) => {
      dummy.position.copy(seat.position);
      dummy.rotation.y = Math.PI;
      dummy.updateMatrix();
      this.seatInstance.setMatrixAt(i, dummy.matrix);
      this.seatIndexMap.set(i + 1, i);
    });

    this.interiorGroup.add(this.seatInstance);
  }
}