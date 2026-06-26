import { create } from 'zustand'

export type View = 'loading' | 'onboarding' | 'dump' | 'review' | 'home' | 'item' | 'settings'

interface AppState {
  view: View
  /** The dump currently being reviewed (drives the review screen). */
  reviewDumpId?: string
  /** The item open in the detail screen. */
  selectedItemId?: string
  /** Whether this is the user's very first dump (changes the tone). */
  firstDump: boolean
  go: (view: View) => void
  startReview: (dumpId: string) => void
  openItem: (itemId: string) => void
  setFirstDump: (v: boolean) => void
}

export const useApp = create<AppState>((set) => ({
  view: 'loading',
  firstDump: false,
  go: (view) => set({ view }),
  startReview: (dumpId) => set({ view: 'review', reviewDumpId: dumpId }),
  openItem: (itemId) => set({ view: 'item', selectedItemId: itemId }),
  setFirstDump: (firstDump) => set({ firstDump }),
}))
