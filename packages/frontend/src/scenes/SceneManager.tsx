// packages/frontend/src/scenes/SceneManager.tsx
import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RadarScene } from './RadarScene'
import { SpotlightScene } from './SpotlightScene'
import { WeatherScene } from './WeatherScene'
import { StatsScene } from './StatsScene'
import { useAircraftStore, selectAircraftWithPosition } from '../store/aircraftStore.js'

type SceneId = 'radar' | 'spotlight' | 'weather' | 'stats'

// How long each scene is displayed (ms)
const SCENE_DURATIONS: Record<SceneId, number> = {
  radar:     25_000,  // Radar gets the most time — it's the main view
  spotlight: 15_000,
  weather:   12_000,
  stats:     10_000,
}

const SCENE_ORDER: SceneId[] = ['radar', 'spotlight', 'weather', 'stats']

// Cinematic cross-fade with a slight upward drift
const sceneVariants = {
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
  const [sceneIndex, setSceneIndex] = useState(0)
  const aircraft = useAircraftStore(selectAircraftWithPosition)

  const currentScene = SCENE_ORDER[sceneIndex] as SceneId

  const advance = useCallback(() => {
    setSceneIndex(i => (i + 1) % SCENE_ORDER.length)
  }, [])

  useEffect(() => {
    // Skip spotlight if there are no aircraft to show
    const scene = SCENE_ORDER[sceneIndex] as SceneId
    if (scene === 'spotlight' && aircraft.length === 0) {
      advance()
      return
    }

    const duration = SCENE_DURATIONS[scene]
    const timer = setTimeout(advance, duration)
    return () => clearTimeout(timer)
  }, [sceneIndex, aircraft.length, advance])

  return (
    <div className="scene-container">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScene}
          className="scene-container"
          variants={sceneVariants}
          initial="enter"
          animate="visible"
          exit="exit"
        >
          {currentScene === 'radar'     && <RadarScene />}
          {currentScene === 'spotlight' && <SpotlightScene />}
          {currentScene === 'weather'   && <WeatherScene />}
          {currentScene === 'stats'     && <StatsScene />}
        </motion.div>
      </AnimatePresence>

      {/* Scene indicator dots — subtle, bottom center */}
      <SceneIndicator current={currentScene} />
    </div>
  )
}

function SceneIndicator({ current }: { current: SceneId }) {
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
      {SCENE_ORDER.map(id => (
        <div
          key={id}
          style={{
            width: id === current ? 24 : 6,
            height: 6,
            borderRadius: 3,
            background: id === current
              ? 'var(--color-accent)'
              : 'var(--color-text-muted)',
            opacity: id === current ? 1 : 0.4,
            transition: 'all 0.4s ease',
            boxShadow: id === current
              ? '0 0 8px var(--color-accent-glow)'
              : 'none',
          }}
        />
      ))}
    </div>
  )
}