import { useEffect, useRef } from 'react'
import { useAircraftStore } from '../store/aircraftStore.js'
import { deadReckon } from '../lib/interpolation.js'

export interface InterpolatedPosition {
  icao:          string
  lat:           number
  lon:           number
  trackDeg:      number
  altitudeFt:    number | null
  groundSpeedKts:number | null
  flight:        string | null
  positionHistory: Array<{ lat: number; lon: number; t: number }>
}

// onFrame is called every animation frame with the full interpolated position list.
// Keep the callback reference stable with useRef so the rAF loop never needs
// to restart when the caller's closure changes.
export function useInterpolation(
  onFrame: (positions: InterpolatedPosition[]) => void
): void {
  const rafRef      = useRef<number | null>(null)
  const callbackRef = useRef(onFrame)

  // Always call the latest version of the callback without restarting the loop
  callbackRef.current = onFrame

  useEffect(() => {
    const tick = () => {
      // Read directly from Zustand outside React — no re-render triggered
      const { aircraft } = useAircraftStore.getState()
      const now = Date.now()

      const positions: InterpolatedPosition[] = []

      for (const a of aircraft.values()) {
        // Skip aircraft without a valid position fix
        if (a.lat === null || a.lon === null) continue

        // Don't dead-reckon ground traffic — they stop, turn, taxi unpredictably
        if (a.onGround) {
          positions.push({
            icao:           a.icao,
            lat:            a.lat,
            lon:            a.lon,
            trackDeg:       a.trackDeg ?? 0,
            altitudeFt:     a.altitudeFt,
            groundSpeedKts: a.groundSpeedKts,
            flight:         a.flight,
            positionHistory: a.positionHistory,
          })
          continue
        }

        const elapsedMs = now - a.lastSeenAt

        // Cap dead reckoning at 30s — beyond that the estimate drifts too far.
        // Aircraft that go silent for >30s are likely out of range anyway.
        const clampedMs = Math.min(elapsedMs, 30_000)

        let lat      = a.lat
        let lon      = a.lon
        const trackDeg = a.trackDeg ?? 0

        if (
          a.groundSpeedKts !== null &&
          a.groundSpeedKts > 10 &&   // ignore near-stationary blips
          a.trackDeg !== null &&
          clampedMs > 0
        ) {
          const reckoned = deadReckon(a.lat, a.lon, a.trackDeg, a.groundSpeedKts, clampedMs)
          lat = reckoned.lat
          lon = reckoned.lon
        }

        positions.push({
          icao:           a.icao,
          lat,
          lon,
          trackDeg,
          altitudeFt:     a.altitudeFt,
          groundSpeedKts: a.groundSpeedKts,
          flight:         a.flight,
          positionHistory: a.positionHistory,
        })
      }

      callbackRef.current(positions)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, []) // Empty deps — loop starts once, reads store directly each frame
}