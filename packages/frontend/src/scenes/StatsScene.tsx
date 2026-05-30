// packages/frontend/src/scenes/StatsScene.tsx
import { motion } from 'framer-motion'
import { useStatsStore } from '../store/statsStore.js'
import { useAircraftStore, selectAircraftList } from '../store/aircraftStore.js'
import { formatAltitude, formatSpeed, formatDistance } from '../lib/format.js'

export function StatsScene() {
  const stats = useStatsStore(s => s.stats)
  const aircraft = useAircraftStore(selectAircraftList)

  const onGround = aircraft.filter(a => a.onGround).length
  const airborne = aircraft.filter(a => !a.onGround && a.lat !== null).length
  const withMeta  = aircraft.filter(a => a.meta !== null).length

  const statCards = [
    {
      label: 'Tracked now',
      value: String(stats?.trackedNow ?? aircraft.length),
      sub: `${airborne} airborne · ${onGround} ground`,
      accent: true,
    },
    {
      label: 'Seen today',
      value: String(stats?.seenToday ?? '—'),
      sub: 'since midnight',
    },
    {
      label: 'Highest altitude',
      value: formatAltitude(stats?.highestAltFt ?? null),
      sub: 'today\'s peak',
    },
    {
      label: 'Fastest',
      value: formatSpeed(stats?.fastestKts ?? null),
      sub: 'today\'s peak',
    },
    {
      label: 'Furthest',
      value: formatDistance(stats?.furthestKm ?? null),
      sub: stats?.furthestCallsign ?? '',
    },
    {
      label: 'Enriched',
      value: `${withMeta} / ${aircraft.length}`,
      sub: 'metadata resolved',
    },
  ]

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '48px 56px',
      gap: 40,
      background: 'var(--color-bg)',
    }}>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
          Session statistics
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', opacity: 0.5 }}>
          {new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </motion.div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
      }}>
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07, duration: 0.5, ease: 'easeOut' }}
            style={{
              padding: '28px 32px',
              background: 'var(--color-surface)',
              border: `1px solid ${card.accent ? 'var(--color-border-bright)' : 'var(--color-border)'}`,
              borderRadius: 12,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {card.accent && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: 'var(--color-accent)',
                boxShadow: '0 0 8px var(--color-accent-glow)',
              }} />
            )}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              {card.label}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 44,
              fontWeight: 700,
              color: card.accent ? 'var(--color-accent)' : 'var(--color-text-primary)',
              lineHeight: 1,
              marginBottom: 8,
              textShadow: card.accent ? '0 0 16px var(--color-accent-glow)' : 'none',
            }}>
              {card.value}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>
              {card.sub}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Live aircraft mini-list */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
          Now tracking
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {aircraft
            .filter(a => a.flight)
            .sort((a, b) => (b.altitudeFt ?? 0) - (a.altitudeFt ?? 0))
            .slice(0, 16)
            .map(a => (
              <div key={a.icao} style={{
                padding: '4px 10px',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--color-text-secondary)',
              }}>
                {a.flight}
              </div>
            ))}
          {aircraft.length > 16 && (
            <div style={{ padding: '4px 10px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
              +{aircraft.length - 16} more
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}