import { describe, it, expect } from 'vitest'
import { computeInsight } from './insights'
import { makeItem } from '../test/factory'

const NOW = 1_700_000_000_000

describe('computeInsight presentation mode', () => {
  it('a tiny list is a gentle start', () => {
    const insight = computeInsight([makeItem(), makeItem()], NOW)
    expect(insight.presentationMode).toBe('gentle-start')
    expect(insight.focusLimit).toBe(3)
    expect(insight.observations.join(' ')).toMatch(/calm start/i)
  })

  it('a heavy daily load collapses to a single anchor', () => {
    const items = Array.from({ length: 6 }, (_, i) =>
      makeItem({ cadence: 'daily', title: 'D' + i }),
    )
    const insight = computeInsight(items, NOW)
    expect(insight.presentationMode).toBe('one-anchor')
    expect(insight.focusLimit).toBe(1)
    expect(insight.observations.join(' ')).toMatch(/one anchor/i)
  })

  it('a moderate, varied list is balanced', () => {
    const items = [
      makeItem({ cadence: 'daily' }),
      makeItem({ cadence: 'weekly' }),
      makeItem({ cadence: 'monthly' }),
    ]
    expect(computeInsight(items, NOW).presentationMode).toBe('balanced')
  })
})

describe('computeInsight observations', () => {
  it('notices items without a rhythm', () => {
    const items = [
      makeItem({ cadence: 'daily' }),
      makeItem({ cadence: 'unsorted' }),
      makeItem({ cadence: 'unsorted' }),
    ]
    const insight = computeInsight(items, NOW)
    expect(insight.unsortedCount).toBe(2)
    expect(insight.observations.join(' ')).toMatch(/rhythm yet/i)
  })

  it('ignores archived items in the counts', () => {
    const items = [makeItem(), makeItem({ status: 'archived' })]
    expect(computeInsight(items, NOW).totalActive).toBe(1)
  })

  it('caps observations at three', () => {
    const items = Array.from({ length: 6 }, () => makeItem({ cadence: 'unsorted', area: 'home' }))
    expect(computeInsight(items, NOW).observations.length).toBeLessThanOrEqual(3)
  })
})
