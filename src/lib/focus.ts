/**
 * "Right now" focus selection.
 *
 * Picks a small, calm set of things that fit this moment — weighted by time of day
 * and how often the thing recurs. The point is to make the next step obvious without
 * showing the whole list. Pure and deterministic so it's easy to test.
 */

import type { Cadence, LifeArea } from './cadence'
import { isReady } from './period'
import type { Item } from '../db/db'

export type DayPart = 'morning' | 'midday' | 'evening' | 'night'

export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 17) return 'midday'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

/** Which life-areas feel timely in each part of the day. */
const TIME_AREAS: Record<DayPart, LifeArea[]> = {
  morning: ['morning', 'hygiene', 'health'],
  midday: ['errands', 'finance', 'work', 'home'],
  evening: ['laundry', 'home', 'health', 'people'],
  night: ['health', 'leisure'],
}

/** More frequent rhythms are more likely to be "a now thing". */
const CADENCE_WEIGHT: Record<Cadence, number> = {
  daily: 5,
  weekly: 3,
  monthly: 2,
  quarterly: 1,
  biannual: 1,
  annual: 1,
  unsorted: 2,
}

export function scoreForMoment(item: Item, part: DayPart): number {
  const areaBoost = TIME_AREAS[part].includes(item.area) ? 6 : 0
  return areaBoost + CADENCE_WEIGHT[item.cadence]
}

/**
 * Select up to `limit` ready items that best fit the moment.
 * Ties broken by oldest-untouched first (so nothing is perpetually ignored).
 */
export function selectFocus(items: Item[], now: number, limit: number): Item[] {
  const part = dayPart(new Date(now).getHours())
  return items
    .filter((i) => isReady(i, now))
    .map((item) => ({ item, score: scoreForMoment(item, part) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const aTouched = a.item.lastDoneAt ?? a.item.updatedAt
      const bTouched = b.item.lastDoneAt ?? b.item.updatedAt
      return aTouched - bTouched
    })
    .slice(0, Math.max(0, limit))
    .map((x) => x.item)
}
