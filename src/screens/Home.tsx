import { useLiveQuery } from 'dexie-react-hooks'
import { useApp } from '../store/store'
import { db, type Item } from '../db/db'
import { setItemStatus } from '../db/actions'
import { greeting } from '../lib/time'
import { CADENCE_LABEL, CADENCE_ORDER, type Cadence } from '../lib/cadence'

export default function Home() {
  const go = useApp((s) => s.go)
  const setFirstDump = useApp((s) => s.setFirstDump)

  const profile = useLiveQuery(() => db.profile.get('me'), [])
  const items = useLiveQuery(() => db.items.toArray(), [])

  const active = (items ?? []).filter((i) => i.status === 'active' || i.status === 'done')

  const byCadence = CADENCE_ORDER.map((cadence) => ({
    cadence,
    items: active
      .filter((i) => i.cadence === cadence)
      .sort((a, b) => a.title.localeCompare(b.title)),
  })).filter((g) => g.items.length > 0)

  function startDump() {
    setFirstDump(false)
    go('dump')
  }

  const empty = active.length === 0

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-6 pb-32 pt-14">
        <p className="text-sm font-medium text-mist-400">{greeting(profile?.name)}</p>
        <h1 className="mt-1 text-2xl font-semibold text-mist-100">Your map</h1>

        {empty ? (
          <div className="mt-16 flex flex-col items-center text-center animate-fade-up">
            <div className="mb-6 h-2 w-2 animate-breathe rounded-full bg-nebula-400" />
            <p className="text-lg text-mist-300">Nothing here yet — and that's fine.</p>
            <p className="mt-2 max-w-xs text-mist-500">
              When you're ready, tap below and talk. I'll turn it into something calm and clear.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {byCadence.map((group) => (
              <CadenceSection key={group.cadence} cadence={group.cadence} items={group.items} />
            ))}
          </div>
        )}
      </div>

      {/* The one button that's always within reach. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-space-800 via-space-800/90 to-transparent px-6 pb-8 pt-10">
        <button className="btn-primary pointer-events-auto w-full" onClick={startDump}>
          <MicIcon className="h-5 w-5" />
          Brain dump
        </button>
      </div>
    </div>
  )
}

function CadenceSection({ cadence, items }: { cadence: Cadence; items: Item[] }) {
  return (
    <section className="animate-fade-up">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-nebula-300">
        {CADENCE_LABEL[cadence]}
      </h2>
      <div className="space-y-2">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}

function ItemRow({ item }: { item: Item }) {
  const done = item.status === 'done'
  return (
    <button
      onClick={() => setItemStatus(item.id, done ? 'active' : 'done')}
      className="flex w-full items-center gap-3 rounded-2xl bg-space-700/60 px-4 py-3 text-left ring-1 ring-white/5 transition active:scale-[0.99]"
    >
      <span
        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${
          done ? 'border-nebula-400 bg-nebula-500' : 'border-white/20'
        }`}
      >
        {done && (
          <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span className={`text-mist-100 transition ${done ? 'text-mist-500 line-through' : ''}`}>
        {item.title}
      </span>
    </button>
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
