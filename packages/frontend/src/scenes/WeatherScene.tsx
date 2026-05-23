// packages/frontend/src/scenes/WeatherScene.tsx
import { motion } from 'framer-motion'
import { useWeatherStore } from '../store/weatherStore.js'
import { formatWind, weatherDescription } from '../lib/format.js'

export function WeatherScene() {
  const weather = useWeatherStore(s => s.weather)

  if (!weather) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>Fetching weather…</div>
      </div>
    )
  }

  const c = weather.current
  const catColor = {
    VFR: 'var(--color-vfr)',
    MVFR: 'var(--color-mvfr)',
    IFR: 'var(--color-ifr)',
    LIFR: 'var(--color-lifr)',
  }[c.flightCategory]

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'grid',
      gridTemplateRows: 'auto 1fr',
      padding: '48px 56px',
      gap: 32,
    }}>

      {/* Top row: current conditions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'start' }}>

        {/* Temperature + condition */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
            Current conditions
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <span style={{ fontSize: 96, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
              {Math.round(c.temperatureC)}°
            </span>
            <div>
              <div style={{ fontSize: 18, color: 'var(--color-text-secondary)', fontWeight: 300 }}>
                {weatherDescription(c.weatherCode)}
              </div>
              <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Feels like {Math.round(c.feelsLikeC)}°
              </div>
            </div>
          </div>
        </motion.div>

        {/* Flight category badge */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            padding: '12px 24px',
            border: `2px solid ${catColor}`,
            borderRadius: 8,
            textAlign: 'center',
          }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', letterSpacing: '0.15em', marginBottom: 4 }}>
            FLIGHT CATEGORY
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700, color: catColor, textShadow: `0 0 16px ${catColor}` }}>
            {c.flightCategory}
          </div>
        </motion.div>
      </div>

      {/* Middle: detail grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, alignContent: 'start' }}>
        {[
          { label: 'Wind',       value: formatWind(c.windDirectionDeg, c.windSpeedKts) },
          { label: 'Gusts',      value: c.windGustKts > c.windSpeedKts + 5 ? `${Math.round(c.windGustKts)} kt` : 'None' },
          { label: 'Visibility', value: c.visibilityM >= 9000 ? '10+ km' : `${(c.visibilityM / 1000).toFixed(1)} km` },
          { label: 'Humidity',   value: `${Math.round(c.humidity)}%` },
          { label: 'Pressure',   value: `${Math.round(c.pressureHpa)} hPa` },
          { label: 'Cloud cover',value: `${Math.round(c.cloudCoverPct)}%` },
          { label: 'Precip',     value: c.precipitationMm > 0 ? `${c.precipitationMm.toFixed(1)} mm` : 'None' },
          { label: 'Dew point',  value: `${dewPoint(c.temperatureC, c.humidity).toFixed(0)}°` },
        ].map((field, i) => (
          <motion.div key={field.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
            style={{
              padding: '16px 20px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
            }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
              {field.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
              {field.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Forecast strip */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'var(--font-mono)' }}>
          12-hour forecast
        </div>
        <div style={{ display: 'flex', gap: 2, overflowX: 'hidden' }}>
          {weather.forecast.slice(0, 10).map((h, i) => (
            <motion.div key={h.time}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.04, duration: 0.4 }}
              style={{
                flex: 1,
                padding: '10px 8px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                textAlign: 'center',
              }}>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                {new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>
                {Math.round(h.temperatureC)}°
              </div>
              <div style={{ fontSize: 10, color: h.precipitationPct > 40 ? 'var(--color-mvfr)' : 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                {h.precipitationPct}%
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

function dewPoint(tempC: number, humidity: number): number {
  const a = 17.27, b = 237.7
  const gamma = (a * tempC) / (b + tempC) + Math.log(humidity / 100)
  return (b * gamma) / (a - gamma)
}