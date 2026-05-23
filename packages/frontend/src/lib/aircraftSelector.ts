// packages/frontend/src/lib/aircraftSelector.ts
import type { AircraftState } from '@adsb-display/shared'

// Score aircraft for "interestingness" — spotlight picks the top scorer
export function selectSpotlightAircraft(
  aircraft: AircraftState[],
  receiverLat: number,
  receiverLon: number
): AircraftState | null {
  const candidates = aircraft.filter(
    a => a.lat !== null && a.lon !== null && !a.onGround
  )

  if (candidates.length === 0) return null

  return candidates
    .map(a => ({ a, score: scoreAircraft(a, receiverLat, receiverLon) }))
    .sort((x, y) => y.score - x.score)
    [0]?.a ?? null
}

function scoreAircraft(
  a: AircraftState,
  receiverLat: number,
  receiverLon: number
): number {
  let score = 0

  // Prefer aircraft with enriched metadata — they show better cards
  if (a.meta) score += 40
  if (a.image) score += 30
  if (a.flight) score += 20

  // Prefer closer aircraft (within 150nm)
  if (a.lat !== null && a.lon !== null) {
    const dist = haversineNm(receiverLat, receiverLon, a.lat, a.lon)
    score += Math.max(0, 150 - dist)
  }

  // Prefer interesting altitudes (cruise level)
  if (a.altitudeFt !== null) {
    if (a.altitudeFt > 20000) score += 15
    if (a.altitudeFt > 35000) score += 10
  }

  // Prefer aircraft we haven't seen for a while (rotate the spotlight)
  const ageMin = (Date.now() - a.firstSeenAt) / 60_000
  if (ageMin < 5) score += 10

  return score
}

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065 // Earth radius in nautical miles
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(d: number) { return (d * Math.PI) / 180 }