// packages/backend/src/server.ts

import { createServer } from 'node:http'
import express from 'express'
import { AdsbPoller } from './services/adsb-poller.js'
import { StateManager } from './services/state-manager.js'
import { MetadataCache } from './services/metadata-cache.js'
import { WeatherService } from './services/weather-service.js'
import { WsBroadcaster } from './services/ws-broadcaster.js'
import { config } from './config.js'

export async function createApp() {
  const app = express()
  const httpServer = createServer(app)

  // --- Services ---
  const stateManager = new StateManager()
  const metadataCache = new MetadataCache()
  const weatherService = new WeatherService()
  const poller = new AdsbPoller()
  const broadcaster = new WsBroadcaster(httpServer, stateManager, weatherService)

  // --- Wire poller → state manager ---
  poller.on('snapshot', snapshot => {
    stateManager.processSnapshot(snapshot)
  })

  poller.on('error', err => {
    // Log but don't crash — readsb may not be running during dev
    if (process.env['NODE_ENV'] !== 'production') {
      console.warn('[poller] Read error (normal in dev without readsb):', err.message)
    }
  })

  // --- Wire state manager → metadata cache ---
  stateManager.on('newAircraft', (icao, state) => {
    metadataCache.enqueue(icao, (meta, image) => {
      stateManager.updateMeta(icao, meta, image)
    })
    // If we already have the callsign on first sight, kick off a route lookup immediately
    if (state.flight) {
      metadataCache.enqueueRoute(state.flight, (route) => {
        stateManager.updateRoute(icao, route)
      })
    }
  })

  // Callsign arrived in a later message — fetch the route now
  stateManager.on('flightIdentified', (icao, flight) => {
    metadataCache.enqueueRoute(flight, (route) => {
      stateManager.updateRoute(icao, route)
    })
  })

  // --- Health endpoint ---
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      aircraft: stateManager.getAll().length,
      clients: broadcaster.connectedClients,
      cache: metadataCache.stats(),
    })
  })

  // In production, serve the built frontend from here
  if (process.env['NODE_ENV'] === 'production') {
    const { existsSync } = await import('node:fs')
    const frontendDist = new URL('../../frontend/dist', import.meta.url).pathname

    if (existsSync(frontendDist)) {
      const { default: sirv } = await import('sirv')
      app.use(sirv(frontendDist, { single: true }))
      console.log(`[server] Serving frontend from ${frontendDist}`)
    } else {
      console.warn(`[server] Frontend dist not found at ${frontendDist} — skipping static serving`)
      console.warn('[server] Run: npm run build -w packages/frontend')
    }
  }

  // --- Midnight stats reset ---
  scheduleMidnightReset(stateManager)

  return { app, httpServer, poller, weatherService }
}

function scheduleMidnightReset(stateManager: StateManager): void {
  const msUntilMidnight = () => {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    return midnight.getTime() - now.getTime()
  }

  const scheduleNext = () => {
    setTimeout(() => {
      console.log('[stats] Daily reset')
      stateManager.resetDailyStats()
      scheduleNext()
    }, msUntilMidnight())
  }

  scheduleNext()
}