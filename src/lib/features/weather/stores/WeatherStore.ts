// lib/features/weather/stores/WeatherStore.ts
import { writable } from "svelte/store"
import type { WeatherData } from "../services/weatherApi"

export const weatherCards = writable<WeatherData[]>([])

export function upsertWeather(card: WeatherData) {
  weatherCards.update((list) => {
    const index = list.findIndex((c) => c.name === card.name)
    if (index !== -1) {
      list[index] = { ...card } // update existing
      return [...list]
    }
    return [card, ...list] // add new at beginning
  })
}

export function removeWeather(name: string) {
  weatherCards.update((list) => list.filter((c) => c.name !== name))
}
