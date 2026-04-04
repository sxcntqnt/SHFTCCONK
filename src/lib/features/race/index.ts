// src/lib/features/race/index.ts
import { connectToFirebase } from "$lib/features/race/firebase"
import { loadMap } from "$lib/features/race/mapLoader"
import {
  gameStarted,
  me,
  players,
  trackCode,
  vrMode,
  mobile,
} from "$lib/features/race/stores/stores"
import { get } from "svelte/store"

let _left = false
let _right = false
let _color = Math.floor(Math.random() * 360)

// Called once on mount
export async function init() {
  await connectToFirebase()
}

// Called by svelte:window onkeydown
export function onKeyDown(e: KeyboardEvent) {
  if (e.code === "ArrowLeft") _left = true
  if (e.code === "ArrowRight") _right = true
  applyKeySteer()
}

// Called by svelte:window onkeyup
export function onKeyUp(e: KeyboardEvent) {
  if (e.code === "ArrowLeft") _left = false
  if (e.code === "ArrowRight") _right = false
  applyKeySteer()
}

function applyKeySteer() {
  if (get(mobile)) return // mobile uses gyro
  const meStore = get(me)
  if (!meStore?.data) return

  if (_left && !_right) meStore.data.steer = Math.PI / 6
  else if (_right && !_left) meStore.data.steer = -Math.PI / 6
  else meStore.data.steer = 0
}

// Called by the color picker in Menu.svelte
export function updateColor(hue: number) {
  _color = hue
  const meStore = get(me)
  if (meStore?.data) meStore.data.color = hue
}

// Called by the Start Race button
export function menu2() {
  // Triggers the host/join flow — Menu.svelte handles the UI,
  // this just signals readiness
  gameStarted.set(false) // reset; Menu takes over from here
}

export function getColor() {
  return _color
}
