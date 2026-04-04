import { writable, derived } from "svelte/store"
import { LAPS } from "../constants"

// Game session
export const gameCode = writable(null)
export const gameStarted = writable(false)
export const gameCountdown = writable(0) // 3,2,1,0 = go
export const winner = writable(null)

// Current player
export const me = writable({
  ref: null,
  data: {
    x: 0,
    y: 0,
    xv: 0,
    yv: 0,
    dir: 0,
    steer: 0,
    color: 0,
    name: "",
    checkpoint: 1,
    lap: 0,
    collision: {},
  },
})

// Other players (map of id -> player)
export const players = writable({})

// Map data
export const trackCode = writable("") // raw track string
export const mapMeshes = writable({
  walls: [],
  trees: [],
  signs: [],
  start: [],
})

// UI state
export const menuVisible = writable(true)
export const vrMode = writable(false)
export const mobile = writable(false)

// Derived: current lap display
export const lapDisplay = derived(me, ($me) => `${$me.data.lap}/${LAPS}`)
