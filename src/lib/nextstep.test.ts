import { describe, it, expect } from 'vitest'
import { suggestNextStep, hasSpecificNextStep } from './nextstep'

describe('suggestNextStep', () => {
  it('gives a concrete first step for known items', () => {
    expect(suggestNextStep('Do laundry')).toBe('Put one load in.')
    expect(suggestNextStep('Pay bills')).toMatch(/bill/i)
    expect(suggestNextStep('Oil change')).toMatch(/service|mileage/i)
  })

  it('falls back to a gentle generic for unknown items', () => {
    expect(hasSpecificNextStep('Reorganize the garage philosophy')).toBe(false)
    expect(suggestNextStep('Reorganize the garage philosophy')).toMatch(/tiny step/i)
  })
})
