import { create } from 'zustand'

export type View = 'loading' | 'onboarding' | 'dump' | 'review' | 'home'

interface AppState {
  view: View
  /** The dump currently being reviewed (drives the review screen). */
  reviewDumpId?: string
  /** Whether this is the user's very first dump (changes the tone). */
  firstDump: boolean
  go: (view: View) => void
  startReview: (dumpId: string) => void
  setFirstDump: (v: boolean) => void
}

export const useApp = create<AppState>((set) => ({
  view: 'loading',
  firstDump: false,
  go: (view) => set({ view }),
  startReview: (dumpId) => set({ view: 'review', reviewDumpId: dumpId }),
  setFirstDump: (firstDump) => set({ firstDump }),
}))
