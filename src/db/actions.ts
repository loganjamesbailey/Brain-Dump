import { db, newId, type Dump, type Item, type Profile, type Suggestion } from './db'
import { detectTimezone } from '../lib/time'

export async function getProfile(): Promise<Profile | undefined> {
  return db.profile.get('me')
}

export async function createProfile(name: string): Promise<Profile> {
  const profile: Profile = {
    id: 'me',
    name: name.trim(),
    createdAt: Date.now(),
    timezone: detectTimezone(),
  }
  await db.profile.put(profile)
  return profile
}

export async function completeOnboarding(): Promise<void> {
  await db.profile.update('me', { onboardedAt: Date.now() })
}

export interface SaveDumpInput {
  transcript: string
  kind: Dump['kind']
  durationMs?: number
  audio?: Blob
  audioType?: string
  suggestions: Suggestion[]
}

export async function saveDump(input: SaveDumpInput): Promise<string> {
  const id = newId('d')
  const dump: Dump = {
    id,
    createdAt: Date.now(),
    kind: input.kind,
    transcript: input.transcript,
    durationMs: input.durationMs,
    audio: input.audio,
    audioType: input.audioType,
    suggestions: input.suggestions,
  }
  await db.dumps.put(dump)
  return id
}

/**
 * Apply the suggestions the user accepted. Anything not accepted is ignored;
 * anything not mentioned in the dump was never a suggestion, so it's untouched.
 */
export async function applySuggestions(
  dumpId: string,
  suggestions: Suggestion[],
): Promise<{ added: number; updated: number }> {
  let added = 0
  let updated = 0
  const now = Date.now()

  await db.transaction('rw', db.items, db.dumps, async () => {
    for (const s of suggestions) {
      if (!s.accepted) continue

      if (s.kind === 'add') {
        const item: Item = {
          id: newId('i'),
          title: s.title,
          area: s.area,
          cadence: s.cadence,
          status: 'active',
          createdAt: now,
          updatedAt: now,
          sourceDumpId: dumpId,
          history: [{ at: now, kind: 'created', to: s.cadence, dumpId }],
        }
        await db.items.put(item)
        added++
      } else if (s.kind === 'update') {
        const item = await db.items.get(s.itemId)
        if (!item) continue
        item.cadence = s.to as Item['cadence']
        item.updatedAt = now
        item.history.push({ at: now, kind: 'cadence', from: s.from, to: s.to, dumpId })
        await db.items.put(item)
        updated++
      }
    }

    // Record what was reviewed, keeping the accepted/declined state for the audit trail.
    await db.dumps.update(dumpId, { reviewedAt: now, suggestions })
  })

  return { added, updated }
}

export async function updateItem(id: string, patch: Partial<Item>): Promise<void> {
  await db.items.update(id, { ...patch, updatedAt: Date.now() })
}

export async function setItemStatus(id: string, status: Item['status']): Promise<void> {
  const item = await db.items.get(id)
  if (!item) return
  item.status = status
  item.updatedAt = Date.now()
  item.history.push({ at: Date.now(), kind: 'status', to: status })
  await db.items.put(item)
}
