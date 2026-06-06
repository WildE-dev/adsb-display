// packages/frontend/src/scenes/SpotlightScene.tsx
import { useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
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

  const meta = subject.meta
  const image = subject.image
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
        width: '85%',
        maxWidth: 1100,
        minHeight: 400,
        border: '1px solid var(--color-border-bright)',
        borderRadius: 16,
        overflow: 'hidden',
        background: 'var(--color-surface)',
      }}>

        {/* Left: image */}
        {image && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            style={{
              backgroundImage: `url(${image.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              minHeight: 380,
              position: 'relative',
            }}
          >
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to right, transparent 60%, var(--color-surface))',
            }} />
            <div style={{
              position: 'absolute', bottom: 12, left: 12,
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
              fontFamily: 'var(--font-mono)',
            }}>
              © {image.photographer}
            </div>
          </motion.div>
        )}

        {/* Right: data */}
        <div style={{ padding: '40px 44px', display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Callsign */}
          <motion.div custom={0} variants={fieldAnim} initial="hidden" animate="visible">
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--color-text-muted)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}>
              Flight
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 52,
              fontWeight: 700,
              color: 'var(--color-accent)',
              letterSpacing: '0.05em',
              lineHeight: 1,
              textShadow: '0 0 20px var(--color-accent-glow)',
              marginBottom: 4,
            }}>
              {subject.flight ?? subject.icao.toUpperCase()}
            </div>
          </motion.div>

          {/* Operator */}
          {meta?.operatorName && (
            <motion.div custom={1} variants={fieldAnim} initial="hidden" animate="visible"
              style={{ fontSize: 20, color: 'var(--color-text-secondary)', marginBottom: 4, fontWeight: 300 }}>
              {meta.operatorName}
            </motion.div>
          )}

          {/* Aircraft type */}
          {(meta?.typeName ?? subject.typeCode) && (
            <motion.div custom={2} variants={fieldAnim} initial="hidden" animate="visible"
              style={{ fontSize: 15, color: 'var(--color-text-muted)', marginBottom: 28, fontFamily: 'var(--font-mono)' }}>
              {meta?.typeName ?? subject.typeCode}
              {meta?.registration && <span style={{ marginLeft: 16, opacity: 0.6 }}>{meta.registration}</span>}
            </motion.div>
          )}

          {/* Data grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px 32px',
            marginTop: 'auto',
          }}>
            {[
              { label: 'Altitude',  value: formatAltitude(subject.altitudeFt), color: altColor },
              { label: 'Speed',     value: formatSpeed(subject.groundSpeedKts), color: 'var(--color-text-primary)' },
              { label: 'Heading',   value: subject.trackDeg !== null ? `${Math.round(subject.trackDeg)}°` : '—', color: 'var(--color-text-primary)' },
              { label: 'V/S',       value: formatVerticalRate(subject.verticalRateFpm), color: 'var(--color-text-primary)' },
            ].map((field, i) => (
              <motion.div key={field.label} custom={i + 3} variants={fieldAnim} initial="hidden" animate="visible">
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
                  {field.label}
                </div>
                <div style={{ fontSize: 28, fontWeight: 600, color: field.color, fontFamily: 'var(--font-mono)' }}>
                  {field.value}
                </div>
              </motion.div>
            ))}
          </div>

          {/* ICAO hex + signal strength */}
          <motion.div custom={7} variants={fieldAnim} initial="hidden" animate="visible"
            style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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