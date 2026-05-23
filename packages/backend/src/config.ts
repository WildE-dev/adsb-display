import process from "process";

export const config = {
  // Receiver location — set these to your Pi's GPS coordinates
  // Used for distance calculations and map centering
  receiverLat: Number(process.env['RECEIVER_LAT'] ?? '51.5'),
  receiverLon: Number(process.env['RECEIVER_LON'] ?? '-0.12'),

  // Path to readsb's output file. Default works for standard readsb install.
  // On most Pi setups: /run/readsb/aircraft.json or /run/dump1090-fa/aircraft.json
  adsbJsonPath: process.env['ADSB_JSON_PATH'] ?? './aircraft.json',

  // How often to poll aircraft.json (ms)
  pollIntervalMs: 1000,

  // Aircraft is considered "gone" after this many seconds without a message
  aircraftTimeoutSec: 60,

  // Maximum position history points to keep per aircraft
  maxPositionHistory: 120,

  // Ports
  httpPort: Number(process.env['PORT'] ?? '4000'),

  // Weather polling interval (ms) — Open-Meteo free tier is generous
  weatherPollIntervalMs: 5 * 60 * 1000,

  // Metadata fetch — debounce to avoid hammering APIs on startup burst
  metaFetchDebounceMs: 500,
  metaFetchConcurrency: 3,

  // Stats reset time (midnight local)
  statsResetHour: 0,

  // CORS — allow the Vite dev server and production frontend
  corsOrigins: process.env['CORS_ORIGINS']?.split(',') ?? [
    'http://localhost:3000',
    'http://localhost:4173',
  ],
} as const