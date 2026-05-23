// packages/backend/src/services/adsb-poller.ts

import { readFile } from 'node:fs/promises'
import { EventEmitter } from 'node:events'
import type { ReadsbSnapshot } from '@adsb-display/shared'
import { config } from '../config.js'

// Typed event emitter so callers get IntelliSense on event payloads
interface AdsbPollerEvents {
  snapshot: [snapshot: ReadsbSnapshot]
  error: [error: Error]
}

export class AdsbPoller extends EventEmitter<AdsbPollerEvents> {
  private timer: NodeJS.Timeout | null = null
  private isReading = false

  start(): void {
    if (this.timer) return
    console.log(`[poller] Starting — reading ${config.adsbJsonPath} every ${config.pollIntervalMs}ms`)
    this.timer = setInterval(() => void this.poll(), config.pollIntervalMs)
    // Poll immediately on start so the first frame arrives without a 1s delay
    void this.poll()
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private async poll(): Promise<void> {
    // Guard against slow reads stacking up. If a read takes >1s (should never
    // happen on a local file, but the Pi SD card can be slow under load)
    // we skip this tick rather than queue work.
    if (this.isReading) return
    this.isReading = true

    try {
      const raw = await readFile(config.adsbJsonPath, 'utf-8')
      const data = JSON.parse(raw) as ReadsbSnapshot
      this.emit('snapshot', data)
    } catch (err) {
      // File not found on startup is normal — readsb may not be running yet
      const error = err instanceof Error ? err : new Error(String(err))
      this.emit('error', error)
    } finally {
      this.isReading = false
    }
  }
}