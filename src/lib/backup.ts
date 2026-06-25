/**
 * Backup & restore. Everything stays the user's: an export is a single file they can
 * drop into iCloud Drive (or anywhere) via the share sheet, and import to restore or
 * move devices. Optionally encrypted with a passphrase (AES-GCM + PBKDF2) so a backup
 * sitting in the cloud is unreadable without it.
 *
 * Audio blobs are intentionally excluded — they stay on-device. Transcripts and the
 * structured map (the real value) are included.
 */

import type { Dump, Item, Profile } from '../db/db'

export interface BackupData {
  app: 'brain-dump'
  v: 1
  exportedAt: number
  profile: Profile | null
  items: Item[]
  dumps: Array<Omit<Dump, 'audio'>>
}

export interface EncryptedEnvelope {
  app: 'brain-dump'
  v: 1
  enc: 'AES-GCM'
  kdf: 'PBKDF2-SHA256'
  iter: number
  salt: string
  iv: string
  data: string
}

const PBKDF2_ITERATIONS = 150_000

function getCrypto(): Crypto {
  const c = (globalThis as any).crypto as Crypto | undefined
  if (!c?.subtle) throw new Error('Secure crypto is not available in this environment.')
  return c
}

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64)
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i)
  return bytes
}

/** Build the plain backup object (audio stripped). */
export function buildBackup(
  profile: Profile | null,
  items: Item[],
  dumps: Dump[],
  exportedAt: number,
): BackupData {
  return {
    app: 'brain-dump',
    v: 1,
    exportedAt,
    profile,
    items,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dumps: dumps.map(({ audio, ...rest }) => rest),
  }
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const crypto = getCrypto()
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptBackup(
  data: BackupData,
  passphrase: string,
): Promise<EncryptedEnvelope> {
  const crypto = getCrypto()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS)
  const plaintext = new TextEncoder().encode(JSON.stringify(data))
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    plaintext as unknown as BufferSource,
  )
  return {
    app: 'brain-dump',
    v: 1,
    enc: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iter: PBKDF2_ITERATIONS,
    salt: bufToB64(salt),
    iv: bufToB64(iv),
    data: bufToB64(cipher),
  }
}

export async function decryptBackup(
  envelope: EncryptedEnvelope,
  passphrase: string,
): Promise<BackupData> {
  const crypto = getCrypto()
  const salt = b64ToBytes(envelope.salt)
  const iv = b64ToBytes(envelope.iv)
  const key = await deriveKey(passphrase, salt, envelope.iter || PBKDF2_ITERATIONS)
  let plain: ArrayBuffer
  try {
    plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      b64ToBytes(envelope.data) as unknown as BufferSource,
    )
  } catch {
    throw new Error('That passphrase did not unlock this backup.')
  }
  return JSON.parse(new TextDecoder().decode(plain)) as BackupData
}

export type ParsedImport =
  | { kind: 'plain'; data: BackupData }
  | { kind: 'encrypted'; envelope: EncryptedEnvelope }

/** Inspect an import file's text and tell us whether it needs a passphrase. */
export function parseImport(text: string): ParsedImport {
  let obj: any
  try {
    obj = JSON.parse(text)
  } catch {
    throw new Error("That file isn't a Brain Dump backup.")
  }
  if (obj?.app !== 'brain-dump') throw new Error("That file isn't a Brain Dump backup.")
  if (obj.enc === 'AES-GCM') return { kind: 'encrypted', envelope: obj as EncryptedEnvelope }
  if (Array.isArray(obj.items)) return { kind: 'plain', data: obj as BackupData }
  throw new Error('This backup looks incomplete.')
}
