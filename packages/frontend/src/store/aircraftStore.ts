// packages/frontend/src/store/aircraftStore.ts
import { create } from 'zustand'
import type { AircraftState } from '@adsb-display/shared'

interface AircraftStore {
  aircraft: Map<string, AircraftState>
  receiverLat: number
  receiverLon: number
  // ICAO of the aircraft currently shown in the spotlight card
  spotlightIcao: string | null
  // Set by SceneManager when spotlight→radar transition fires; RadarScene zooms then clears it
  zoomToIcao: string | null

  setSnapshot: (aircraft: AircraftState[], lat: number, lon: number) => void
  applyDiff: (updated: AircraftState[], removed: string[]) => void
  setSpotlightIcao: (icao: string | null) => void
  setZoomToIcao: (icao: string | null) => void
}

export const useAircraftStore = create<AircraftStore>((set, get) => ({
  aircraft: new Map(),
  receiverLat: 0,
  receiverLon: 0,
  spotlightIcao: null,
  zoomToIcao: null,

  setSnapshot: (aircraftList, lat, lon) => {
    const map = new Map<string, AircraftState>()
    for (const a of aircraftList) map.set(a.icao, a)
    set({ aircraft: map, receiverLat: lat, receiverLon: lon })
  },

  applyDiff: (updated, removed) => {
    set(state => {
      const next = new Map(state.aircraft)
      for (const a of updated) next.set(a.icao, a)
      for (const icao of removed) next.delete(icao)
      return { aircraft: next }
    })
  },

  setSpotlightIcao: (icao) => set({ spotlightIcao: icao }),
  setZoomToIcao:    (icao) => set({ zoomToIcao: icao }),
}))

// Selector helpers — memoized slices to prevent unnecessary re-renders
export const selectAircraftList = (s: AircraftStore) =>
  Array.from(s.aircraft.values())

export const selectAircraftWithPosition = (s: AircraftStore) =>
  Array.from(s.aircraft.values()).filter(
    a => a.lat !== null && a.lon !== null
  )