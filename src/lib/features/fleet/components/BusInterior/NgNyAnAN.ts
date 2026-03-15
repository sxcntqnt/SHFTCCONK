// src/lib/features/fleet/components/BusInterior/index.js

import { BusGeometry }   from './GeometryAnalysis/BusGeometry'
import { BusSeats }      from './SeatPlacement/BusSeats'
import { BusSeatState }  from './SeatState/BusSeatState'
import { BusInteraction } from './Interaction/BusInteraction.js'

export class BusInterior {
  /**
   * @param {THREE.Group} busModel   - the loaded GLTF/procedural scene
   * @param {THREE.Group} interiorGroup - Threlte T.Group ref to add seats into
   */
  constructor(busModel, interiorGroup) {
    this.geometry    = new BusGeometry(busModel)
    this.seats       = new BusSeats(interiorGroup)
    this.seatState   = new BusSeatState(null, null)
    this.interaction = new BusInteraction(this.seatState)
  }

  /**
   * Load the seat GLB scene into BusSeats.
   * Must be called before buildInterior() if you want real seat geometry.
   * If not called, buildInterior() falls back to simple box geometry.
   *
   * @param {THREE.Group} seatScene - gltf.scene from seat.glb
   */
  setSeatModel(seatScene) {
    this.seats.setSeatModel(seatScene)
  }

  /**
   * Wire toggleSeat into the interaction handler so clicking a seat fires
   * the Svelte state update without needing to pass it through events.
   *
   * @param {function} toggleSeat
   */
  setToggleSeat(toggleSeat) {
    this.interaction.setToggleSeat(toggleSeat)
  }

  buildInterior() {
    // ── 1. Geometry analysis ──────────────────────────────────────────────
    this.geometry.computeBusBounds()

    // Guard: if the model has degenerate bounds (not yet in scene), bail
    if (this.geometry.busSize.length() < 0.001) {
      console.warn('[BusInterior] Skipping buildInterior — model bounds are zero')
      return
    }

    const grid = this.geometry.generateInteriorGrid()
    console.log(`[BusInterior] Grid cells: ${grid.length}`)

    this.geometry.detectWalls(grid)
    this.geometry.detectWheelWells(grid)
    this.geometry.detectEngineHump(grid)
    this.geometry.detectDoorGaps(grid)

    // ── 2. Seat placement ─────────────────────────────────────────────────
    const safeCells  = this.seats.getSeatSafeCells(grid)
    console.log(`[BusInterior] Safe cells after filtering: ${safeCells.length}`)

    // If geometry analysis blocked everything (raycaster missed all faces),
    // fall back to a simple aisle grid derived from the bounding box
    const cells = safeCells.length > 2
      ? safeCells
      : this._fallbackGrid()

    const seatsArray = this.seats.generateSeatsFromCells(cells)
    console.log(`[BusInterior] Placing ${seatsArray.length} seats`)

    this.seats.createSeatInstances(seatsArray)

    // ── 3. Connect SeatState ──────────────────────────────────────────────
    this.seatState.seatInstance = this.seats.seatInstance
    this.seatState.seatIndexMap = this.seats.seatIndexMap
  }

  /**
   * Fallback grid when raycasting fails (e.g. scaled Sketchfab models
   * whose mesh faces point inward or have no normals for raycasting).
   * Places two rows of seats down the centre of the bus.
   */
  _fallbackGrid() {
    const { busSize, busBounds } = this.geometry
    const cells = []

    // Two columns either side of centre aisle, spaced along bus length
    const seatSpacingZ = Math.max(busSize.z / 14, 1)
    const seatOffsetX  = busSize.x * 0.22   // ~22% from centre = near windows

    for (let row = 1; row < 14; row++) {
      const z = busBounds.min.z + row * seatSpacingZ
      const y = busBounds.min.y + busSize.y * 0.25  // seat height

      // Left side
      cells.push({ position: { x: busBounds.min.x + seatOffsetX,           y, z }, blocked: false })
      // Right side (skip aisle)
      cells.push({ position: { x: busBounds.min.x + busSize.x - seatOffsetX, y, z }, blocked: false })
    }

    console.log(`[BusInterior] Using fallback grid: ${cells.length} cells`)
    return cells
  }
}