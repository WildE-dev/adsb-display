// packages/frontend/src/lib/interpolation.ts

export interface InterpolatedAircraft {
  icao: string
  lat: number
  lon: number
  trackDeg: number
  altitudeFt: number | null
  groundSpeedKts: number | null
}

// Linear interpolation between two values
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// Angle interpolation — takes the shortest path around the circle
export function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a
  // Wrap to [-180, 180]
  while (diff > 180) diff -= 360
  while (diff < -180) diff += 360
  return a + diff * t
}

// Dead-reckoning: project a position forward given speed and heading
// Used to smooth aircraft positions between 1s server updates
export function deadReckon(
  lat: number,
  lon: number,
  trackDeg: number,
  speedKts: number,
  elapsedMs: number
): { lat: number; lon: number } {
  // Convert speed to degrees per ms
  // 1 knot = 1 nautical mile/hour = 1/3600 nm/s
  // 1 nm ≈ 1/60 degree of latitude
  const elapsedHours = elapsedMs / 3_600_000
  const distanceNm = speedKts * elapsedHours
  const distanceDeg = distanceNm / 60

  const trackRad = (trackDeg * Math.PI) / 180
  const dLat = distanceDeg * Math.cos(trackRad)
  const dLon = distanceDeg * Math.sin(trackRad) / Math.cos((lat * Math.PI) / 180)

  return {
    lat: lat + dLat,
    lon: lon + dLon,
  }
}