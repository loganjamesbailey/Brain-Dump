import type { Item } from '../db/db'
import { isResting, isSnoozed } from '../lib/period'

/**
 * One item in a list. The circle completes it (gentle, resets per cadence); tapping
 * the body opens its detail. Resting and snoozed items dim quietly — never a red
 * "overdue". A snoozed item's circle wakes it rather than completing it.
 */
interface Props {
  item: Item
  now: number
  onToggle: (item: Item) => void
  onOpen: (item: Item) => void
  showNextStep?: boolean
}

export default function ItemRow({ item, now, onToggle, onOpen, showNextStep }: Props) {
  const resting = isResting(item, now)
  const snoozed = isSnoozed(item, now)
  const dimmed = resting || snoozed

  const label = snoozed
    ? `Wake up: ${item.title}`
    : resting
      ? `Mark not done: ${item.title}`
      : `Mark done: ${item.title}`

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-space-700/60 px-4 py-3 ring-1 ring-white/5">
      <button
        onClick={() => onToggle(item)}
        role="checkbox"
        aria-checked={resting}
        aria-label={label}
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90 ${
          resting ? 'border-nebula-400 bg-nebula-500' : 'border-white/25'
        }`}
      >
        {resting && (
          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {snoozed && !resting && <span className="h-2 w-2 rounded-full bg-mist-500" />}
      </button>
      <button onClick={() => onOpen(item)} className="min-w-0 flex-1 text-left">
        <p className={`truncate transition ${dimmed ? 'text-mist-500' : 'text-mist-100'} ${resting ? 'line-through' : ''}`}>
          {item.title}
        </p>
        {showNextStep && item.nextStep && !dimmed && (
          <p className="mt-0.5 truncate text-sm text-nebula-300">→ {item.nextStep}</p>
        )}
        {resting && <p className="mt-0.5 text-xs text-mist-500">resting · done for now</p>}
        {snoozed && !resting && <p className="mt-0.5 text-xs text-mist-500">resting · tap to wake</p>}
      </button>
      {!!item.momentum && item.momentum >= 2 && !dimmed && (
        <span className="flex-shrink-0 text-xs text-mist-500">×{item.momentum}</span>
      )}
    </div>
  )
}
