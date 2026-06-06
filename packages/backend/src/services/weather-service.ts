// packages/backend/src/services/weather-service.ts

import { EventEmitter } from 'node:events'
import type { WeatherData } from '@adsb-display/shared'
import { config } from '../config.js'

interface WeatherServiceEvents {
  update: [data: WeatherData]
}

export class WeatherService extends EventEmitter<WeatherServiceEvents> {
  private current: WeatherData | null = null
  private timer: NodeJS.Timeout | null = null

  getCurrent(): WeatherData | null {
    return this.current
  }

  start(): void {
    console.log('[weather] Starting weather polling')
    void this.fetch()
    this.timer = setInterval(() => void this.fetch(), config.weatherPollIntervalMs)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
  }

  private async fetch(): Promise<void> {
    try {
      const { receiverLat: lat, receiverLon: lon } = config

      // Fetch current conditions + 24h hourly forecast in one request
      const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lon),
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'precipitation',
          'weather_code',
          'wind_speed_10m',
          'wind_direction_10m',
          'wind_gusts_10m',
          'visibility',
          'surface_pressure',
          'cloud_cover',
        ].join(','),
        hourly: [
          'temperature_2m',
          'precipitation_probability',
          'weather_code',
          'wind_speed_10m',
        ].join(','),
        forecast_days: '2',
        wind_speed_unit: 'kn',     // knots — aviation standard
        temperature_unit: 'celsius',
        timezone: 'auto',
      })

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params}`,
        { signal: AbortSignal.timeout(10000) }
      )

      if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)

      const json = await res.json() as OpenMeteoResponse
      const data = this.parse(json)
      this.current = data
      this.emit('update', data)
      console.log(`[weather] Updated: ${data.current.temperatureC}°C, ${data.current.windSpeedKts}kts`)
    } catch (err) {
      console.error('[weather] Fetch failed:', err)
    }
  }

  private parse(json: OpenMeteoResponse): WeatherData {
    const c = json.current
    const now = new Date()
    // Get the next 12 hourly slots from the current hour
    const currentHourIndex = json.hourly.time.findIndex(
      t => new Date(t) >= now
    )
    // findIndex returns -1 if all slots are in the past (stale API data).
    // Fall back to the last available slot rather than wrapping to index 0.
    const startIdx = currentHourIndex >= 0
      ? currentHourIndex
      : Math.max(0, json.hourly.time.length - 12)

    const forecast = json.hourly.time
      .slice(startIdx, startIdx + 12)
      .map((time, i) => ({
        time,
        temperatureC: json.hourly.temperature_2m[startIdx + i] ?? 0,
        precipitationPct: json.hourly.precipitation_probability[startIdx + i] ?? 0,
        weatherCode: json.hourly.weather_code[startIdx + i] ?? 0,
        windSpeedKts: json.hourly.wind_speed_10m[startIdx + i] ?? 0,
      }))

    // Rough METAR-style flight category from visibility + ceiling
    const visibilityM = c.visibility ?? 9999
    const cloudCover = c.cloud_cover ?? 0
    const flightCategory = deriveFlightCategory(visibilityM, cloudCover)

    return {
      fetchedAt: Date.now(),
      stationLat: config.receiverLat,
      stationLon: config.receiverLon,
      current: {
        temperatureC: c.temperature_2m,
        feelsLikeC: c.apparent_temperature,
        humidity: c.relative_humidity_2m,
        windSpeedKts: c.wind_speed_10m,
        windGustKts: c.wind_gusts_10m,
        windDirectionDeg: c.wind_direction_10m,
        visibilityM,
        pressureHpa: c.surface_pressure,
        cloudCoverPct: cloudCover,
        precipitationMm: c.precipitation,
        weatherCode: c.weather_code,
        flightCategory,
      },
      forecast,
    }
  }
}

function deriveFlightCategory(
  visibilityM: number,
  cloudCoverPct: number
): 'VFR' | 'MVFR' | 'IFR' | 'LIFR' {
  // Simplified — real METAR needs ceiling data which Open-Meteo doesn't provide
  if (visibilityM < 1600 || cloudCoverPct > 80) return 'IFR'
  if (visibilityM < 5000 || cloudCoverPct > 60) return 'MVFR'
  return 'VFR'
}

// Minimal typing for the API response fields we use
interface OpenMeteoResponse {
  current: {
    temperature_2m: number
    apparent_temperature: number
    relative_humidity_2m: number
    wind_speed_10m: number
    wind_gusts_10m: number
    wind_direction_10m: number
    visibility: number
    surface_pressure: number
    cloud_cover: number
    precipitation: number
    weather_code: number
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    precipitation_probability: number[]
    weather_code: number[]
    wind_speed_10m: number[]
  }
}