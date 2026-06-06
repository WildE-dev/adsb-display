// packages/frontend/src/hooks/useFitBounds.ts

import { useEffect, useRef } from 'react'
import type maplibregl from 'maplibre-gl'
import type { InterpolatedPosition } from './useInterpolation.js'

interface UseFitBoundsOptions {
  // How often to recalculate and animate to new bounds (ms)
  intervalMs?: number
  // Padding in pixels around the bounding box
  padding?: number
  // Animation duration (ms)
  animationMs?: number
  // Don't zoom in closer than this level (prevents over-zoom with 1-2 aircraft)
  minZoom?: number
}

export function useFitBounds(
  mapRef: React.RefObject<maplibregl.Map | null>,
  mapReadyRef: React.RefObject<boolean>,
  getPositions: () => InterpolatedPosition[],
  receiverLat: number,
  receiverLon: number,
  options: UseFitBoundsOptions = {}
): void {
  const {
    intervalMs = 15_000,
    padding = 80,
    animationMs = 2000,
    minZoom = 6,
  } = options

  useEffect(() => {
    const fit = (animate: boolean) => {
      const map = mapRef.current
      if (!map || !mapReadyRef.current) return

      const positions = getPositions().filter(
        p =>
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lon) &&
          p.lat !== 0 &&
          p.lon !== 0
      )

      // Always include the receiver location so it's never off-screen
      const lats = [receiverLat, ...positions.map(p => p.lat)]
      const lons = [receiverLon, ...positions.map(p => p.lon)]

      if (lats.length < 2) return

      const minLat = Math.min(...lats)
      const maxLat = Math.max(...lats)
      const minLon = Math.min(...lons)
      const maxLon = Math.max(...lons)

      // Ignore degenerate bounds (all aircraft at same point)
      if (maxLat - minLat < 0.001 && maxLon - minLon < 0.001) return

      if (!animate) {
        map.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding, minZoom, duration: 0 })
        return
      }

      // Use easeTo instead of fitBounds for animated transitions — fitBounds
      // uses flyTo internally which arcs through a zoomed-out state first.
      // easeTo interpolates center+zoom directly with no zoom-out detour.
      const canvas = map.getCanvas()
      const availW = canvas.width / devicePixelRatio - padding * 2
      const availH = canvas.height / devicePixelRatio - padding * 2
      if (availW <= 0 || availH <= 0) return

      const centerLat = (minLat + maxLat) / 2
      const centerLon = (minLon + maxLon) / 2

      // Mercator width/height of the bounds in degrees
      const spanLon = maxLon - minLon
      // Latitude scaling: account for Mercator distortion at the center latitude
      const latRad = (centerLat * Math.PI) / 180
      const spanLatMerc = (maxLat - minLat) / Math.cos(latRad)

      // Tile size 512, zoom 0 covers 360° longitude across 512px
      const zoomForLon = Math.log2((availW / 512) * (360 / spanLon))
      const zoomForLat = Math.log2((availH / 512) * (360 / spanLatMerc))
      const targetZoom = Math.max(minZoom, Math.min(zoomForLon, zoomForLat))

      map.easeTo({
        center: [centerLon, centerLat],
        zoom: targetZoom,
        duration: animationMs,
        easing: (t: number) => t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2,
      })
    }

    // Fit immediately on mount (no animation — map just loaded)
    const initTimer = setTimeout(() => fit(false), 500)

    // Re-fit on a regular interval with smooth animation
    const intervalTimer = setInterval(() => fit(true), intervalMs)

    return () => {
      clearTimeout(initTimer)
      clearInterval(intervalTimer)
    }
  }, [mapRef, mapReadyRef, getPositions, receiverLat, receiverLon,
    intervalMs, padding, animationMs, minZoom])
}