import * as THREE from 'three'
import { COLORS } from '../BusConstants'

export class BusSeatState {
  seatInstance: THREE.InstancedMesh | null
  seatIndexMap: Map<number, number> | null
  hoveredSeat:  number | null
  _toggleSeat:  ((n: number) => void) | null

  constructor(
    seatInstance: THREE.InstancedMesh | null,
    seatIndexMap: Map<number, number> | null,
  ) {
    this.seatInstance = seatInstance
    this.seatIndexMap = seatIndexMap
    this.hoveredSeat  = null
    this._toggleSeat  = null
  }

  updateSeatColors(reservedSeats: number[] = [], selectedSeats: number[] = []) {
    if (!this.seatInstance || !this.seatIndexMap) return

    this.seatIndexMap.forEach((instanceIndex, seatNumber) => {
      if (seatNumber === this.hoveredSeat)
        this.seatInstance!.setColorAt(instanceIndex, COLORS.hover)
      else if (reservedSeats.includes(seatNumber))
        this.seatInstance!.setColorAt(instanceIndex, COLORS.reserved)
      else if (selectedSeats.includes(seatNumber))
        this.seatInstance!.setColorAt(instanceIndex, COLORS.selected)
      else
        this.seatInstance!.setColorAt(instanceIndex, COLORS.normal)
    })

    if (this.seatInstance.instanceColor) {
      this.seatInstance.instanceColor.needsUpdate = true
    }
  }
}