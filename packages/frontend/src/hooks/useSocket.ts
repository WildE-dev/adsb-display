// packages/frontend/src/hooks/useSocket.ts
import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@adsb-display/shared'
import { useAircraftStore } from '../store/aircraftStore.js'
import { useWeatherStore } from '../store/weatherStore.js'
import { useStatsStore } from '../store/statsStore.js'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

const BACKEND_URL = (import.meta as any).env['VITE_BACKEND_URL'] ?? 'http://localhost:4000'

export function useSocket() {
  const socketRef = useRef<AppSocket | null>(null)
  const { setSnapshot, applyDiff } = useAircraftStore()
  const { setWeather } = useWeatherStore()
  const { setStats } = useStatsStore()

  useEffect(() => {
    const socket: AppSocket = io(BACKEND_URL, {
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // On Pi LAN, reconnection should be near-instant
      timeout: 5000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[socket] Connected, requesting snapshot')
      socket.emit('client:ready')
    })

    socket.on('aircraft:snapshot', ({ aircraft, receiverLat, receiverLon }) => {
      setSnapshot(aircraft, receiverLat, receiverLon)
    })

    socket.on('aircraft:diff', ({ updated, removed }) => {
      applyDiff(updated, removed)
    })

    socket.on('weather:update', data => {
      setWeather(data)
    })

    socket.on('stats:update', stats => {
      setStats(stats)
    })

    socket.on('disconnect', reason => {
      console.warn('[socket] Disconnected:', reason)
    })

    return () => {
      socket.disconnect()
    }
  }, [setSnapshot, applyDiff, setWeather, setStats])

  return socketRef
}