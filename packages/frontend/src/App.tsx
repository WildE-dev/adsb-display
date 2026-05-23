// packages/frontend/src/App.tsx
import { useSocket } from './hooks/useSocket.js'
import { SceneManager } from './scenes/SceneManager.js'

export default function App() {
  // Establish WebSocket connection — runs once for the app lifetime
  useSocket()

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <SceneManager />
    </div>
  )
}