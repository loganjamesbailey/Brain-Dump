import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useApp } from '../store/store'
import { db } from '../db/db'
import { archiveItem, deleteItem, editItem, snoozeItem, unsnoozeItem } from '../db/actions'
import {
  AREA_LABEL,
  CADENCE_LABEL,
  CADENCE_ORDER,
  type Cadence,
  type LifeArea,
} from '../lib/cadence'
import { suggestNextStep } from '../lib/nextstep'
import { isSnoozed } from '../lib/period'

const AREAS = Object.keys(AREA_LABEL) as LifeArea[]
const DAY = 86_400_000

export default function ItemDetail() {
  const id = useApp((s) => s.selectedItemId)
  const go = useApp((s) => s.go)
  const item = useLiveQuery(() => (id ? db.items.get(id) : undefined), [id])

  const [title, setTitle] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (item) {
      setTitle(item.title)
      setNextStep(item.nextStep ?? '')
    }
  }, [item?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!id || !item) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <button className="btn-ghost" onClick={() => go('home')}>
          ‹ Back
        </button>
      </div>
    )
  }

  const now = Date.now()
  const snoozed = isSnoozed(item, now)

  function saveTitle() {
    if (title.trim() && title !== item!.title) editItem(item!.id, { title })
  }
  function saveNextStep() {
    if (nextStep !== (item!.nextStep ?? '')) editItem(item!.id, { nextStep })
  }
  function remove() {
    deleteItem(item!.id)
    go('home')
  }

  return (
    <div className="flex flex-1 flex-col px-6 pb-10 pt-12">
      <header className="mb-6 flex items-center justify-between">
        <button className="btn-ghost px-2 text-sm" onClick={() => go('home')}>
          ‹ Back
        </button>
        {!!item.momentum && item.momentum >= 2 && (
          <span className="text-sm text-nebula-300">on a roll ×{item.momentum}</span>
        )}
      </header>

      <div className="flex-1 space-y-7 overflow-y-auto pb-4">
        <Field label="What is it?">
          <input
            className="field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
          />
        </Field>

        <Field label="Next smallest step">
          <input
            className="field"
            value={nextStep}
            placeholder="One tiny action…"
            onChange={(e) => setNextStep(e.target.value)}
            onBlur={saveNextStep}
          />
          {!nextStep && (
            <button
              className="mt-2 text-sm text-nebula-300 active:scale-95"
              onClick={() => {
                const s = suggestNextStep(item.title)
                setNextStep(s)
                editItem(item.id, { nextStep: s })
              }}
            >
              + Suggest one for me
            </button>
          )}
        </Field>

        <Field label="Rhythm">
          <ChipRow
            options={CADENCE_ORDER}
            value={item.cadence}
            label={(c) => CADENCE_LABEL[c as Cadence]}
            onPick={(c) => editItem(item.id, { cadence: c as Cadence })}
          />
        </Field>

        <Field label="Area of life">
          <ChipRow
            options={AREAS}
            value={item.area}
            label={(a) => AREA_LABEL[a as LifeArea]}
            onPick={(a) => editItem(item.id, { area: a as LifeArea })}
          />
        </Field>

        <div className="flex flex-wrap gap-3 pt-2">
          {snoozed ? (
            <button className="btn-ghost bg-space-700" onClick={() => unsnoozeItem(item.id)}>
              Wake it up
            </button>
          ) : (
            <button className="btn-ghost bg-space-700" onClick={() => snoozeItem(item.id, now + 7 * DAY)}>
              Rest for a week
            </button>
          )}
          <button
            className="btn-ghost bg-space-700"
            onClick={() => {
              archiveItem(item.id)
              go('home')
            }}
          >
            Archive
          </button>
        </div>
      </div>

      <div className="pt-4">
        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <button
              className="btn-ghost flex-1 bg-space-600 text-mist-200 ring-1 ring-white/10"
              onClick={remove}
            >
              Yes, delete it
            </button>
            <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>
              Keep
            </button>
          </div>
        ) : (
          <button className="btn-ghost w-full text-mist-500" onClick={() => setConfirmDelete(true)}>
            Delete this
          </button>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-mist-500">{label}</p>
      {children}
    </div>
  )
}

function ChipRow<T extends string>({
  options,
  value,
  label,
  onPick,
}: {
  options: readonly T[]
  value: T
  label: (o: T) => string
  onPick: (o: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onPick(o)}
          className={`rounded-full px-3 py-1.5 text-sm transition active:scale-95 ${
            value === o ? 'bg-nebula-500 text-white' : 'bg-white/5 text-mist-400 hover:text-mist-200'
          }`}
        >
          {label(o)}
        </button>
      ))}
    </div>
  )
}
