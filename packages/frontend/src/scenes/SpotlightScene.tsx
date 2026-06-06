// packages/frontend/src/scenes/SpotlightScene.tsx
import { useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { AircraftRoute, RouteAirport } from '@adsb-display/shared'
import { useAircraftStore, selectAircraftWithPosition } from '../store/aircraftStore.js'
import { selectSpotlightAircraft } from '../lib/aircraftSelector.js'
import { formatAltitude, formatSpeed, formatVerticalRate, altitudeColor } from '../lib/format.js'

const fieldAnim = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' },
  }),
}

export function SpotlightScene() {
  const aircraft = useAircraftStore(selectAircraftWithPosition)
  const { receiverLat, receiverLon, setSpotlightIcao } = useAircraftStore()

  const subject = useMemo(
    () => selectSpotlightAircraft(aircraft, receiverLat, receiverLon),
    // Recalculate only when the aircraft list changes substantially
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aircraft.length, receiverLat, receiverLon]
  )

  useEffect(() => {
    if (subject) setSpotlightIcao(subject.icao)
  }, [subject?.icao, setSpotlightIcao])

  if (!subject) return null

  const meta  = subject.meta
  const image = subject.image
  const route = subject.route
  const altColor = altitudeColor(subject.altitudeFt)

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #0d1a2e 0%, var(--color-bg) 70%)',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: image ? '1fr 1fr' : '1fr',
        gap: 0,
        width: '88%',
        maxWidth: 1160,
        minHeight: 420,
        border: '1px solid var(--color-border-bright)',
        borderRadius: 16,
        overflow: 'hidden',
        background: 'var(--color-surface)',
      }}>

        {/* Left: planespotter image */}
        {image && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.1 }}
            style={{
              backgroundImage: `url(${image.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              minHeight: 420,
              position: 'relative',
            }}
          >
            {/* Fade right edge into the data panel */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to right, transparent 55%, var(--color-surface) 100%)',
            }} />
            {/* Subtle bottom vignette */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 40%)',
            }} />
            {/* Photographer credit */}
            <div style={{
              position: 'absolute', bottom: 12, left: 14,
              fontSize: 11,
              color: 'rgba(255,255,255,0.45)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
            }}>
              © {image.photographer}
            </div>
          </motion.div>
        )}

        {/* Right: data panel */}
        <div style={{ padding: '36px 44px', display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* ── Flight callsign ── */}
          <motion.div custom={0} variants={fieldAnim} initial="hidden" animate="visible">
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--color-text-muted)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}>
              Flight
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 50,
              fontWeight: 700,
              color: 'var(--color-accent)',
              letterSpacing: '0.05em',
              lineHeight: 1,
              textShadow: '0 0 20px var(--color-accent-glow)',
              marginBottom: 6,
            }}>
              {subject.flight ?? subject.icao.toUpperCase()}
            </div>
          </motion.div>

          {/* ── Operator ── */}
          {meta?.operatorName && (
            <motion.div custom={1} variants={fieldAnim} initial="hidden" animate="visible"
              style={{ fontSize: 19, color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 300 }}>
              {meta.operatorName}
            </motion.div>
          )}

          {/* ── Aircraft type + registration ── */}
          {(meta?.typeName ?? subject.typeCode) && (
            <motion.div custom={2} variants={fieldAnim} initial="hidden" animate="visible"
              style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20, fontFamily: 'var(--font-mono)' }}>
              {meta?.typeName ?? subject.typeCode}
              {meta?.registration && <span style={{ marginLeft: 14, opacity: 0.55 }}>{meta.registration}</span>}
              {meta?.built && <span style={{ marginLeft: 14, opacity: 0.45 }}>b.{meta.built}</span>}
            </motion.div>
          )}

          {/* ── Route bar ── */}
          {route && (route.origin ?? route.destination) && (
            <RouteBar route={route} />
          )}

          {/* ── Telemetry grid ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '18px 28px',
            marginTop: 'auto',
          }}>
            {[
              { label: 'Altitude', value: formatAltitude(subject.altitudeFt),       color: altColor },
              { label: 'Speed',    value: formatSpeed(subject.groundSpeedKts),       color: 'var(--color-text-primary)' },
              { label: 'Heading',  value: subject.trackDeg !== null ? `${Math.round(subject.trackDeg)}°` : '—', color: 'var(--color-text-primary)' },
              { label: 'V/S',      value: formatVerticalRate(subject.verticalRateFpm), color: 'var(--color-text-primary)' },
            ].map((field, i) => (
              <motion.div key={field.label} custom={i + 4} variants={fieldAnim} initial="hidden" animate="visible">
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
                  {field.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 600, color: field.color, fontFamily: 'var(--font-mono)' }}>
                  {field.value}
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── ICAO hex + signal strength ── */}
          <motion.div custom={8} variants={fieldAnim} initial="hidden" animate="visible"
            style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
              ICAO {subject.icao.toUpperCase()}
              {meta?.countryIso && <span style={{ marginLeft: 12 }}>{meta.countryIso}</span>}
            </div>
            <SignalStrength rssi={subject.rssi} />
          </motion.div>
        </div>
      </div>
    </div>
  )
}

// ─── Route bar ────────────────────────────────────────────────────────────────

function RouteBar({ route }: { route: AircraftRoute }) {
  return (
    <motion.div
      custom={3}
      variants={fieldAnim}
      initial="hidden"
      animate="visible"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 22,
        padding: '13px 18px',
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 10,
        border: '1px solid var(--color-border-bright)',
      }}
    >
      <AirportBadge airport={route.origin} align="left" />

      {/* Connector line */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        color: 'var(--color-text-muted)',
        opacity: 0.45,
        minWidth: 0,
      }}>
        <div style={{ flex: 1, height: 1, background: 'currentColor' }} />
        <span style={{ fontSize: 13, flexShrink: 0 }}>✈</span>
        <div style={{ flex: 1, height: 1, background: 'currentColor' }} />
      </div>

      <AirportBadge airport={route.destination} align="right" />
    </motion.div>
  )
}

function AirportBadge({
  airport,
  align,
}: {
  airport: RouteAirport | null
  align: 'left' | 'right'
}) {
  const textAlign = align

  if (!airport) {
    return (
      <div style={{ width: 52, textAlign }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 22,
          color: 'var(--color-text-muted)',
          opacity: 0.3,
        }}>
          ?
        </div>
      </div>
    )
  }

  return (
    <div style={{ minWidth: 52, textAlign }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 24,
        fontWeight: 700,
        color: 'var(--color-accent)',
        letterSpacing: '0.06em',
        lineHeight: 1,
      }}>
        {airport.iataCode}
      </div>
      <div style={{
        fontSize: 11,
        color: 'var(--color-text-muted)',
        marginTop: 3,
        maxWidth: 130,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}>
        {airport.municipality || airport.name}
      </div>
    </div>
  )
}

// ─── Signal strength ──────────────────────────────────────────────────────────

// RSSI is typically −10 (strong) to −30 dBFS (weak) for ADS-B
function SignalStrength({ rssi }: { rssi: number }) {
  const BAR_COUNT = 5
  // Map rssi range [−30, −10] → [0, 1], clamp outside that range
  const strength = Math.max(0, Math.min(1, (rssi + 30) / 20))
  const filledBars = Math.round(strength * BAR_COUNT)

  const color = strength > 0.6
    ? 'var(--color-accent)'
    : strength > 0.3
    ? '#f5a623'
    : '#e05252'

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }} title={`${rssi.toFixed(1)} dBFS`}>
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: 6 + i * 3,
            borderRadius: 1,
            background: i < filledBars ? color : 'var(--color-border-bright)',
            opacity: i < filledBars ? 1 : 0.3,
            transition: 'background 0.4s ease',
          }}
        />
      ))}
      <span style={{
        marginLeft: 6,
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        color: 'var(--color-text-muted)',
        letterSpacing: '0.05em',
      }}>
        {rssi.toFixed(1)} dBFS
      </span>
    </div>
  )
}