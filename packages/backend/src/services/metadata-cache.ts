// packages/backend/src/services/metadata-cache.ts

import type { AircraftMeta, AircraftImage, AircraftRoute, RouteAirport } from '@adsb-display/shared'
import { config } from '../config.js'

type MetaCallback = (meta: AircraftMeta | null, image: AircraftImage | null) => void
type RouteCallback = (route: AircraftRoute | null) => void

export class MetadataCache {
  // Permanent RAM cache — survives for process lifetime
  private metaCache = new Map<string, AircraftMeta | null>()
  private imageCache = new Map<string, AircraftImage | null>()

  // Fetch queue — ICAOs waiting to be enriched
  private queue: Array<{ icao: string; callback: MetaCallback }> = []
  private activeFetches = 0
  private drainTimer: NodeJS.Timeout | null = null

  // Route cache — keyed by normalised callsign (e.g. "BAW123")
  private routeCache = new Map<string, AircraftRoute | null>()
  private routeQueue: Array<{ callsign: string; callback: RouteCallback }> = []
  private activeRouteFetches = 0
  private routeDrainTimer: NodeJS.Timeout | null = null

  enqueue(icao: string, callback: MetaCallback): void {
    // If already cached (even as null — meaning we tried and failed), serve immediately
    if (this.metaCache.has(icao)) {
      callback(this.metaCache.get(icao) ?? null, this.imageCache.get(icao) ?? null)
      return
    }

    // Debounce: on startup we might get 50 aircraft at once. Queue them and drain
    // after a short pause so we don't fire 50 concurrent HTTP requests.
    // Guard against the same ICAO being enqueued twice before its fetch completes.
    if (this.queue.some(q => q.icao === icao)) return
    this.queue.push({ icao, callback })

    if (this.drainTimer) clearTimeout(this.drainTimer)
    this.drainTimer = setTimeout(() => this.drain(), config.metaFetchDebounceMs)
  }

  private drain(): void {
    while (
      this.activeFetches < config.metaFetchConcurrency &&
      this.queue.length > 0
    ) {
      const item = this.queue.shift()
      if (!item) break
      this.activeFetches++
      void this.fetchOne(item.icao, item.callback).finally(() => {
        this.activeFetches--
        // Keep draining if items remain
        if (this.queue.length > 0) this.drain()
      })
    }
  }

  private async fetchOne(icao: string, callback: MetaCallback): Promise<void> {
    const [meta, image] = await Promise.all([
      this.fetchMeta(icao),
      this.fetchImage(icao),
    ])

    // Cache results (including null — so we don't retry failed lookups on every restart)
    this.metaCache.set(icao, meta)
    this.imageCache.set(icao, image)

    callback(meta, image)
  }

  private async fetchMeta(icao: string): Promise<AircraftMeta | null> {
    try {
      const url = `https://api.adsbdb.com/v0/aircraft/${icao.toUpperCase()}`
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })

      if (!res.ok) return null

      const json = await res.json() as {
        response?: {
          aircraft?: {
            registration?: string
            type?: string
            manufacturer?: string
            registered_owner?: string
            registered_owner_operator_flag_code?: string
            registered_owner_icao_type_code?: string
            country_iso_name?: string
            year?: string
          }
        }
      }

      const a = json.response?.aircraft
      if (!a) return null

      return {
        icao,
        registration: a.registration ?? null,
        typeCode: a.registered_owner_icao_type_code ?? null,
        typeName: a.type ?? null,
        operatorName: a.registered_owner ?? null,
        operatorIata: a.registered_owner_operator_flag_code ?? null,
        operatorIcao: null,
        countryIso: a.country_iso_name ?? null,
        built: a.year ?? null,
      }
    } catch {
      return null
    }
  }

  private async fetchImage(icao: string): Promise<AircraftImage | null> {
    try {
      const url = `https://api.planespotters.net/pub/photos/hex/${icao.toUpperCase()}`
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })

      if (!res.ok) return null

      const json = await res.json() as {
        photos?: Array<{
          thumbnail_large?: { src?: string }
          thumbnail?: { src?: string }
          photographer?: string
          license?: string
        }>
      }

      const photo = json.photos?.[0]
      if (!photo) return null

      const url_ = photo.thumbnail_large?.src ?? photo.thumbnail?.src
      if (!url_) return null

      return {
        url: url_,
        thumbnailUrl: photo.thumbnail?.src ?? url_,
        photographer: photo.photographer ?? 'Unknown',
        license: photo.license ?? '',
      }
    } catch {
      return null
    }
  }

  // ── Route lookup ──────────────────────────────────────────────────────────

  enqueueRoute(callsign: string, callback: RouteCallback): void {
    const key = callsign.toUpperCase().trim()
    if (!key) return

    if (this.routeCache.has(key)) {
      callback(this.routeCache.get(key) ?? null)
      return
    }

    // Don't enqueue the same callsign twice while a fetch is in-flight
    if (this.routeQueue.some(q => q.callsign === key)) return
    this.routeQueue.push({ callsign: key, callback })

    if (this.routeDrainTimer) clearTimeout(this.routeDrainTimer)
    this.routeDrainTimer = setTimeout(() => this.drainRoutes(), config.metaFetchDebounceMs)
  }

  private drainRoutes(): void {
    while (
      this.activeRouteFetches < config.metaFetchConcurrency &&
      this.routeQueue.length > 0
    ) {
      const item = this.routeQueue.shift()
      if (!item) break
      this.activeRouteFetches++
      void this.fetchOneRoute(item.callsign, item.callback).finally(() => {
        this.activeRouteFetches--
        if (this.routeQueue.length > 0) this.drainRoutes()
      })
    }
  }

  private async fetchOneRoute(callsign: string, callback: RouteCallback): Promise<void> {
    const route = await this.fetchRoute(callsign)
    this.routeCache.set(callsign, route)
    callback(route)
  }

  private async fetchRoute(callsign: string): Promise<AircraftRoute | null> {
    try {
      const url = `https://api.adsbdb.com/v0/callsign/${encodeURIComponent(callsign)}`
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) return null

      const json = await res.json() as {
        response?: {
          flightroute?: {
            callsign?: string
            origin?: {
              iata_code?: string
              icao_code?: string
              name?: string
              municipality?: string
              country_iso_name?: string
            }
            destination?: {
              iata_code?: string
              icao_code?: string
              name?: string
              municipality?: string
              country_iso_name?: string
            }
          }
        }
      }

      const fr = json.response?.flightroute
      if (!fr) return null

      const toAirport = (a: typeof fr.origin): RouteAirport | null => {
        if (!a?.iata_code) return null
        return {
          iataCode: a.iata_code,
          icaoCode: a.icao_code ?? '',
          name: a.name ?? '',
          municipality: a.municipality ?? '',
          countryIso: a.country_iso_name ?? '',
        }
      }

      return {
        callsign,
        origin: toAirport(fr.origin),
        destination: toAirport(fr.destination),
      }
    } catch {
      return null
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  stats() {
    return {
      cachedMeta: this.metaCache.size,
      cachedImages: this.imageCache.size,
      cachedRoutes: this.routeCache.size,
      queueLength: this.queue.length,
      routeQueueLength: this.routeQueue.length,
      activeFetches: this.activeFetches,
    }
  }
}