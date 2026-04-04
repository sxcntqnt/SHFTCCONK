import * as THREE from "three"
import { BusGeometry } from "./GeometryAnalysis/BusGeometry"
import { BusSeats } from "./SeatPlacement/BusSeats"
import { BusSeatState } from "./SeatState/BusSeatState"
import { BusInteraction } from "./Interaction/BusInteraction"

interface GridCell {
  position: { x: number; y: number; z: number }
  blocked: boolean
}

export class BusInterior {
  geometry: BusGeometry
  seats: BusSeats
  seatState: BusSeatState
  interaction: BusInteraction

  constructor(busModel: THREE.Object3D, interiorGroup: THREE.Group) {
    this.geometry = new BusGeometry(busModel)
    this.seats = new BusSeats(interiorGroup)
    this.seatState = new BusSeatState(null, null)
    this.interaction = new BusInteraction(this.seatState)
  }

  setSeatModel(seatScene: THREE.Group) {
    this.seats.setSeatModel(seatScene)
  }

  setToggleSeat(toggleSeat: (n: number) => void) {
    this.interaction.setToggleSeat(toggleSeat)
  }

  buildInterior() {
    // 1. Geometry analysis
    this.geometry.computeBusBounds()

    if (this.geometry.busSize.length() < 0.001) {
      console.warn("[BusInterior] Skipping — model bounds are zero")
      return
    }

    const grid = this.geometry.generateInteriorGrid()
    console.log(`[BusInterior] Grid cells: ${grid.length}`)

    this.geometry.detectWalls(grid)
    this.geometry.detectWheelWells(grid)
    this.geometry.detectEngineHump(grid)
    this.geometry.detectDoorGaps(grid)

    // 2. Seat placement
    let safeCells = this.seats.getSeatSafeCells(grid)
    console.log(`[BusInterior] Safe cells: ${safeCells.length}`)

    // Fallback if raycasting blocked everything
    if (safeCells.length < 2) {
      console.warn("[BusInterior] All cells blocked — using fallback grid")
      safeCells = this._fallbackGrid()
    }

    const seatsArray = this.seats.generateSeatsFromCells(safeCells)
    console.log(`[BusInterior] Placing ${seatsArray.length} seats`)
    this.seats.createSeatInstances(seatsArray)

    // 3. Connect SeatState
    this.seatState.seatInstance = this.seats.seatInstance
    this.seatState.seatIndexMap = this.seats.seatIndexMap
  }

  private _fallbackGrid(): GridCell[] {
    const { busSize, busBounds } = this.geometry
    if (!busBounds) return []

    const cells: GridCell[] = []
    const seatSpacingZ = Math.max(busSize.z / 14, 1)
    const seatOffsetX = busSize.x * 0.22
    const y = busBounds.min.y + busSize.y * 0.25

    for (let row = 1; row < 14; row++) {
      const z = busBounds.min.z + row * seatSpacingZ
      cells.push({
        position: { x: busBounds.min.x + seatOffsetX, y, z },
        blocked: false,
      })
      cells.push({
        position: { x: busBounds.min.x + busSize.x - seatOffsetX, y, z },
        blocked: false,
      })
    }

    console.log(`[BusInterior] Fallback grid: ${cells.length} cells`)
    return cells
  }
}
