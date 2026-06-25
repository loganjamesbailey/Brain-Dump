import { describe, it, expect } from 'vitest'
import { buildBackup, encryptBackup, decryptBackup, parseImport, isValidBackup } from './backup'
import type { Dump, Profile } from '../db/db'
import { makeItem } from '../test/factory'

const profile: Profile = { id: 'me', name: 'Sam', createdAt: 1, timezone: 'UTC' }
const items = [makeItem({ title: 'Do laundry', cadence: 'weekly' })]
const dumps: Dump[] = [
  {
    id: 'd1',
    createdAt: 1,
    kind: 'initial',
    transcript: 'hello',
    audio: new Blob(['fake audio']),
    audioType: 'audio/webm',
    suggestions: [],
  },
]

describe('buildBackup', () => {
  it('includes data but strips audio blobs', () => {
    const backup = buildBackup(profile, items, dumps, 123)
    expect(backup.exportedAt).toBe(123)
    expect(backup.items).toHaveLength(1)
    expect(backup.dumps[0]).not.toHaveProperty('audio')
    expect(backup.dumps[0].transcript).toBe('hello')
  })
})

describe('encrypt / decrypt round trip', () => {
  it('decrypts back to the original with the right passphrase', async () => {
    const backup = buildBackup(profile, items, dumps, 123)
    const envelope = await encryptBackup(backup, 'open sesame')
    expect(envelope.enc).toBe('AES-GCM')
    expect(envelope.data).not.toContain('Sam')
    const restored = await decryptBackup(envelope, 'open sesame')
    expect(restored.profile?.name).toBe('Sam')
    expect(restored.items[0].title).toBe('Do laundry')
  })

  it('refuses a wrong passphrase', async () => {
    const envelope = await encryptBackup(buildBackup(profile, items, dumps, 1), 'correct')
    await expect(decryptBackup(envelope, 'wrong')).rejects.toThrow(/passphrase/i)
  })
})

describe('parseImport', () => {
  it('detects encrypted vs plain backups', async () => {
    const plain = JSON.stringify(buildBackup(profile, items, dumps, 1))
    expect(parseImport(plain).kind).toBe('plain')
    const enc = JSON.stringify(await encryptBackup(buildBackup(profile, items, dumps, 1), 'pw'))
    expect(parseImport(enc).kind).toBe('encrypted')
  })

  it('rejects files that are not Brain Dump backups', () => {
    expect(() => parseImport('{"hello":1}')).toThrow(/Brain Dump backup/i)
    expect(() => parseImport('not json')).toThrow()
  })
})

describe('isValidBackup', () => {
  it('accepts a well-formed backup', () => {
    expect(isValidBackup(buildBackup(profile, items, dumps, 1))).toBe(true)
  })
  it('rejects malformed or empty-shaped payloads', () => {
    expect(isValidBackup(null)).toBe(false)
    expect(isValidBackup({ app: 'brain-dump', v: 1 })).toBe(false) // missing arrays
    expect(isValidBackup({ app: 'other', v: 1, items: [], dumps: [] })).toBe(false)
    expect(isValidBackup({ app: 'brain-dump', v: 1, items: [{ nope: 1 }], dumps: [] })).toBe(false)
  })
})

describe('decryptBackup rejects an absurd iteration count (DoS guard)', () => {
  it('throws before doing the work when iter is out of range', async () => {
    const env = await encryptBackup(buildBackup(profile, items, dumps, 1), 'passphrase1')
    await expect(decryptBackup({ ...env, iter: 9_999_999_999 }, 'passphrase1')).rejects.toThrow(/invalid/i)
    await expect(decryptBackup({ ...env, iter: 10 }, 'passphrase1')).rejects.toThrow(/invalid/i)
  })
})
