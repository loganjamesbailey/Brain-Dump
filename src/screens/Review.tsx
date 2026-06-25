import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../store/store'
import { db, type Dump, type Suggestion } from '../db/db'
import { applySuggestions } from '../db/actions'
import {
  CADENCE_LABEL,
  CADENCE_ORDER,
  AREA_LABEL,
  type Cadence,
} from '../lib/cadence'

export default function Review() {
  const reviewDumpId = useApp((s) => s.reviewDumpId)
  const firstDump = useApp((s) => s.firstDump)
  const go = useApp((s) => s.go)
  const setFirstDump = useApp((s) => s.setFirstDump)

  const [dump, setDump] = useState<Dump | null>(null)
  const [items, setItems] = useState<Suggestion[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!reviewDumpId) return
    db.dumps.get(reviewDumpId).then((d) => {
      if (!d) return
      setDump(d)
      // New items are pre-accepted (one-tap capture); CHANGES to existing rhythms are
      // opt-in, so altering something you already set is always a deliberate choice.
      setItems(d.suggestions.map((s) => ({ ...s, accepted: s.kind === 'add' })))
    })
  }, [reviewDumpId])

  const adds = useMemo(() => items.filter((s) => s.kind === 'add'), [items])
  const updates = useMemo(() => items.filter((s) => s.kind === 'update'), [items])
  const acceptedCount = items.filter((s) => s.accepted).length

  function toggle(target: Suggestion) {
    setItems((prev) =>
      prev.map((s) => (s === target ? { ...s, accepted: !s.accepted } : s)),
    )
  }

  function setCadence(target: Suggestion, cadence: Cadence) {
    setItems((prev) =>
      prev.map((s) => (s === target && s.kind === 'add' ? { ...s, cadence } : s)),
    )
  }

  async function confirm() {
    if (!dump) return
    setSaving(true)
    await applySuggestions(dump.id, items)
    setFirstDump(false)
    go('home')
  }

  if (!dump) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-3 w-3 animate-breathe rounded-full bg-nebula-400" />
      </div>
    )
  }

  const nothing = adds.length === 0 && updates.length === 0

  return (
    <div className="flex flex-1 flex-col px-6 pb-10 pt-12">
      <p className="text-sm font-semibold uppercase tracking-widest text-nebula-300">
        Here's what came through
      </p>
      <h1 className="mt-2 text-2xl font-semibold leading-snug text-mist-100">
        {nothing
          ? firstDump
            ? "Let's try that again whenever you're ready."
            : 'Nothing new — everything stays as it was.'
          : firstDump
            ? 'Nice work getting it out.'
            : 'Only what you mentioned will change.'}
      </h1>
      <p className="mt-2 text-mist-400">
        {nothing
          ? 'No pressure. You can talk for just a few seconds and still get something useful.'
          : 'Keep what fits, tap to skip the rest. You decide — nothing is saved until you confirm.'}
      </p>

      <div className="mt-6 flex-1 space-y-6 overflow-y-auto pb-4">
        {updates.length > 0 && (
          <section>
            <SectionTitle>Changes you mentioned</SectionTitle>
            <div className="space-y-3">
              {updates.map((s, i) =>
                s.kind === 'update' ? (
                  <button
                    key={i}
                    onClick={() => toggle(s)}
                    className={`card flex w-full items-center gap-3 text-left transition ${
                      s.accepted ? '' : 'opacity-40'
                    }`}
                  >
                    <Check on={!!s.accepted} />
                    <div>
                      <p className="font-medium text-mist-100">{s.title}</p>
                      <p className="text-sm text-mist-400">
                        {CADENCE_LABEL[s.from as Cadence]} → {CADENCE_LABEL[s.to as Cadence]}
                      </p>
                    </div>
                  </button>
                ) : null,
              )}
            </div>
          </section>
        )}

        {adds.length > 0 && (
          <section>
            <SectionTitle>New things to keep track of</SectionTitle>
            <div className="space-y-3">
              {adds.map((s, i) =>
                s.kind === 'add' ? (
                  <div key={i} className={`card transition ${s.accepted ? '' : 'opacity-40'}`}>
                    <button onClick={() => toggle(s)} className="flex w-full items-center gap-3 text-left">
                      <Check on={!!s.accepted} />
                      <div className="flex-1">
                        <p className="font-medium text-mist-100">{s.title}</p>
                        <p className="text-sm text-mist-400">{AREA_LABEL[s.area]}</p>
                      </div>
                    </button>
                    {s.accepted && (
                      <div className="mt-3 flex flex-wrap gap-2 pl-9">
                        {CADENCE_ORDER.map((c) => (
                          <button
                            key={c}
                            onClick={() => setCadence(s, c)}
                            className={`rounded-full px-3 py-1 text-xs transition ${
                              s.cadence === c
                                ? 'bg-nebula-500 text-white'
                                : 'bg-white/5 text-mist-400 hover:text-mist-200'
                            }`}
                          >
                            {CADENCE_LABEL[c]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null,
              )}
            </div>
          </section>
        )}
      </div>

      <div className="space-y-3">
        <button className="btn-primary w-full" onClick={confirm} disabled={saving}>
          {nothing ? 'Done' : `Confirm${acceptedCount ? ` (${acceptedCount})` : ''}`}
        </button>
        <button className="btn-ghost w-full" onClick={() => go('dump')}>
          {nothing ? 'Try again' : 'Add more'}
        </button>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-mist-500">{children}</h2>
}

function Check({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${
        on ? 'border-nebula-400 bg-nebula-500' : 'border-white/20'
      }`}
    >
      {on && (
        <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </span>
  )
}
