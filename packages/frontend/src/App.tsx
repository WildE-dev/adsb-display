// packages/frontend/src/App.tsx
import { useSocket } from './hooks/useSocket.js'
import { SceneManager } from './scenes/SceneManager.js'
import { RadarScene } from './scenes/RadarScene.js'

export default function App() {
  useSocket()

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Map lives here permanently — never unmounts, never reloads */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <RadarScene />
      </div>

      {/* Overlay scenes render on top */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <SceneManager />
      </div>
    </div>
  )
}