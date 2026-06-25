import { db, newId, type Dump, type Item, type Profile, type Suggestion } from './db'
import { detectTimezone } from '../lib/time'
import { isOnRhythm } from '../lib/period'
import type { Cadence, LifeArea } from '../lib/cadence'
import { buildBackup, isValidBackup, type BackupData } from '../lib/backup'

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
  const now = Date.now()
  const existing = await db.profile.get('me')
  // Upsert: Table.update is a no-op when the row is missing (e.g. user skipped the
  // name), which would otherwise soft-lock them back into onboarding forever.
  if (existing) {
    await db.profile.update('me', { onboardedAt: now })
  } else {
    await db.profile.put({ id: 'me', name: '', createdAt: now, timezone: detectTimezone(), onboardedAt: now })
  }
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
    // Idempotency: never apply the same dump twice (no duplicate re-adds).
    const dump = await db.dumps.get(dumpId)
    if (dump?.reviewedAt) return

    for (const s of suggestions) {
      if (!s.accepted) continue

      if (s.kind === 'add') {
        const item: Item = {
          id: newId('i'),
          title: s.title,
          area: s.area,
          cadence: s.cadence,
          status: 'active',
          topicKey: s.key,
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

/** Mark an item done for its current cadence period; build gentle momentum. */
export async function markDone(id: string): Promise<void> {
  const item = await db.items.get(id)
  if (!item) return
  const now = Date.now()
  const continued = isOnRhythm(item, now)
  item.momentum = continued ? (item.momentum ?? 0) + 1 : 1
  item.lastDoneAt = now
  item.updatedAt = now
  item.history.push({ at: now, kind: 'done', to: String(item.momentum) })
  await db.items.put(item)
}

/** Undo a completion (e.g. tapped by accident). Momentum eases down, never punished. */
export async function markUndone(id: string): Promise<void> {
  const item = await db.items.get(id)
  if (!item) return
  const now = Date.now()
  item.lastDoneAt = undefined
  item.momentum = Math.max(0, (item.momentum ?? 0) - 1)
  item.history.push({ at: now, kind: 'done', from: 'done', to: 'undone' })
  item.updatedAt = now
  await db.items.put(item)
}

export async function snoozeItem(id: string, until: number): Promise<void> {
  await db.items.update(id, { snoozedUntil: until, updatedAt: Date.now() })
}

export async function unsnoozeItem(id: string): Promise<void> {
  await db.items.update(id, { snoozedUntil: undefined, updatedAt: Date.now() })
}

export async function archiveItem(id: string): Promise<void> {
  await setItemStatus(id, 'archived')
}

export async function restoreItem(id: string): Promise<void> {
  await setItemStatus(id, 'active')
}

export async function deleteItem(id: string): Promise<void> {
  await db.items.delete(id)
}

export interface ItemEdits {
  title?: string
  cadence?: Cadence
  area?: LifeArea
  nextStep?: string
}

/** Edit core fields, recording a gentle history entry per real change. */
export async function editItem(id: string, edits: ItemEdits): Promise<void> {
  const item = await db.items.get(id)
  if (!item) return
  const now = Date.now()
  if (edits.title !== undefined && edits.title.trim() && edits.title !== item.title) {
    item.history.push({ at: now, kind: 'title', from: item.title, to: edits.title })
    item.title = edits.title.trim()
  }
  if (edits.cadence !== undefined && edits.cadence !== item.cadence) {
    item.history.push({ at: now, kind: 'cadence', from: item.cadence, to: edits.cadence })
    item.cadence = edits.cadence
  }
  if (edits.area !== undefined && edits.area !== item.area) {
    item.history.push({ at: now, kind: 'area', from: item.area, to: edits.area })
    item.area = edits.area
  }
  if (edits.nextStep !== undefined && edits.nextStep !== item.nextStep) {
    item.history.push({ at: now, kind: 'nextStep', to: edits.nextStep })
    item.nextStep = edits.nextStep.trim() || undefined
  }
  item.updatedAt = now
  await db.items.put(item)
}

export async function updateName(name: string): Promise<void> {
  if (name.trim()) await db.profile.update('me', { name: name.trim() })
}

/** Gather everything for an export (audio excluded by buildBackup). */
export async function exportAll(exportedAt: number): Promise<BackupData> {
  const [profile, items, dumps] = await Promise.all([
    db.profile.get('me'),
    db.items.toArray(),
    db.dumps.toArray(),
  ])
  return buildBackup(profile ?? null, items, dumps, exportedAt)
}

/**
 * Restore from a backup, replacing current data. Validates the payload BEFORE
 * touching anything (no wiping on a bad/empty file), and preserves any on-device
 * audio for dumps that still exist by id (backups never carry audio).
 */
export async function importBackup(data: BackupData): Promise<void> {
  if (!isValidBackup(data)) {
    throw new Error('This backup looks incomplete, so nothing was changed.')
  }
  await db.transaction('rw', db.profile, db.items, db.dumps, async () => {
    // Keep existing audio blobs keyed by dump id so a restore doesn't destroy them.
    const existingDumps = await db.dumps.toArray()
    const audioById = new Map(existingDumps.filter((d) => d.audio).map((d) => [d.id, d]))

    await Promise.all([db.profile.clear(), db.items.clear(), db.dumps.clear()])
    if (data.profile) await db.profile.put(data.profile)
    if (data.items.length) await db.items.bulkPut(data.items)
    if (data.dumps.length) {
      const restored = data.dumps.map((d) => {
        const prior = audioById.get(d.id)
        return prior ? { ...d, audio: prior.audio, audioType: prior.audioType } : (d as Dump)
      })
      await db.dumps.bulkPut(restored as Dump[])
    }
  })
}

export async function wipeAll(): Promise<void> {
  await db.transaction('rw', db.profile, db.items, db.dumps, async () => {
    await Promise.all([db.profile.clear(), db.items.clear(), db.dumps.clear()])
  })
}
