import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useApp } from '../store/store'
import { db, type Item } from '../db/db'
import { markDone, markUndone, unsnoozeItem } from '../db/actions'
import { greeting } from '../lib/time'
import { CADENCE_LABEL, CADENCE_ORDER, type Cadence } from '../lib/cadence'
import { computeInsight } from '../lib/insights'
import { selectFocus } from '../lib/focus'
import { isResting, isSnoozed } from '../lib/period'
import ItemRow from '../components/ItemRow'

export default function Home() {
  const go = useApp((s) => s.go)
  const openItem = useApp((s) => s.openItem)
  const setFirstDump = useApp((s) => s.setFirstDump)

  const profile = useLiveQuery(() => db.profile.get('me'), [])
  const items = useLiveQuery(() => db.items.toArray(), [])

  // A single, slowly-advancing clock so resting→ready transitions happen on their
  // own and every render uses a stable `now`.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const [showMap, setShowMap] = useState(false)

  const active = useMemo(() => (items ?? []).filter((i) => i.status === 'active'), [items])
  const insight = useMemo(() => computeInsight(active, now), [active, now])
  const focus = useMemo(() => selectFocus(active, now, insight.focusLimit), [active, now, insight.focusLimit])
  const byCadence = useMemo(
    () =>
      CADENCE_ORDER.map((cadence) => ({
        cadence,
        items: active
          .filter((i) => i.cadence === cadence)
          .sort(
            (a, b) =>
              Number(isResting(a, now) || isSnoozed(a, now)) - Number(isResting(b, now) || isSnoozed(b, now)) ||
              a.title.localeCompare(b.title),
          ),
      })).filter((g) => g.items.length > 0),
    [active, now],
  )

  function toggle(item: Item) {
    const t = Date.now()
    if (isSnoozed(item, t)) unsnoozeItem(item.id)
    else if (isResting(item, t)) markUndone(item.id)
    else markDone(item.id)
  }
  function startDump() {
    setFirstDump(false)
    go('dump')
  }

  const loading = items === undefined
  const empty = !loading && active.length === 0
  // When the daily load is heavy, keep the home surface to just the anchor and put
  // the full map behind an explicit choice — minimal on screen by default.
  const collapseMap = insight.presentationMode === 'one-anchor'

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-6 pb-32 pt-14">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-mist-400">{greeting(profile?.name)}</p>
            <h1 className="mt-1 text-2xl font-semibold text-mist-100">
              {loading ? ' ' : insight.headline}
            </h1>
          </div>
          <button
            onClick={() => go('settings')}
            aria-label="Settings"
            className="mt-1 rounded-full p-2 text-mist-400 transition active:scale-90 hover:text-mist-100"
          >
            <GearIcon className="h-6 w-6" />
          </button>
        </header>

        {loading ? (
          <div className="mt-24 flex justify-center">
            <div className="h-2 w-2 animate-breathe rounded-full bg-nebula-400" />
          </div>
        ) : empty ? (
          <div className="mt-16 flex flex-col items-center text-center animate-fade-up">
            <div className="mb-6 h-2 w-2 animate-breathe rounded-full bg-nebula-400" />
            <p className="text-lg text-mist-300">Nothing here yet — and that's fine.</p>
            <p className="mt-2 max-w-xs text-mist-500">
              When you're ready, tap below and talk. It becomes something calm and clear.
            </p>
          </div>
        ) : (
          <>
            {insight.observations.length > 0 && (
              <div className="card mt-5 animate-fade-up">
                {insight.observations.map((o, i) => (
                  <p key={i} className={`text-mist-300 ${i > 0 ? 'mt-2' : ''}`}>
                    {o}
                  </p>
                ))}
              </div>
            )}

            <section className="mt-8 animate-fade-up">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-nebula-300">
                Right now
              </h2>
              {focus.length > 0 ? (
                <div className="space-y-2">
                  {focus.map((item) => (
                    <ItemRow key={item.id} item={item} now={now} onToggle={toggle} onOpen={(i) => openItem(i.id)} showNextStep />
                  ))}
                </div>
              ) : (
                <div className="card text-mist-400">You're all caught up for now. Rest is allowed.</div>
              )}
            </section>

            {collapseMap && !showMap ? (
              <button
                className="btn-ghost mt-8 w-full bg-space-700/60"
                onClick={() => setShowMap(true)}
              >
                Browse everything
              </button>
            ) : (
              <div className="mt-10 space-y-8">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-mist-500">Your map</h2>
                {byCadence.map((group) => (
                  <CadenceSection
                    key={group.cadence}
                    cadence={group.cadence}
                    items={group.items}
                    now={now}
                    onToggle={toggle}
                    onOpen={(i) => openItem(i.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-space-800 via-space-800/90 to-transparent px-6 pb-8 pt-10"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
      >
        <button className="btn-primary pointer-events-auto w-full" onClick={startDump}>
          <MicIcon className="h-5 w-5" />
          Brain dump
        </button>
      </div>
    </div>
  )
}

function CadenceSection({
  cadence,
  items,
  now,
  onToggle,
  onOpen,
}: {
  cadence: Cadence
  items: Item[]
  now: number
  onToggle: (i: Item) => void
  onOpen: (i: Item) => void
}) {
  return (
    <section className="animate-fade-up">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-nebula-300">
        {CADENCE_LABEL[cadence]}
      </h3>
      <div className="space-y-2">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} now={now} onToggle={onToggle} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="17" x2="12" y2="22" />
    </svg>
  )
}
