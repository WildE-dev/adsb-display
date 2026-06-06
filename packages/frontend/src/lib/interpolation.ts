export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// Takes the shortest path around the circle
export function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a
  while (diff > 180)  diff -= 360
  while (diff < -180) diff += 360
  return a + diff * t
}

export interface DeadReckonResult {
  lat: number
  lon: number
}

// Project a position forward given heading and speed
// This fills the gap between 1s server ticks with smooth movement
export function deadReckon(
  lat: number,
  lon: number,
  trackDeg: number,
  speedKts: number,
  elapsedMs: number
): DeadReckonResult {
  if (speedKts <= 0 || elapsedMs <= 0) return { lat, lon }
  // cos(lat) → 0 at the poles; guard against division by zero from bad data
  if (Math.abs(lat) >= 90) return { lat, lon }

  // Convert knots + elapsed time to nautical miles travelled
  const elapsedHours  = elapsedMs / 3_600_000
  const distanceNm    = speedKts * elapsedHours

  // 1 nautical mile = 1/60 degree of latitude (approximately)
  const distanceDeg   = distanceNm / 60
  const trackRad      = (trackDeg * Math.PI) / 180

  // Decompose into lat/lon deltas
  // cos(lat) corrects for longitude compression at higher latitudes
  const dLat = distanceDeg * Math.cos(trackRad)
  const dLon = distanceDeg * Math.sin(trackRad) / Math.cos((lat * Math.PI) / 180)

  return {
    lat: lat + dLat,
    lon: lon + dLon,
  }
}