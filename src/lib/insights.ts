/**
 * The insight engine — a mild, humble read of the user's landscape.
 *
 * This is the on-device home of the "loosely figure out where someone falls and how
 * much structure they need" idea. It NEVER diagnoses and never judges. It notices
 * patterns (load, balance, rhythm) and chooses how densely to present things, so an
 * overwhelmed brain sees less and a settled one sees more. Everything stays a gentle
 * suggestion; the user is always in control.
 */

import { AREA_LABEL, CADENCE_ORDER, type Cadence, type LifeArea } from './cadence'
import { isReady, isResting } from './period'
import type { Item } from '../db/db'

export type PresentationMode = 'gentle-start' | 'one-anchor' | 'balanced'

export interface AreaLoad {
  area: LifeArea
  count: number
}

export interface Insight {
  totalActive: number
  areaLoad: AreaLoad[]
  busiestArea?: LifeArea
  cadenceCounts: Record<Cadence, number>
  unsortedCount: number
  dailyLoad: number
  readyCount: number
  restingCount: number
  /** The OT "how should it be shown" decision. */
  presentationMode: PresentationMode
  /** How many items the focus view should surface at once. */
  focusLimit: number
  /** A short supportive headline. */
  headline: string
  /** Up to three gentle, humble observations. */
  observations: string[]
}

function emptyCadenceCounts(): Record<Cadence, number> {
  return CADENCE_ORDER.reduce(
    (acc, c) => ((acc[c] = 0), acc),
    {} as Record<Cadence, number>,
  )
}

export function computeInsight(items: Item[], now: number): Insight {
  const active = items.filter((i) => i.status === 'active')
  const totalActive = active.length

  const areaMap = new Map<LifeArea, number>()
  const cadenceCounts = emptyCadenceCounts()
  for (const item of active) {
    areaMap.set(item.area, (areaMap.get(item.area) ?? 0) + 1)
    cadenceCounts[item.cadence] += 1
  }

  const areaLoad: AreaLoad[] = [...areaMap.entries()]
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count)

  const busiestArea = areaLoad[0]?.count >= 2 ? areaLoad[0].area : undefined
  const unsortedCount = cadenceCounts.unsorted
  const dailyLoad = cadenceCounts.daily
  const readyCount = active.filter((i) => isReady(i, now)).length
  const restingCount = active.filter((i) => isResting(i, now)).length

  let presentationMode: PresentationMode = 'balanced'
  if (totalActive <= 2) presentationMode = 'gentle-start'
  else if (dailyLoad >= 5 || readyCount >= 8) presentationMode = 'one-anchor'

  const focusLimit =
    presentationMode === 'one-anchor' ? 1 : presentationMode === 'gentle-start' ? 3 : 4

  const observations: string[] = []
  if (presentationMode === 'gentle-start') {
    observations.push("You've made a calm start. There's no rush to add more.")
  }
  if (presentationMode === 'one-anchor') {
    observations.push(
      "Your daily list is full — that's a lot to hold at once. Let's start with just one anchor.",
    )
  }
  if (unsortedCount > 0) {
    observations.push(
      `${unsortedCount} thing${unsortedCount === 1 ? '' : 's'} ${
        unsortedCount === 1 ? "doesn't" : "don't"
      } have a rhythm yet. When you're ready, we can give ${unsortedCount === 1 ? 'it' : 'them'} one.`,
    )
  }
  if (busiestArea && (areaMap.get(busiestArea) ?? 0) >= 3) {
    observations.push(
      `A good share of this is ${AREA_LABEL[busiestArea].toLowerCase()}. Worth noticing where your energy goes.`,
    )
  }
  if (restingCount >= 2 && observations.length < 3) {
    observations.push(`Nice — ${restingCount} things are already handled for now.`)
  }

  const headline =
    presentationMode === 'gentle-start'
      ? 'A calm beginning.'
      : presentationMode === 'one-anchor'
        ? "Let's keep it light today."
        : 'Here is your landscape — gently.'

  return {
    totalActive,
    areaLoad,
    busiestArea,
    cadenceCounts,
    unsortedCount,
    dailyLoad,
    readyCount,
    restingCount,
    presentationMode,
    focusLimit,
    headline,
    observations: observations.slice(0, 3),
  }
}
