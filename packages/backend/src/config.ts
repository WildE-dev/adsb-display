import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const envFile = '.env'

const envPath = resolve(__dirname, '..', envFile)
if (existsSync(envPath)) {
  const envData = readFileSync(envPath, 'utf8')
  for (const line of envData.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const equalsIndex = trimmed.indexOf('=')
    if (equalsIndex === -1) continue

    const key = trimmed.slice(0, equalsIndex).trim()
    const value = trimmed.slice(equalsIndex + 1)

    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

export const config = {
  receiverLat:          Number(process.env['RECEIVER_LAT'] ?? '51.5'),
  receiverLon:          Number(process.env['RECEIVER_LON'] ?? '-0.12'),
  adsbJsonPath:         process.env['ADSB_JSON_PATH'] ?? '/run/readsb/aircraft.json',
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