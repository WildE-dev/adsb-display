// packages/backend/src/services/ws-broadcaster.ts

import { Server as SocketIOServer } from 'socket.io'
import type { Server as HttpServer } from 'node:http'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '@adsb-display/shared'
import type { StateManager } from './state-manager.js'
import type { WeatherService } from './weather-service.js'
import { config } from '../config.js'

export class WsBroadcaster {
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>

  constructor(
    httpServer: HttpServer,
    private stateManager: StateManager,
    private weatherService: WeatherService
  ) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.corsOrigins,
        methods: ['GET', 'POST'],
      },
      // Larger buffer for the initial aircraft:snapshot on Pi's slower CPU
      maxHttpBufferSize: 1e6,
    })

    this.setupSocketHandlers()
    this.setupServiceListeners()
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', socket => {
      console.log(`[ws] Client connected: ${socket.id}`)

      // Send full state immediately on connect
      socket.on('client:ready', () => {
        const aircraft = this.stateManager.getAll()
        const weather = this.weatherService.getCurrent()

        socket.emit('aircraft:snapshot', {
          timestamp: Date.now(),
          aircraft,
          receiverLat: config.receiverLat,
          receiverLon: config.receiverLon,
        })

        if (weather) {
          socket.emit('weather:update', weather)
        }

        socket.emit('stats:update', this.stateManager.getStats())
      })

      socket.on('disconnect', reason => {
        console.log(`[ws] Client disconnected: ${socket.id} (${reason})`)
      })
    })
  }

  private setupServiceListeners(): void {
    // Aircraft diffs — broadcast every tick if something changed
    this.stateManager.on('diff', (updated, removed) => {
      if (this.io.sockets.sockets.size === 0) return

      this.io.emit('aircraft:diff', {
        timestamp: Date.now(),
        updated,
        removed,
      })

      // Periodically push updated stats (every ~10 aircraft updates to avoid flooding)
      if (updated.length > 0) {
        this.io.emit('stats:update', this.stateManager.getStats())
      }
    })

    // Weather updates — push to all clients
    this.weatherService.on('update', data => {
      this.io.emit('weather:update', data)
    })
  }

  get connectedClients(): number {
    return this.io.sockets.sockets.size
  }
}