// src/lib/features/fleet/components/BusInterior/Interaction/BusInteraction.js

export class BusInteraction {
  constructor(seatState) {
    this.seatState = seatState
    this.tooltip = { visible: false, x: 0, y: 0, seat: null }
  }

  handleSeatHover(event) {
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
   * Called from SceneContents as: busInterior.interaction.handleClick(object)
   * Also handles the old event-based call for backwards compat.
   *
   * @param {THREE.Object3D | CustomEvent} objectOrEvent
   * @param {function} [toggleSeat] - required when called with event signature
   */
  handleClick(objectOrEvent, toggleSeat) {
    // Event-based call: handleClick(event, toggleSeat)
    if (objectOrEvent?.detail !== undefined) {
      const instanceId = objectOrEvent.detail?.intersection?.instanceId
      if (instanceId === undefined) return
      if (toggleSeat) toggleSeat(instanceId + 1)
      return
    }

    // Object-based call from SceneContents: handleClick(THREE.Object3D)
    // Walk up the parent chain to find the InstancedMesh and get instanceId
    let node = objectOrEvent
    while (node) {
      if (node.isInstancedMesh && node.userData?.instanceId !== undefined) {
        if (this.seatState._toggleSeat) {
          this.seatState._toggleSeat(node.userData.instanceId + 1)
        }
        return
      }
      node = node?.parent ?? null
    }
  }

  /** Attach toggleSeat so handleClick can call it without it being passed each time */
  setToggleSeat(fn) {
    this.seatState._toggleSeat = fn
  }
}