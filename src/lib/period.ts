/**
 * Cadence timing — when is an item "due" again, and is it done for this period?
 *
 * Deliberately gentle: we use rolling windows, never red "overdue" states. An item
 * is simply "resting" (done for now) or "ready" (available to do). Nothing is late.
 */

import type { Cadence } from './cadence'
import type { Item } from '../db/db'

/** Length of one cadence period, in milliseconds. */
const DAY = 86_400_000
export const CADENCE_WINDOW_MS: Record<Cadence, number> = {
  daily: DAY,
  weekly: 7 * DAY,
  monthly: 30 * DAY,
  quarterly: 91 * DAY,
  biannual: 182 * DAY,
  annual: 365 * DAY,
  unsorted: Infinity, // one-offs: once done, they stay done until un-done
}

/** Has this item been completed within its current cadence window? */
export function isResting(item: Item, now: number): boolean {
  if (!item.lastDoneAt) return false
  if (item.cadence === 'unsorted') return true // sticky until un-done
  return now - item.lastDoneAt < CADENCE_WINDOW_MS[item.cadence]
}

/** Is the item currently snoozed (resting by the user's choice, no guilt)? */
export function isSnoozed(item: Item, now: number): boolean {
  return !!item.snoozedUntil && item.snoozedUntil > now
}

/** Ready means: active, not resting from a recent completion, not snoozed. */
export function isReady(item: Item, now: number): boolean {
  return item.status === 'active' && !isResting(item, now) && !isSnoozed(item, now)
}

/**
 * Was the previous completion still "on rhythm" — i.e. close enough to now that we
 * can count it as continued momentum rather than a fresh start? We allow up to two
 * windows of slack so a single slip never breaks the streak (no punishment).
 */
export function isOnRhythm(item: Item, now: number): boolean {
  if (!item.lastDoneAt) return false
  if (item.cadence === 'unsorted') return false
  return now - item.lastDoneAt <= CADENCE_WINDOW_MS[item.cadence] * 2
}
