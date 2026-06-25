import { describe, it, expect } from 'vitest'
import { dayPart, scoreForMoment, selectFocus } from './focus'
import { makeItem } from '../test/factory'

// Build times in LOCAL tz so dayPart is stable regardless of the runner's timezone.
const morning = new Date(2023, 0, 2, 8, 0, 0).getTime()

describe('dayPart', () => {
  it('maps hours to parts', () => {
    expect(dayPart(7)).toBe('morning')
    expect(dayPart(13)).toBe('midday')
    expect(dayPart(19)).toBe('evening')
    expect(dayPart(23)).toBe('night')
    expect(dayPart(2)).toBe('night')
  })
})

describe('scoreForMoment', () => {
  it('boosts items in a timely life-area', () => {
    const hygiene = makeItem({ area: 'hygiene', cadence: 'daily' })
    const finance = makeItem({ area: 'finance', cadence: 'daily' })
    expect(scoreForMoment(hygiene, 'morning')).toBeGreaterThan(scoreForMoment(finance, 'morning'))
  })
})

describe('selectFocus', () => {
  it('surfaces morning-relevant items first and respects the limit', () => {
    const items = [
      makeItem({ area: 'finance', cadence: 'monthly', title: 'Bills' }),
      makeItem({ area: 'hygiene', cadence: 'daily', title: 'Shower' }),
      makeItem({ area: 'morning', cadence: 'daily', title: 'Get up' }),
    ]
    const picked = selectFocus(items, morning, 2)
    expect(picked).toHaveLength(2)
    expect(picked.map((i) => i.area)).not.toContain('finance')
  })

  it('excludes resting and snoozed items', () => {
    const items = [
      makeItem({ area: 'morning', cadence: 'daily', lastDoneAt: morning - 1000 }), // resting
      makeItem({ area: 'morning', cadence: 'daily', snoozedUntil: morning + 100000 }), // snoozed
      makeItem({ area: 'morning', cadence: 'daily', title: 'Ready one' }),
    ]
    const picked = selectFocus(items, morning, 5)
    expect(picked).toHaveLength(1)
    expect(picked[0].title).toBe('Ready one')
  })
})
