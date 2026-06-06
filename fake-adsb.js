#!/usr/bin/env node
// Generates a fake aircraft.json compatible with readsb format.
// Run: node fake-adsb.js [--output ./aircraft.json] [--lat 51.5] [--lon -0.12] [--count 20]

import { writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'

const { values: args } = parseArgs({
  options: {
    output: { type: 'string', default: './packages/backend/aircraft.json' },
    lat:    { type: 'string', default: process.env['RECEIVER_LAT'] },
    lon:    { type: 'string', default: process.env['RECEIVER_LON'] },
    count:  { type: 'string', default: '20' },
    interval: { type: 'string', default: '1000' },
  },
})

const RECEIVER_LAT = parseFloat(args.lat)
const RECEIVER_LON = parseFloat(args.lon)
const COUNT = parseInt(args.count)
const INTERVAL_MS = parseInt(args.interval)
const OUTPUT = args.output

const CALLSIGNS = [
  'DAL123', 'UAL456', 'AAL789', 'SWA321', 'BAW100',
  'DLH202', 'AFR303', 'KLM404', 'EZY505', 'RYR606',
  'FDX001', 'UPS002', 'N12345', 'WZZ707', 'IBE808',
  'TUI909', 'VIR010', 'EIN111', 'ANA212', 'JAL313',
]

const TYPES = ['B738', 'A320', 'B77W', 'A321', 'B739', 'A319', 'CRJ9', 'E175', 'B763', 'A332']
const CATEGORIES = ['A1', 'A2', 'A3', 'A4', 'A5']

function randBetween(min, max) {
  return Math.random() * (max - min) + min
}

function randInt(min, max) {
  return Math.floor(randBetween(min, max))
}

function randHex(len) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

// Generate initial aircraft states
const aircraft = Array.from({ length: COUNT }, (_, i) => {
  const alt = randInt(1000, 42000)
  const track = randBetween(0, 360)
  const trackRad = (track * Math.PI) / 180

  // Start within ~150km of receiver
  const spreadDeg = 1.5
  return {
    hex: randHex(6),
    flight: CALLSIGNS[i % CALLSIGNS.length].padEnd(8),
    r: `N${randInt(10000, 99999)}`,
    t: TYPES[randInt(0, TYPES.length)],
    lat: RECEIVER_LAT + randBetween(-spreadDeg, spreadDeg),
    lon: RECEIVER_LON + randBetween(-spreadDeg, spreadDeg),
    alt_baro: alt,
    alt_geom: alt + randInt(-100, 100),
    gs: randBetween(150, 550),
    track,
    baro_rate: randInt(-2000, 2000),
    squawk: String(randInt(1000, 7777)).padStart(4, '0'),
    category: CATEGORIES[randInt(0, CATEGORIES.length)],
    seen: randBetween(0, 5),
    seen_pos: randBetween(0, 5),
    messages: randInt(10, 500),
    rssi: randBetween(-30, -5),
    // Internal state (not in readsb schema but tracked for movement)
    _trackRad: trackRad,
  }
})

function moveAircraft(ac) {
  const now = Date.now() / 1000
  const dtSec = INTERVAL_MS / 1000

  const gs = typeof ac.gs === 'number' ? ac.gs : 300
  const distNm = gs * (dtSec / 3600)
  const distDeg = distNm / 60
  const cosLat = Math.cos(ac.lat * Math.PI / 180)
  ac.lat += Math.cos(ac._trackRad) * distDeg
  ac.lon += Math.sin(ac._trackRad) * distDeg / cosLat

  // Gentle track drift
  ac.track = (ac.track + randBetween(-1, 1) + 360) % 360
  ac._trackRad = (ac.track * Math.PI) / 180

  // Altitude change via baro_rate
  ac.alt_baro = Math.max(500, ac.alt_baro + ac.baro_rate * (dtSec / 60))
  ac.alt_geom = ac.alt_baro + randInt(-100, 100)
  // Level off near cruise
  if (ac.alt_baro > 38000) ac.baro_rate = Math.max(-500, ac.baro_rate - 100)
  if (ac.alt_baro < 2000)  ac.baro_rate = Math.min(500,  ac.baro_rate + 100)

  // Wrap aircraft back if they drift too far (> 3 degrees)
  const dLat = ac.lat - RECEIVER_LAT
  const dLon = ac.lon - RECEIVER_LON
  if (Math.abs(dLat) > 3 || Math.abs(dLon) > 3) {
    ac.lat = RECEIVER_LAT + randBetween(-1.5, 1.5)
    ac.lon = RECEIVER_LON + randBetween(-1.5, 1.5)
    ac.track = randBetween(0, 360)
    ac._trackRad = (ac.track * Math.PI) / 180
  }

  ac.seen = randBetween(0, 2)
  ac.seen_pos = randBetween(0, 2)
  ac.messages += randInt(1, 5)
  ac.rssi = randBetween(-30, -5)
}

async function writeFakeJson() {
  const now = Date.now() / 1000
  const snapshot = {
    now,
    messages: aircraft.reduce((sum, ac) => sum + ac.messages, 0),
    aircraft: aircraft.map(({ _trackRad, ...rest }) => rest),
  }
  await writeFile(OUTPUT, JSON.stringify(snapshot, null, 2))
}

console.log(`[fake-adsb] Writing ${COUNT} aircraft to ${OUTPUT} every ${INTERVAL_MS}ms`)
console.log(`[fake-adsb] Receiver at ${RECEIVER_LAT}, ${RECEIVER_LON}`)
console.log(`[fake-adsb] Press Ctrl+C to stop`)

// Write immediately, then on interval
await writeFakeJson()
setInterval(async () => {
  aircraft.forEach(moveAircraft)
  await writeFakeJson()
}, INTERVAL_MS)
