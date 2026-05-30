export const config = {
  receiverLat:          Number(process.env['RECEIVER_LAT'] ?? '51.5'),
  receiverLon:          Number(process.env['RECEIVER_LON'] ?? '-0.12'),
  adsbJsonPath:         process.env['ADSB_JSON_PATH'] ?? './aircraft.json',
  pollIntervalMs:       1000,
  aircraftTimeoutSec:   60,
  maxPositionHistory:   120,
  httpPort:             Number(process.env['PORT'] ?? '4000'),
  weatherPollIntervalMs: 5 * 60 * 1000,
  metaFetchDebounceMs:  500,
  metaFetchConcurrency: 3,
  statsResetHour:       0,
  corsOrigins: process.env['CORS_ORIGINS']?.split(',') ?? [
    'http://localhost:3000',
    'http://localhost:4173',
  ],
} as const