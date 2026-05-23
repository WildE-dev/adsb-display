// packages/frontend/src/store/weatherStore.ts
import { create } from 'zustand'
import type { WeatherData } from '@adsb-display/shared'

interface WeatherStore {
  weather: WeatherData | null
  setWeather: (data: WeatherData) => void
}

export const useWeatherStore = create<WeatherStore>(set => ({
  weather: null,
  setWeather: data => set({ weather: data }),
}))