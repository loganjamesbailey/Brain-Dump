import type { Item } from '../db/db'
import { isResting } from '../lib/period'

/**
 * One item in a list. The circle completes it (gentle, resets per cadence); tapping
 * the body opens its detail. Resting items dim quietly — never a red "overdue".
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
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-space-700/60 px-4 py-3 ring-1 ring-white/5">
      <button
        onClick={() => onToggle(item)}
        aria-label={resting ? 'Mark not done' : 'Mark done'}
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90 ${
          resting ? 'border-nebula-400 bg-nebula-500' : 'border-white/25'
        }`}
      >
        {resting && (
          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <button onClick={() => onOpen(item)} className="min-w-0 flex-1 text-left">
        <p className={`truncate transition ${resting ? 'text-mist-500 line-through' : 'text-mist-100'}`}>
          {item.title}
        </p>
        {showNextStep && item.nextStep && !resting && (
          <p className="mt-0.5 truncate text-sm text-nebula-300">→ {item.nextStep}</p>
        )}
        {resting && <p className="mt-0.5 text-xs text-mist-500">resting · done for now</p>}
      </button>
      {!!item.momentum && item.momentum >= 2 && !resting && (
        <span className="flex-shrink-0 text-xs text-mist-500">×{item.momentum}</span>
      )}
    </div>
  )
}
