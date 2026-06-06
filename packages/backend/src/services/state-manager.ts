// packages/backend/src/services/state-manager.ts

import { EventEmitter } from 'node:events'
import type {
  ReadsbSnapshot,
  ReadsbAircraft,
  AircraftState,
} from '@adsb-display/shared'
import { config } from '../config.js'

interface StateManagerEvents {
  // Fires after every poll with arrays of what changed
  diff: [updated: AircraftState[], removed: string[]]
  // Fires when an ICAO is seen for the first time — triggers metadata fetch
  newAircraft: [icao: string, state: AircraftState]
}

export class StateManager extends EventEmitter<StateManagerEvents> {
  // Primary state store — source of truth for everything downstream
  private aircraft = new Map<string, AircraftState>()

  // Track which ICAOs we've already requested metadata for
  private metaRequested = new Set<string>()

  // Session stats — these only reset at midnight (or process restart)
  private seenToday = new Set<string>()
  private highestAltFt: number | null = null
  private fastestKts: number | null = null

  getAll(): AircraftState[] {
    return Array.from(this.aircraft.values())
  }

  getByIcao(icao: string): AircraftState | undefined {
    return this.aircraft.get(icao)
  }

  getStats() {
    const all = this.getAll()
    const withPos = all.filter(a => a.lat !== null && a.lon !== null)

    let furthestKm: number | null = null
    let furthestCallsign: string | null = null

    if (withPos.length > 0) {
      let maxDist = 0
      for (const a of withPos) {
        const dist = haversineKm(
          config.receiverLat, config.receiverLon,
          a.lat!, a.lon!
        )
        if (dist > maxDist) {
          maxDist = dist
          furthestCallsign = a.flight ?? a.icao
        }
      }
      if (maxDist > 0) furthestKm = Math.round(maxDist)
    }

    return {
      trackedNow: all.length,
      seenToday: this.seenToday.size,
      highestAltFt: this.highestAltFt,
      fastestKts: this.fastestKts,
      furthestKm,
      furthestCallsign,
    }
  }

  // Called by the metadata cache once it has enrichment data
  updateMeta(
    icao: string,
    meta: AircraftState['meta'],
    image: AircraftState['image']
  ): void {
    const state = this.aircraft.get(icao)
    if (!state) return
    state.meta = meta
    state.image = image
    // Immediately broadcast this one aircraft as updated
    this.emit('diff', [state], [])
  }

  processSnapshot(snapshot: ReadsbSnapshot): void {
    const now = Date.now()
    const updated: AircraftState[] = []
    const seenIcaos = new Set<string>()

    for (const raw of snapshot.aircraft) {
      // Skip aircraft with no valid ICAO
      if (!raw.hex || raw.hex === '000000') continue

      // Skip aircraft we haven't heard from recently
      if (raw.seen > config.aircraftTimeoutSec) continue

      const icao = raw.hex.toLowerCase()
      seenIcaos.add(icao)

      const existing = this.aircraft.get(icao)
      const state = existing
        ? this.updateState(existing, raw, now)
        : this.createState(raw, now)

      this.aircraft.set(icao, state)
      updated.push(state)

      // Session stats — update peaks
      if (state.altitudeFt !== null) {
        if (this.highestAltFt === null || state.altitudeFt > this.highestAltFt) {
          this.highestAltFt = state.altitudeFt
        }
      }
      if (state.groundSpeedKts !== null) {
        if (this.fastestKts === null || state.groundSpeedKts > this.fastestKts) {
          this.fastestKts = state.groundSpeedKts
        }
      }

      // Track new ICAOs for metadata fetch
      if (!existing) {
        this.seenToday.add(icao)
        if (!this.metaRequested.has(icao)) {
          this.metaRequested.add(icao)
          this.emit('newAircraft', icao, state)
        }
      }
    }

    // Remove aircraft that have gone silent
    const removed: string[] = []
    for (const [icao] of this.aircraft) {
      if (!seenIcaos.has(icao)) {
        this.aircraft.delete(icao)
        removed.push(icao)
      }
    }

    if (updated.length > 0 || removed.length > 0) {
      this.emit('diff', updated, removed)
    }
  }

  private createState(raw: ReadsbAircraft, now: number): AircraftState {
    const altitudeFt = raw.alt_baro === 'ground'
      ? 0
      : (raw.alt_baro ?? raw.alt_geom ?? null)

    const state: AircraftState = {
      icao: raw.hex.toLowerCase(),
      flight: raw.flight?.trim() || null,
      registration: raw.r ?? null,
      typeCode: raw.t ?? null,

      lat: raw.lat ?? null,
      lon: raw.lon ?? null,
      altitudeFt,
      onGround: raw.alt_baro === 'ground',
      groundSpeedKts: raw.gs ?? null,
      trackDeg: raw.track ?? null,
      verticalRateFpm: raw.baro_rate ?? null,
      squawk: raw.squawk ?? null,

      meta: null,
      image: null,

      firstSeenAt: now,
      lastSeenAt: now,
      positionHistory: [],
      messageCount: raw.messages,
      rssi: raw.rssi,
    }

    // Seed position history if we have a fix
    if (raw.lat !== undefined && raw.lon !== undefined) {
      state.positionHistory.push({ lat: raw.lat, lon: raw.lon, t: now })
    }

    return state
  }

  private updateState(
    state: AircraftState,
    raw: ReadsbAircraft,
    now: number
  ): AircraftState {
    state.flight = raw.flight?.trim() || state.flight
    state.registration = raw.r ?? state.registration
    state.typeCode = raw.t ?? state.typeCode
    state.lastSeenAt = now
    state.messageCount = raw.messages
    state.rssi = raw.rssi

    state.altitudeFt = raw.alt_baro === 'ground'
      ? 0
      : (raw.alt_baro ?? raw.alt_geom ?? state.altitudeFt)
    state.onGround = raw.alt_baro === 'ground'
    state.groundSpeedKts = raw.gs ?? state.groundSpeedKts
    state.trackDeg = raw.track ?? state.trackDeg
    state.verticalRateFpm = raw.baro_rate ?? state.verticalRateFpm
    state.squawk = raw.squawk ?? state.squawk

    // Update position + history only when we have a fresh fix
    if (raw.lat !== undefined && raw.lon !== undefined && (raw.seen_pos ?? 99) < 5) {
      state.lat = raw.lat
      state.lon = raw.lon

      // Append to trail, drop oldest point if over limit
      state.positionHistory.push({ lat: raw.lat, lon: raw.lon, t: now })
      if (state.positionHistory.length > config.maxPositionHistory) {
        state.positionHistory.shift()
      }
    }

    return state
  }

  // Call at midnight to reset daily stats while keeping live tracking data
  resetDailyStats(): void {
    this.seenToday.clear()
    // Repopulate with currently tracked aircraft
    for (const icao of this.aircraft.keys()) {
      this.seenToday.add(icao)
    }
    this.highestAltFt = null
    this.fastestKts = null
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}