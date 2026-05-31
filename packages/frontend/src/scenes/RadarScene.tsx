// packages/frontend/src/scenes/RadarScene.tsx

import { useRef, useEffect, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
// @ts-ignore (no types for maplibre-gl-geocoder yet)
import 'maplibre-gl/dist/maplibre-gl.css'
import { useAircraftStore } from '../store/aircraftStore.js'
import { useInterpolation, type InterpolatedPosition } from '../hooks/useInterpolation.js'
import { useFitBounds } from '../hooks/useFitBounds.js'
import { altitudeColor } from '../lib/format.js'

const AIRCRAFT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <path d="M16 2 L19 14 L30 18 L30 21 L19 19 L18 26 L21 28 L21 30 L16 29 L11 30 L11 28 L14 26 L13 19 L2 21 L2 18 L13 14 Z"
    fill="white" stroke="rgba(0,0,0,0.5)" stroke-width="1"/>
</svg>`

function svgToDataUri(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

export function RadarScene() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<maplibregl.Map | null>(null)
  const mapReadyRef  = useRef(false)

  // Keep latest interpolated positions in a ref so useFitBounds
  // can read them without needing to be inside the rAF loop
  const positionsRef = useRef<InterpolatedPosition[]>([])

  const { receiverLat, receiverLon } = useAircraftStore()

  // --- Map initialisation (unchanged) ---
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          protomaps: {
            type: 'vector',
            url: 'https://api.protomaps.com/tiles/v3.json?key=d02babd5bdd563d0',
            attribution: '© Protomaps, © OpenStreetMap',
          },
        },
        glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
        layers: buildDarkStyle(),
      },
      center: [receiverLon, receiverLat],
      zoom: 8,
      interactive: false,
      attributionControl: false,
      preserveDrawingBuffer: true,
    })

    map.on('load', () => {
      const img = new Image(32, 32)
      img.onload = () => {
        map.addImage('aircraft-icon', img, { sdf: true })
        addAircraftLayers(map)
        addReceiverMarker(map, receiverLat, receiverLon)
        mapReadyRef.current = true
      }
      img.src = svgToDataUri(AIRCRAFT_SVG)
    })

    mapRef.current = map
    return () => {
      mapReadyRef.current = false
      map.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Interpolation loop (60fps map updates) ---
  const onFrame = useCallback((positions: InterpolatedPosition[]) => {
    const map = mapRef.current
    if (!map || !mapReadyRef.current) return

    // Keep ref fresh for useFitBounds
    positionsRef.current = positions

    const aircraftSource = map.getSource('aircraft') as maplibregl.GeoJSONSource | undefined
    const trailSource    = map.getSource('aircraft-trails') as maplibregl.GeoJSONSource | undefined
    if (!aircraftSource || !trailSource) return

    aircraftSource.setData({
      type: 'FeatureCollection',
      features: positions.map(a => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [a.lon, a.lat] },
        properties: {
          icao:   a.icao,
          flight: a.flight ?? a.icao.toUpperCase(),
          track:  a.trackDeg,
          color:  altitudeColor(a.altitudeFt),
        },
      })),
    })

    trailSource.setData({
      type: 'FeatureCollection',
      features: positions
        .filter(a => a.positionHistory.length > 1)
        .map(a => {
          const coords = a.positionHistory.map(p => [p.lon, p.lat])
          coords.push([a.lon, a.lat])
          return {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
            properties: {},
          }
        }),
    })
  }, [])

  useInterpolation(onFrame)

  // --- Auto-fit bounds every 15s ---
  // Stable callback — reads from ref so it never causes the hook to restart
  const getPositions = useCallback(() => positionsRef.current, [])

  useFitBounds(mapRef, mapReadyRef, getPositions, receiverLat, receiverLon, {
    intervalMs:  15_000,
    padding:     80,
    animationMs: 2_000,
    minZoom:     6,
  })

  return (
    <div className="scene-container">
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      <div style={{
        position: 'absolute', top: 24, left: 24,
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        opacity: 0.8,
      }}>
        <div className="glow-green">
          {positionsRef.current.length} aircraft
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 48, right: 24,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.08em',
        textAlign: 'right',
      }}>
        <AltitudeLegend />
      </div>
    </div>
  )
}

function AltitudeLegend() {
  const bands = [
    { label: '> FL400',   color: 'var(--color-alt-vhigh)' },
    { label: 'FL200–400', color: 'var(--color-alt-high)'  },
    { label: 'FL050–200', color: 'var(--color-alt-mid)'   },
    { label: '< FL050',   color: 'var(--color-alt-low)'   },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {bands.map(b => (
        <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>{b.label}</span>
          <div style={{ width: 12, height: 3, borderRadius: 1.5, background: b.color }} />
        </div>
      ))}
    </div>
  )
}

// All MapLibre helper functions unchanged from before
function addAircraftLayers(map: maplibregl.Map): void {
  map.addSource('aircraft-trails', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  map.addSource('aircraft', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  map.addLayer({
    id: 'aircraft-trails', type: 'line', source: 'aircraft-trails',
    paint: { 'line-color': 'rgba(0, 255, 136, 0.25)', 'line-width': 1, 'line-blur': 0.5 },
  })
  map.addLayer({
    id: 'aircraft-dots', type: 'circle', source: 'aircraft',
    paint: {
      'circle-radius': 4,
      'circle-color': ['get', 'color'],
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(255,255,255,0.3)',
    },
  })
  map.addLayer({
    id: 'aircraft-icons', type: 'symbol', source: 'aircraft',
    layout: {
      'icon-image': 'aircraft-icon',
      'icon-size': 0.65,
      'icon-rotate': ['get', 'track'],
      'icon-rotation-alignment': 'map',
      'icon-allow-overlap': true,
    },
    paint: {
      'icon-color': ['get', 'color'],
      'icon-halo-color': 'rgba(0,0,0,0.6)',
      'icon-halo-width': 1,
    },
  })
  map.addLayer({
    id: 'aircraft-labels', type: 'symbol', source: 'aircraft', minzoom: 7,
    layout: {
      'text-field': ['get', 'flight'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 11,
      'text-offset': [0, 1.6],
      'text-anchor': 'top',
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': 'rgba(180, 220, 255, 0.85)',
      'text-halo-color': 'rgba(0,0,0,0.7)',
      'text-halo-width': 1,
    },
  })
}

function addReceiverMarker(map: maplibregl.Map, lat: number, lon: number): void {
  map.addSource('receiver', {
    type: 'geojson',
    data: { type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: {} },
  })
  map.addLayer({
    id: 'receiver-dot', type: 'circle', source: 'receiver',
    paint: {
      'circle-radius': 6,
      'circle-color': 'var(--color-accent)',
      'circle-stroke-width': 2,
      'circle-stroke-color': 'rgba(0, 255, 136, 0.4)',
    },
  })
}

function buildDarkStyle(): maplibregl.LayerSpecification[] {
  return [
    { id: 'background',  type: 'background', paint: { 'background-color': '#090e14' } },
    { id: 'water',       type: 'fill', source: 'protomaps', 'source-layer': 'water',      paint: { 'fill-color': '#0a1520' } },
    { id: 'land',        type: 'fill', source: 'protomaps', 'source-layer': 'earth',       paint: { 'fill-color': '#0d1826' } },
    { id: 'landuse',     type: 'fill', source: 'protomaps', 'source-layer': 'landuse',     paint: { 'fill-color': '#0e1c2e', 'fill-opacity': 0.5 } },
    { id: 'roads-minor', type: 'line', source: 'protomaps', 'source-layer': 'roads',       paint: { 'line-color': '#122030', 'line-width': 0.5 } },
    { id: 'roads-major', type: 'line', source: 'protomaps', 'source-layer': 'roads',       paint: { 'line-color': '#1a3050', 'line-width': 1 }, filter: ['>=', ['get', 'kind_detail'], 3] },
    { id: 'boundaries',  type: 'line', source: 'protomaps', 'source-layer': 'boundaries', paint: { 'line-color': '#1d3a5a', 'line-width': 0.5, 'line-dasharray': [3, 3] } },
    { id: 'places',      type: 'symbol', source: 'protomaps', 'source-layer': 'places', minzoom: 5,
      layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11 },
      paint: { 'text-color': '#2a5070', 'text-halo-color': 'rgba(0,0,0,0.5)', 'text-halo-width': 1 } },
  ] as maplibregl.LayerSpecification[]
}