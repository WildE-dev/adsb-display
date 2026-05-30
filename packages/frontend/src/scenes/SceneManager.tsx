// packages/frontend/src/scenes/SceneManager.tsx
import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SpotlightScene } from './SpotlightScene.js'
import { WeatherScene } from './WeatherScene.js'
import { StatsScene } from './StatsScene.js'
import { useAircraftStore, selectAircraftWithPosition } from '../store/aircraftStore.js'

// Radar is no longer in the rotation — it's always on as the base layer.
// These are the overlay scenes that appear on top of it.
type OverlaySceneId = 'spotlight' | 'weather' | 'stats'

// null means "show the radar" — the overlay is transparent
type ActiveScene = OverlaySceneId | null

const SCENE_DURATIONS: Record<OverlaySceneId, number> = {
  spotlight: 15_000,
  weather:   12_000,
  stats:     10_000,
}

// How long to show the raw radar between overlay scenes
const RADAR_DURATION = 25_000

const OVERLAY_ORDER: OverlaySceneId[] = ['spotlight', 'weather', 'stats']

const overlayVariants = {
  enter: {
    opacity: 0,
    scale: 1.015,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.985,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
}

export function SceneManager() {
  // null = radar showing (no overlay), otherwise the overlay scene id
  const [active, setActive] = useState<ActiveScene>(null)
  const [overlayIndex, setOverlayIndex] = useState(0)

  const aircraft = useAircraftStore(selectAircraftWithPosition)

  const advance = useCallback(() => {
    setActive(current => {
      if (current === null) {
        // Radar just finished — show next overlay
        const next = OVERLAY_ORDER[overlayIndex] as OverlaySceneId
        // Skip spotlight if no aircraft
        if (next === 'spotlight' && aircraft.length === 0) {
          setOverlayIndex(i => (i + 1) % OVERLAY_ORDER.length)
          return 'weather'
        }
        return next
      } else {
        // Overlay just finished — advance overlay index and show radar
        setOverlayIndex(i => (i + 1) % OVERLAY_ORDER.length)
        return null
      }
    })
  }, [overlayIndex, aircraft.length])

  useEffect(() => {
    const duration = active === null
      ? RADAR_DURATION
      : SCENE_DURATIONS[active]

    const timer = setTimeout(advance, duration)
    return () => clearTimeout(timer)
  }, [active, advance])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <AnimatePresence mode="wait">
        {active !== null && (
          <motion.div
            key={active}
            style={{ position: 'absolute', inset: 0 }}
            variants={overlayVariants}
            initial="enter"
            animate="visible"
            exit="exit"
          >
            {active === 'spotlight' && <SpotlightScene />}
            {active === 'weather'   && <WeatherScene />}
            {active === 'stats'     && <StatsScene />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scene indicator — always visible */}
      <SceneIndicator active={active} />
    </div>
  )
}

function SceneIndicator({ active }: { active: ActiveScene }) {
  // radar dot + one dot per overlay
  const dots: Array<{ id: string; label: string }> = [
    { id: 'radar', label: 'Radar' },
    ...OVERLAY_ORDER.map(id => ({ id, label: id })),
  ]

  const currentId = active ?? 'radar'

  return (
    <div style={{
      position: 'absolute',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: 8,
      zIndex: 100,
    }}>
      {dots.map(({ id }) => (
        <div
          key={id}
          style={{
            width:        id === currentId ? 24 : 6,
            height:       6,
            borderRadius: 3,
            background:   id === currentId
              ? 'var(--color-accent)'
              : 'var(--color-text-muted)',
            opacity:    id === currentId ? 1 : 0.4,
            transition: 'all 0.4s ease',
            boxShadow:  id === currentId
              ? '0 0 8px var(--color-accent-glow)'
              : 'none',
          }}
        />
      ))}
    </div>
  )
}