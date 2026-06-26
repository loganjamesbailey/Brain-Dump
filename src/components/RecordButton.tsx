/**
 * The one big tap target. Breathing rings while listening, sized by mic level.
 * Calm, not flashy — it should feel like the app is quietly with you.
 */
interface Props {
  listening: boolean
  level: number
  onClick: () => void
  label: string
}

export default function RecordButton({ listening, level, onClick, label }: Props) {
  const scale = 1 + Math.min(level, 1) * 0.25
  return (
    <div className="flex flex-col items-center gap-5">
      <button
        onClick={onClick}
        aria-label={label}
        className="relative flex h-40 w-40 items-center justify-center rounded-full focus:outline-none"
      >
        {listening && (
          <>
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-nebula-500/30" />
            <span
              className="absolute inset-0 rounded-full bg-nebula-500/20 transition-transform duration-100"
              style={{ transform: `scale(${scale})` }}
            />
          </>
        )}
        <span
          className={`relative flex h-32 w-32 items-center justify-center rounded-full shadow-xl transition ${
            listening
              ? 'bg-nebula-500 shadow-nebula-600/40'
              : 'bg-nebula-600 shadow-nebula-700/30 active:scale-95'
          }`}
        >
          <MicIcon className="h-12 w-12 text-white" />
        </span>
      </button>
      <p className="text-sm font-medium text-mist-300">{label}</p>
    </div>
  )
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="17" x2="12" y2="22" />
    </svg>
  )
}
