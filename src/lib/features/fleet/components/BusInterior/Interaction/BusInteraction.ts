import * as THREE from "three"
import type { BusSeatState } from "../SeatState/BusSeatState"

interface Tooltip {
  visible: boolean
  x: number
  y: number
  seat: number | null
}

export class BusInteraction {
  seatState: BusSeatState
  tooltip: Tooltip

  constructor(seatState: BusSeatState) {
    this.seatState = seatState
    this.tooltip = { visible: false, x: 0, y: 0, seat: null }
  }

  handleSeatHover(event: CustomEvent) {
    const intersection = event.detail?.intersection
    if (!intersection) {
      this.tooltip.visible = false
      this.seatState.hoveredSeat = null
      return
    }
    this.seatState.hoveredSeat = intersection.instanceId + 1
    this.tooltip.visible = true
    this.tooltip.seat = this.seatState.hoveredSeat
    this.tooltip.x = event.detail.pointer?.x ?? 0
    this.tooltip.y = event.detail.pointer?.y ?? 0
  }

  /**
   * Unified click handler.
   * SceneContents calls: handleClick(THREE.Object3D)
   * Legacy event call:   handleClick(CustomEvent, toggleSeat)
   */
  handleClick(
    objectOrEvent: THREE.Object3D | CustomEvent,
    toggleSeat?: (n: number) => void,
  ) {
    // Legacy event-based call
    if ((objectOrEvent as CustomEvent).detail !== undefined) {
      const ev = objectOrEvent as CustomEvent
      const instanceId = ev.detail?.intersection?.instanceId
      if (instanceId === undefined) return
      const fn = toggleSeat ?? this.seatState._toggleSeat
      fn?.(instanceId + 1)
      return
    }

    // Object-based call: walk up the parent chain for the InstancedMesh
    let node: THREE.Object3D | null = objectOrEvent as THREE.Object3D
    while (node) {
      if ((node as THREE.InstancedMesh).isInstancedMesh) {
        const instanceId = (node as any).userData?.instanceId as
          | number
          | undefined
        if (instanceId !== undefined) {
          this.seatState._toggleSeat?.(instanceId + 1)
        }
        return
      }
      node = node.parent
    }
  }

  /** Attach toggleSeat so handleClick can fire it without per-call passing */
  setToggleSeat(fn: (n: number) => void) {
    this.seatState._toggleSeat = fn
  }
}
