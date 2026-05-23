import type { AircraftState } from './aircraft.js'
import { WeatherData } from './weather.js'

// Server → Client events
export interface ServerToClientEvents {
  // Full aircraft list on initial connection
  'aircraft:snapshot': (payload: AircraftSnapshotEvent) => void
  // Only the aircraft that changed since last tick
  'aircraft:diff': (payload: AircraftDiffEvent) => void
  // Weather update (every 5 minutes)
  'weather:update': (payload: WeatherData) => void
  // Session stats
  'stats:update': (payload: StatsEvent) => void
}

// Client → Server events
export interface ClientToServerEvents {
  // Client can request a full snapshot (e.g. after reconnect)
  'client:ready': () => void
}

export interface AircraftSnapshotEvent {
  timestamp: number
  aircraft: AircraftState[]
  receiverLat: number
  receiverLon: number
}

export interface AircraftDiffEvent {
  timestamp: number
  updated: AircraftState[]    // new or changed aircraft
  removed: string[]           // ICAOs that disappeared
}

export interface StatsEvent {
  trackedNow: number
  seenToday: number
  highestAltFt: number | null
  fastestKts: number | null
  furthestKm: number | null
  furthestCallsign: string | null
}