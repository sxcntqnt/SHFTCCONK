import { BusGeometry } from './GeometryAnalysis/BusGeometry'
import { BusSeats } from './SeatPlacement/BusSeats';
import { BusSeatState } from './SeatState/BusSeatState';
import { BusInteraction } from './Interaction/BusInteraction.js';

export class BusInterior {
  constructor(busModel, interiorGroup) {
    this.geometry = new BusGeometry(busModel);
    this.seats = new BusSeats(interiorGroup);
    this.seatState = new BusSeatState(null, null); // will attach after creating instances
    this.interaction = new BusInteraction(this.seatState);
  }

  setSeatModel(seatModel) {
    this.seats.setSeatModel(seatModel);
  }

  buildInterior() {
    // 1️⃣ Geometry
    this.geometry.computeBusBounds();
    const grid = this.geometry.generateInteriorGrid();
    this.geometry.detectWalls(grid);
    this.geometry.detectWheelWells(grid);
    this.geometry.detectEngineHump(grid);
    this.geometry.detectDoorGaps(grid);

    // 2️⃣ Seat Placement
    const safeCells = this.seats.getSeatSafeCells(grid);
    const seatsArray = this.seats.generateSeatsFromCells(safeCells);
    this.seats.createSeatInstances(seatsArray);

    // 3️⃣ Connect SeatState to instances
    this.seatState.seatInstance = this.seats.seatInstance;
    this.seatState.seatIndexMap = this.seats.seatIndexMap;
  }
}