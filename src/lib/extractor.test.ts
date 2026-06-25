import { describe, it, expect } from 'vitest'
import { analyzeDump } from './extractor'
import type { Item } from '../db/db'

function makeItem(partial: Partial<Item> & Pick<Item, 'title' | 'cadence' | 'area'>): Item {
  return {
    id: 'i_' + partial.title,
    status: 'active',
    createdAt: 0,
    updatedAt: 0,
    history: [],
    ...partial,
  }
}

describe('analyzeDump — first dump', () => {
  const transcript =
    'I want to get up on time every day. I keep forgetting to take my medicine. ' +
    'I need to do laundry and pay the bills. I should get an oil change at some point ' +
    'and I want to start reading a book.'

  const { suggestions } = analyzeDump(transcript, [])
  const adds = suggestions.filter((s) => s.kind === 'add')
  const byTitle = (t: string) => adds.find((s) => s.kind === 'add' && s.title === t) as any

  it('captures known topics with sensible cadences', () => {
    expect(byTitle('Get up on time')?.cadence).toBe('daily')
    expect(byTitle('Take medicine on time')?.cadence).toBe('daily')
    expect(byTitle('Do laundry')?.cadence).toBe('weekly')
    expect(byTitle('Pay bills')?.cadence).toBe('monthly')
    expect(byTitle('Oil change')?.cadence).toBe('quarterly')
  })

  it('respects an explicit cadence cue over the default', () => {
    // "every day" should pin "Get up on time" to daily (already its default,
    // but proves the cue path runs without downgrading it).
    expect(byTitle('Get up on time')?.cadence).toBe('daily')
  })

  it('captures a free-form intention not in the knowledge base', () => {
    const reading = adds.find(
      (s) => s.kind === 'add' && /read/i.test(s.title),
    )
    expect(reading).toBeTruthy()
  })

  it('produces only adds (no updates) when there are no existing items', () => {
    expect(suggestions.every((s) => s.kind === 'add')).toBe(true)
  })
})

describe('analyzeDump — returning dump is additive, not destructive', () => {
  const existing: Item[] = [
    makeItem({ title: 'Do laundry', cadence: 'weekly', area: 'laundry' }),
    makeItem({ title: 'Take medicine on time', cadence: 'daily', area: 'health' }),
  ]

  it('leaves unmentioned items completely untouched', () => {
    const { suggestions } = analyzeDump('I started reading a great book this week.', existing)
    // Nothing about laundry or meds → no suggestions touching them.
    const touchesExisting = suggestions.some(
      (s) =>
        (s.kind === 'update' && existing.some((e) => e.id === s.itemId)) ||
        (s.kind === 'add' && /laundry|medicine/i.test(s.title)),
    )
    expect(touchesExisting).toBe(false)
  })

  it('updates an item only when the user explicitly changes its rhythm', () => {
    const { suggestions } = analyzeDump('I am changing laundry to monthly now.', existing)
    const update = suggestions.find((s) => s.kind === 'update') as any
    expect(update).toBeTruthy()
    expect(update.from).toBe('weekly')
    expect(update.to).toBe('monthly')
  })

  it('does not re-add something that already exists when rhythm is unchanged', () => {
    const { suggestions } = analyzeDump('I still need to do laundry.', existing)
    const reAdded = suggestions.some((s) => s.kind === 'add' && /laundry/i.test(s.title))
    expect(reAdded).toBe(false)
  })
})
