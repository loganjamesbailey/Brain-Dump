import Dexie, { type Table } from 'dexie'
import type { Cadence, LifeArea } from '../lib/cadence'

/**
 * Everything lives on-device in IndexedDB. Nothing leaves the phone.
 */

export interface Profile {
  id: 'me'
  name: string
  createdAt: number
  timezone: string
  onboardedAt?: number
}

export type ItemStatus = 'active' | 'snoozed' | 'done' | 'archived'

export interface ChangeEntry {
  at: number
  kind: 'created' | 'cadence' | 'title' | 'area' | 'status' | 'note' | 'done' | 'nextStep'
  from?: string
  to?: string
  dumpId?: string
}

export interface Item {
  id: string
  title: string
  area: LifeArea
  cadence: Cadence
  status: ItemStatus
  /** The next, smallest concrete step — OT's antidote to overwhelm. */
  nextStep?: string
  note?: string
  createdAt: number
  updatedAt: number
  sourceDumpId?: string
  history: ChangeEntry[]
  /** Stable identity of the knowledge-base topic this came from (survives renames). */
  topicKey?: string
  /** When this was last marked done — drives the gentle per-cadence reset. */
  lastDoneAt?: number
  /** Consecutive on-rhythm completions. Only ever shown as positive encouragement. */
  momentum?: number
  /** If set and in the future, the item rests (no guilt) until then. */
  snoozedUntil?: number
}

/** What a brain dump proposes — the user confirms before anything changes. */
export type Suggestion =
  | {
      kind: 'add'
      tempId: string
      title: string
      area: LifeArea
      cadence: Cadence
      /** Stable topic identity, when this add came from a known topic. */
      key?: string
      raw: string
      accepted?: boolean
    }
  | {
      kind: 'update'
      itemId: string
      field: 'cadence'
      from: string
      to: string
      title: string
      raw: string
      accepted?: boolean
    }

export type DumpKind = 'initial' | 'update'

export interface Dump {
  id: string
  createdAt: number
  kind: DumpKind
  transcript: string
  durationMs?: number
  /** Recorded audio kept as the source of truth, even if transcription stutters. */
  audio?: Blob
  audioType?: string
  suggestions: Suggestion[]
  /** Set once the user has reviewed the suggestions. */
  reviewedAt?: number
}

class BrainDumpDB extends Dexie {
  profile!: Table<Profile, string>
  items!: Table<Item, string>
  dumps!: Table<Dump, string>

  constructor() {
    super('brain-dump')
    this.version(1).stores({
      profile: 'id',
      items: 'id, cadence, area, status, updatedAt',
      dumps: 'id, createdAt, kind',
    })
  }
}

export const db = new BrainDumpDB()

export function newId(prefix = 'i'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}
