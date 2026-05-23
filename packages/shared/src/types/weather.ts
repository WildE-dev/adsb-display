// packages/shared/src/types/weather.ts

export interface WeatherData {
  fetchedAt: number
  stationLat: number
  stationLon: number
  current: CurrentConditions
  forecast: HourlyForecast[]
}

export interface CurrentConditions {
  temperatureC: number
  feelsLikeC: number
  humidity: number
  windSpeedKts: number
  windGustKts: number
  windDirectionDeg: number
  visibilityM: number
  pressureHpa: number
  cloudCoverPct: number
  precipitationMm: number
  weatherCode: number         // WMO weather interpretation code
  flightCategory: 'VFR' | 'MVFR' | 'IFR' | 'LIFR'
}

export interface HourlyForecast {
  time: string                // ISO 8601
  temperatureC: number
  precipitationPct: number
  weatherCode: number
  windSpeedKts: number
}