// packages/backend/src/index.ts

import { createApp } from './server.js'
import { config } from './config.js'

async function main() {
  console.log('[startup] ADS-B Display backend starting...')
  console.log(`[startup] Receiver: ${config.receiverLat}, ${config.receiverLon}`)
  console.log(`[startup] ADS-B source: ${config.adsbJsonPath}`)

  const { httpServer, poller, weatherService } = await createApp()

  httpServer.listen(config.httpPort, () => {
    console.log(`[startup] HTTP + WebSocket listening on :${config.httpPort}`)
  })

  poller.start()
  weatherService.start()

  // Graceful shutdown — important on Pi where SIGTERM comes from systemd
  const shutdown = (signal: string) => {
    console.log(`[shutdown] Received ${signal}, shutting down cleanly...`)
    poller.stop()
    weatherService.stop()
    httpServer.close(() => {
      console.log('[shutdown] Server closed')
      process.exit(0)
    })
    // Force kill after 5s if server hangs
    setTimeout(() => process.exit(1), 5000).unref()
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch(err => {
  console.error('[fatal]', err)
  process.exit(1)
})