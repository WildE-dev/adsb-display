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
    intervalMs  = 15_000,
    padding     = 80,
    animationMs = 2000,
    minZoom     = 6,
  } = options

  // Track last known aircraft count so we can re-fit immediately
  // when a large number of aircraft appear or disappear
  const lastCountRef = useRef(0)

  useEffect(() => {
    const fit = (animate: boolean) => {
      const map = mapRef.current
      if (!map || !mapReadyRef.current) return

      const positions = getPositions()

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

      map.fitBounds(
        [[minLon, minLat], [maxLon, maxLat]],
        {
          padding,
          minZoom,
          duration: animate ? animationMs : 0,
          // Cubic ease-in-out — feels like a camera pan
          easing: (t: number) => t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2,
        }
      )

      lastCountRef.current = positions.length
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