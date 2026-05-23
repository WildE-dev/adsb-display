// packages/frontend/src/store/statsStore.ts
import { create } from 'zustand'
import type { StatsEvent } from '@adsb-display/shared'

interface StatsStore {
  stats: StatsEvent | null
  setStats: (s: StatsEvent) => void
}

export const useStatsStore = create<StatsStore>(set => ({
  stats: null,
  setStats: stats => set({ stats }),
}))