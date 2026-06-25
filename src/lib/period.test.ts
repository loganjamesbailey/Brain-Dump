import { describe, it, expect } from 'vitest'
import { isResting, isReady, isSnoozed, isOnRhythm, CADENCE_WINDOW_MS } from './period'
import { makeItem } from '../test/factory'

const NOW = 1_700_000_000_000
const DAY = 86_400_000

describe('isResting', () => {
  it('is false when never done', () => {
    expect(isResting(makeItem({ cadence: 'daily' }), NOW)).toBe(false)
  })
  it('rests within the cadence window and frees up after it', () => {
    const item = makeItem({ cadence: 'daily', lastDoneAt: NOW - 1000 })
    expect(isResting(item, NOW)).toBe(true)
    expect(isResting({ ...item, lastDoneAt: NOW - 2 * DAY }, NOW)).toBe(false)
  })
  it('weekly rests for a week', () => {
    expect(isResting(makeItem({ cadence: 'weekly', lastDoneAt: NOW - 3 * DAY }), NOW)).toBe(true)
    expect(isResting(makeItem({ cadence: 'weekly', lastDoneAt: NOW - 8 * DAY }), NOW)).toBe(false)
  })
  it('unsorted one-offs stay done once completed', () => {
    expect(isResting(makeItem({ cadence: 'unsorted', lastDoneAt: NOW - 999 * DAY }), NOW)).toBe(true)
  })
})

describe('isReady / isSnoozed', () => {
  it('ready when active, not resting, not snoozed', () => {
    expect(isReady(makeItem({ cadence: 'daily' }), NOW)).toBe(true)
  })
  it('not ready when archived', () => {
    expect(isReady(makeItem({ status: 'archived' }), NOW)).toBe(false)
  })
  it('snooze hides until its time passes', () => {
    const item = makeItem({ snoozedUntil: NOW + DAY })
    expect(isSnoozed(item, NOW)).toBe(true)
    expect(isReady(item, NOW)).toBe(false)
    expect(isSnoozed({ ...item, snoozedUntil: NOW - 1 }, NOW)).toBe(false)
  })
})

describe('isOnRhythm', () => {
  it('counts as continued within two windows, resets after', () => {
    const win = CADENCE_WINDOW_MS.daily
    expect(isOnRhythm(makeItem({ cadence: 'daily', lastDoneAt: NOW - win }), NOW)).toBe(true)
    expect(isOnRhythm(makeItem({ cadence: 'daily', lastDoneAt: NOW - 3 * win }), NOW)).toBe(false)
  })
})
