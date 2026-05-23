// packages/frontend/src/lib/format.ts

export function formatAltitude(ft: number | null): string {
  if (ft === null) return '—'
  if (ft === 0) return 'GND'
  if (ft >= 1000) return `FL${Math.round(ft / 100).toString().padStart(3, '0')}`
  return `${ft.toLocaleString()} ft`
}

export function formatSpeed(kts: number | null): string {
  if (kts === null) return '—'
  return `${Math.round(kts)} kt`
}

export function formatDistance(km: number | null): string {
  if (km === null) return '—'
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${Math.round(km)} km`
}

export function formatVerticalRate(fpm: number | null): string {
  if (fpm === null) return '—'
  if (Math.abs(fpm) < 100) return '→'
  return fpm > 0 ? `↑ ${Math.round(fpm / 100) * 100}` : `↓ ${Math.abs(Math.round(fpm / 100) * 100)}`
}

export function formatWind(deg: number, kts: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
  const dir = dirs[Math.round(deg / 22.5) % 16] ?? 'N'
  return `${dir} ${Math.round(kts)} kt`
}

export function altitudeColor(ft: number | null): string {
  if (ft === null || ft === 0) return 'var(--color-text-muted)'
  if (ft < 5000)  return 'var(--color-alt-low)'
  if (ft < 20000) return 'var(--color-alt-mid)'
  if (ft < 40000) return 'var(--color-alt-high)'
  return 'var(--color-alt-vhigh)'
}

// WMO weather code → human description
export function weatherDescription(code: number): string {
  if (code === 0)          return 'Clear sky'
  if (code <= 3)           return 'Partly cloudy'
  if (code <= 49)          return 'Foggy'
  if (code <= 59)          return 'Drizzle'
  if (code <= 69)          return 'Rain'
  if (code <= 79)          return 'Snow'
  if (code <= 84)          return 'Rain showers'
  if (code <= 94)          return 'Thunderstorm'
  return 'Severe thunderstorm'
}