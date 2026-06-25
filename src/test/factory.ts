import type { Item } from '../db/db'
import type { Cadence, LifeArea } from '../lib/cadence'

let n = 0

/** Build a test Item with sensible defaults. */
export function makeItem(overrides: Partial<Item> & { cadence?: Cadence; area?: LifeArea } = {}): Item {
  n += 1
  return {
    id: 'i_' + n,
    title: overrides.title ?? 'Item ' + n,
    area: overrides.area ?? 'other',
    cadence: overrides.cadence ?? 'daily',
    status: 'active',
    createdAt: 0,
    updatedAt: 0,
    history: [],
    ...overrides,
  }
}
