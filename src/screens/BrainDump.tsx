import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store/store'
import RecordButton from '../components/RecordButton'
import { startSpeech, isSpeechSupported, type SpeechSession } from '../lib/speech'
import { startRecording, type RecorderHandle } from '../lib/recorder'
import { analyzeDump } from '../lib/extractor'
import { db } from '../db/db'
import { saveDump } from '../db/actions'

type Phase = 'idle' | 'listening' | 'processing'

export default function BrainDump() {
  const firstDump = useApp((s) => s.firstDump)
  const go = useApp((s) => s.go)
  const startReview = useApp((s) => s.startReview)

  const [phase, setPhase] = useState<Phase>('idle')
  const [finalText, setFinalText] = useState('')
  const [interim, setInterim] = useState('')
  const [level, setLevel] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)

  const speechRef = useRef<SpeechSession | null>(null)
  const recorderRef = useRef<RecorderHandle | null>(null)
  const rafRef = useRef(0)
  const finalRef = useRef('')
  const interimRef = useRef('')
  const mountedRef = useRef(true)
  const finishingRef = useRef(false)
  const speechOk = isSpeechSupported()

  const DRAFT_KEY = 'brain-dump:draft'

  // Restore a draft transcript if a previous session was interrupted (e.g. a
  // service-worker update reloaded the page mid-dump).
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) {
      finalRef.current = saved
      setFinalText(saved)
    }
  }, [])

  useEffect(() => {
    return () => {
      mountedRef.current = false
      speechRef.current?.stop()
      recorderRef.current?.cancel()
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Warn before leaving while actively listening, so an in-progress dump isn't lost.
  useEffect(() => {
    if (phase !== 'listening') return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [phase])

  async function startListening() {
    setNotice(null)
    setPhase('listening')

    recorderRef.current = await startRecording()
    if (!recorderRef.current && !speechOk) {
      setNotice('Microphone access is needed to listen. You can also type below.')
    }

    if (speechOk) {
      speechRef.current = startSpeech({
        onFinal: (t) => {
          finalRef.current = t
          setFinalText(t)
          localStorage.setItem(DRAFT_KEY, t)
        },
        onInterim: (i) => {
          interimRef.current = i
          setInterim(i)
        },
        onError: (msg) => {
          if (msg.includes('not-allowed') || msg.includes('denied')) {
            setNotice('Microphone access is blocked. You can type below instead.')
          }
        },
      })
    }

    const loop = () => {
      if (recorderRef.current) setLevel(recorderRef.current.getLevel())
      rafRef.current = requestAnimationFrame(loop)
    }
    loop()
  }

  async function finish() {
    if (finishingRef.current) return
    finishingRef.current = true
    setPhase('processing')
    speechRef.current?.stop()
    speechRef.current = null
    cancelAnimationFrame(rafRef.current)
    const rec = await recorderRef.current?.stop()
    recorderRef.current = null
    setInterim('')

    // Fold any trailing un-finalized words in so nothing said is dropped.
    const transcript = [finalRef.current || finalText, interimRef.current].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
    const existing = await db.items.toArray()
    const { suggestions } = analyzeDump(transcript, existing)

    const dumpId = await saveDump({
      transcript,
      kind: firstDump ? 'initial' : 'update',
      durationMs: rec?.durationMs,
      audio: rec?.blob,
      audioType: rec?.type,
      suggestions,
    })

    localStorage.removeItem(DRAFT_KEY)
    if (mountedRef.current) startReview(dumpId)
  }

  const liveText = [finalText, interim].filter(Boolean).join(' ')

  return (
    <div className="flex flex-1 flex-col px-6 pb-10 pt-12">
      <header className="flex items-center justify-between">
        <button className="btn-ghost px-2 text-sm" onClick={() => go('home')}>
          {firstDump ? '' : '‹ Back'}
        </button>
        <p className="text-sm font-semibold uppercase tracking-widest text-nebula-300">
          {firstDump ? 'Your first brain dump' : 'Brain dump'}
        </p>
        <span className="w-12" />
      </header>

      <div className="mt-8 flex-1 overflow-y-auto">
        {phase === 'idle' && (
          <div className="animate-fade-up">
            <h1 className="text-3xl font-semibold leading-tight text-mist-100">
              Tap, then just talk.
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-mist-400">
              {firstDump
                ? 'Say whatever comes — the things you want to keep up with and the things that slip. No order needed.'
                : 'Just say what changed or what’s new. Everything else stays exactly as it is.'}
            </p>
          </div>
        )}

        {phase !== 'idle' && (
          <div className="animate-fade-in">
            {liveText ? (
              <p className="whitespace-pre-wrap text-xl leading-relaxed text-mist-100">
                {finalText} <span className="text-mist-400">{interim}</span>
              </p>
            ) : (
              <p className="text-lg text-mist-500">
                {phase === 'processing' ? 'Organizing…' : 'Listening… take your time.'}
              </p>
            )}
          </div>
        )}

        {!speechOk && phase === 'listening' && (
          <textarea
            value={finalText}
            onChange={(e) => {
              finalRef.current = e.target.value
              setFinalText(e.target.value)
            }}
            placeholder="Type your brain dump here…"
            className="field mt-6 min-h-[8rem] resize-none"
          />
        )}

        {notice && <p className="mt-6 rounded-2xl bg-space-700 p-4 text-sm text-mist-300">{notice}</p>}
      </div>

      <div className="mt-6 flex flex-col items-center gap-6">
        {phase === 'idle' && (
          <RecordButton listening={false} level={0} onClick={startListening} label="Tap to start" />
        )}
        {phase === 'listening' && (
          <>
            <RecordButton listening level={level} onClick={finish} label="Tap when you're done" />
          </>
        )}
        {phase === 'processing' && (
          <div className="h-40 flex items-center justify-center">
            <div className="h-3 w-3 animate-breathe rounded-full bg-nebula-400" />
          </div>
        )}
      </div>
    </div>
  )
}
