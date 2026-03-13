import { COLORS } from './BusConstants.js';

export class BusSeatState {
  constructor(seatInstance, seatIndexMap) {
    this.seatInstance = seatInstance;
    this.seatIndexMap = seatIndexMap;
    this.hoveredSeat = null;
  }

  updateSeatColors(reservedSeats = [], selectedSeats = []) {
    this.seatIndexMap.forEach((instanceIndex, seatNumber) => {
      if (seatNumber === this.hoveredSeat) this.seatInstance.setColorAt(instanceIndex, COLORS.hover);
      else if (reservedSeats.includes(seatNumber)) this.seatInstance.setColorAt(instanceIndex, COLORS.reserved);
      else if (selectedSeats.includes(seatNumber)) this.seatInstance.setColorAt(instanceIndex, COLORS.selected);
      else this.seatInstance.setColorAt(instanceIndex, COLORS.normal);
    });

    this.seatInstance.instanceColor.needsUpdate = true;
  }
}