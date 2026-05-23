// packages/frontend/src/store/aircraftStore.ts
import { create } from 'zustand'
import type { AircraftState } from '@adsb-display/shared'

interface AircraftStore {
  aircraft: Map<string, AircraftState>
  receiverLat: number
  receiverLon: number

  // Called by useSocket on snapshot event
  setSnapshot: (aircraft: AircraftState[], lat: number, lon: number) => void
  // Called by useSocket on diff event
  applyDiff: (updated: AircraftState[], removed: string[]) => void
  // Called by interpolation loop to update rendered positions
  setAircraftPosition: (icao: string, lat: number, lon: number, trackDeg: number) => void
}

export const useAircraftStore = create<AircraftStore>((set, get) => ({
  aircraft: new Map(),
  receiverLat: 0,
  receiverLon: 0,

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

  setAircraftPosition: (icao, lat, lon, trackDeg) => {
    const current = get().aircraft.get(icao)
    if (!current) return
    set(state => {
      const next = new Map(state.aircraft)
      next.set(icao, { ...current, lat, lon, trackDeg })
      return { aircraft: next }
    })
  },
}))

// Selector helpers — memoized slices to prevent unnecessary re-renders
export const selectAircraftList = (s: AircraftStore) =>
  Array.from(s.aircraft.values())

export const selectAircraftWithPosition = (s: AircraftStore) =>
  Array.from(s.aircraft.values()).filter(
    a => a.lat !== null && a.lon !== null && !a.onGround
  )