import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useApp } from '../store/store'
import { db } from '../db/db'
import { exportAll, importBackup, updateName, wipeAll } from '../db/actions'
import {
  encryptBackup,
  decryptBackup,
  parseImport,
  type BackupData,
  type EncryptedEnvelope,
} from '../lib/backup'

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Prefer the share sheet (so the file can land in iCloud Drive), else download. */
async function shareOrDownload(filename: string, text: string) {
  try {
    const file = new File([text], filename, { type: 'application/json' })
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean }
    if (nav.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: 'Brain Dump backup' })
      return
    }
  } catch {
    // user cancelled or sharing failed — fall through to a normal download
  }
  download(filename, text)
}

function stamp(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Settings() {
  const go = useApp((s) => s.go)
  const profile = useLiveQuery(() => db.profile.get('me'), [])

  const [name, setName] = useState<string | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [pendingEnc, setPendingEnc] = useState<EncryptedEnvelope | null>(null)
  const [pendingRestore, setPendingRestore] = useState<BackupData | null>(null)
  const [importPass, setImportPass] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)

  const nameValue = name ?? profile?.name ?? ''

  function flash(m: string) {
    setErr(null)
    setMsg(m)
    setTimeout(() => setMsg(null), 2500)
  }

  function onNameBlur() {
    if (name === null) return
    if (name.trim() === '') {
      setName(null) // empty isn't a valid name — show the stored one again
      return
    }
    updateName(name)
  }

  async function exportPlain() {
    const data = await exportAll(Date.now())
    await shareOrDownload(`brain-dump-${stamp()}.json`, JSON.stringify(data, null, 2))
    flash('Backup ready. Save it to iCloud Drive to keep it safe.')
  }

  async function exportEncrypted() {
    if (passphrase.length < 8) {
      setErr('Choose a passphrase of at least 8 characters.')
      return
    }
    const data = await exportAll(Date.now())
    const env = await encryptBackup(data, passphrase)
    await shareOrDownload(`brain-dump-${stamp()}.encrypted.json`, JSON.stringify(env, null, 2))
    setPassphrase('')
    flash('Encrypted backup ready. Keep your passphrase somewhere safe.')
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null)
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    try {
      const parsed = parseImport(await file.text())
      if (parsed.kind === 'encrypted') setPendingEnc(parsed.envelope)
      else setPendingRestore(parsed.data)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not read that file.')
    }
  }

  async function unlock() {
    if (!pendingEnc) return
    try {
      const data = await decryptBackup(pendingEnc, importPass)
      setPendingEnc(null)
      setImportPass('')
      setPendingRestore(data) // move to the confirm step
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not unlock that backup.')
    }
  }

  async function confirmRestore() {
    if (!pendingRestore) return
    try {
      await importBackup(pendingRestore)
      setPendingRestore(null)
      flash('Restored. Welcome back.')
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not restore that backup.')
    }
  }

  async function doWipe() {
    await wipeAll()
    go('onboarding')
  }

  return (
    <div className="flex flex-1 flex-col px-6 pb-10 pt-12">
      <header className="mb-6 flex items-center justify-between">
        <button className="btn-ghost px-2 text-sm" onClick={() => go('home')}>
          ‹ Back
        </button>
        <p className="text-sm font-semibold uppercase tracking-widest text-nebula-300">Settings</p>
        <span className="w-12" />
      </header>

      <div className="flex-1 space-y-8 overflow-y-auto pb-4">
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-mist-500">Your name</p>
          <input
            className="field"
            value={nameValue}
            onChange={(e) => setName(e.target.value)}
            onBlur={onNameBlur}
          />
        </section>

        <section>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-mist-500">Backup</p>
          <p className="mb-3 text-sm text-mist-400">
            Everything lives on this device. A backup is one file you can save to iCloud Drive (or
            anywhere) and use to restore or move devices. Audio stays on-device.
          </p>
          <div className="space-y-3">
            <button className="btn-ghost w-full bg-space-700" onClick={exportPlain}>
              Save a backup
            </button>
            <div className="card space-y-3">
              <p className="text-sm text-mist-300">Encrypt it with a passphrase (recommended for the cloud):</p>
              <input
                className="field"
                type="password"
                placeholder="Passphrase (8+ characters)"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
              />
              <button className="btn-primary w-full" onClick={exportEncrypted}>
                Save encrypted backup
              </button>
            </div>
          </div>
        </section>

        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-mist-500">Restore</p>
          {pendingEnc ? (
            <div className="card space-y-3">
              <p className="text-sm text-mist-300">This backup is encrypted. Enter its passphrase:</p>
              <input
                className="field"
                type="password"
                placeholder="Passphrase"
                value={importPass}
                onChange={(e) => setImportPass(e.target.value)}
              />
              <div className="flex gap-3">
                <button className="btn-primary flex-1" onClick={unlock}>
                  Unlock
                </button>
                <button className="btn-ghost" onClick={() => setPendingEnc(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : pendingRestore ? (
            <div className="card space-y-3">
              <p className="text-sm text-mist-300">
                This will replace what's currently on this device with the backup
                {pendingRestore.items?.length ? ` (${pendingRestore.items.length} items)` : ''}. Continue?
              </p>
              <div className="flex gap-3">
                <button className="btn-primary flex-1" onClick={confirmRestore}>
                  Restore
                </button>
                <button className="btn-ghost" onClick={() => setPendingRestore(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <label className="btn-ghost block w-full cursor-pointer bg-space-700 text-center">
              Choose a backup file…
              <input type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
            </label>
          )}
        </section>

        {(msg || err) && (
          <p className={`rounded-2xl p-4 text-sm ${err ? 'bg-amber-500/15 text-amber-100' : 'bg-nebula-500/15 text-nebula-200'}`}>
            {err ?? msg}
          </p>
        )}

        <section className="pt-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-mist-500">Manage your data</p>
          {confirmWipe ? (
            <div className="flex items-center gap-3">
              <button
                className="btn-ghost flex-1 bg-space-600 text-mist-200 ring-1 ring-white/10"
                onClick={doWipe}
              >
                Yes, erase everything
              </button>
              <button className="btn-ghost" onClick={() => setConfirmWipe(false)}>
                Keep
              </button>
            </div>
          ) : (
            <button className="btn-ghost w-full text-mist-500" onClick={() => setConfirmWipe(true)}>
              Erase all my data
            </button>
          )}
        </section>
      </div>

      <p className="pt-4 text-center text-xs text-mist-500">Brain Dump · by CorNebula · private by design</p>
    </div>
  )
}
