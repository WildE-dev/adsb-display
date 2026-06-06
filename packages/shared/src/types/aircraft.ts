// Raw aircraft entry from readsb aircraft.json
export interface ReadsbAircraft {
  hex: string           // ICAO 24-bit address, e.g. "ab1234"
  flight?: string       // callsign, e.g. "DAL123  "
  r?: string            // registration, e.g. "N12345"
  t?: string            // aircraft type code, e.g. "B738"
  lat?: number
  lon?: number
  alt_baro?: number | 'ground'
  alt_geom?: number
  gs?: number           // ground speed, knots
  track?: number        // true track, degrees
  baro_rate?: number    // ft/min
  squawk?: string
  emergency?: string
  category?: string     // A0–D7
  seen: number          // seconds since last message
  seen_pos?: number     // seconds since last position
  messages: number
  rssi: number
}

export interface ReadsbSnapshot {
  now: number           // Unix timestamp (seconds)
  messages: number
  aircraft: ReadsbAircraft[]
}

// Enriched aircraft state maintained in backend memory
export interface AircraftState {
  icao: string
  flight: string | null
  registration: string | null
  typeCode: string | null

  lat: number | null
  lon: number | null
  altitudeFt: number | null
  onGround: boolean
  groundSpeedKts: number | null
  trackDeg: number | null
  verticalRateFpm: number | null
  squawk: string | null

  // Filled from metadata cache after first sighting
  meta: AircraftMeta | null
  image: AircraftImage | null

  firstSeenAt: number     // Unix ms
  lastSeenAt: number      // Unix ms — time of last message (any kind)
  lastPositionAt: number  // Unix ms — time of last lat/lon fix
  positionHistory: Array<{ lat: number; lon: number; t: number }>
  messageCount: number
  rssi: number
}

// From ADSBDB API
export interface AircraftMeta {
  icao: string
  registration: string | null
  typeCode: string | null
  typeName: string | null       // "Boeing 737-800"
  operatorName: string | null   // "Delta Air Lines"
  operatorIata: string | null   // "DL"
  operatorIcao: string | null   // "DAL"
  countryIso: string | null
  built: string | null          // year
}

// From Planespotters API
export interface AircraftImage {
  url: string
  thumbnailUrl: string
  photographer: string
  license: string
}