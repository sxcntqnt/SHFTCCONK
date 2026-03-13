export class BusInteraction {
  constructor(seatState) {
    this.seatState = seatState;
    this.tooltip = { visible: false, x: 0, y: 0, seat: null };
  }

  handleSeatHover(event) {
    const intersection = event.detail?.intersection;
    if (!intersection) {
      this.tooltip.visible = false;
      this.seatState.hoveredSeat = null;
      return;
    }

    this.seatState.hoveredSeat = intersection.instanceId + 1;
    this.tooltip.visible = true;
    this.tooltip.seat = this.seatState.hoveredSeat;
    this.tooltip.x = event.detail.pointer.x;
    this.tooltip.y = event.detail.pointer.y;
  }

  handleInteriorClick(event, toggleSeat) {
    const instanceId = event.detail?.intersection?.instanceId;
    if (instanceId === undefined) return;
    const seatNumber = instanceId + 1;
    toggleSeat(seatNumber);
  }
}