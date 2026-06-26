/**
 * On-device speech-to-text via the Web Speech API. Free, private, real-time.
 *
 * Support varies (best on Chrome; works on iOS Safari 14.5+ but can be flaky),
 * so callers should always pair this with audio recording as the source of truth,
 * and the transcript is always editable.
 */

// Minimal typings — the DOM lib doesn't ship SpeechRecognition.
type SpeechRecognition = any

function getRecognitionCtor(): (new () => SpeechRecognition) | null {
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function isSpeechSupported(): boolean {
  return getRecognitionCtor() !== null
}

export interface SpeechHandlers {
  /** Stable, confirmed text accumulated so far. */
  onFinal: (fullText: string) => void
  /** Live in-progress words for display only. */
  onInterim: (interim: string) => void
  onError?: (message: string) => void
  onEnd?: () => void
}

export interface SpeechSession {
  stop: () => void
}

/**
 * Start a continuous dictation session. Returns a handle to stop it.
 * Auto-restarts on transient ends so a long brain dump isn't cut short.
 */
export function startSpeech(handlers: SpeechHandlers): SpeechSession | null {
  const Ctor = getRecognitionCtor()
  if (!Ctor) {
    handlers.onError?.('Speech recognition is not available on this device.')
    return null
  }

  let finalText = ''
  let stopped = false
  const recognition: SpeechRecognition = new Ctor()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = navigator.language || 'en-US'

  recognition.onresult = (event: any) => {
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      const text = result[0]?.transcript ?? ''
      if (result.isFinal) {
        finalText = (finalText + ' ' + text).replace(/\s+/g, ' ').trim()
      } else {
        interim += text
      }
    }
    handlers.onFinal(finalText)
    handlers.onInterim(interim.trim())
  }

  recognition.onerror = (event: any) => {
    // "no-speech" and "aborted" are routine; don't alarm the user.
    if (event.error === 'no-speech' || event.error === 'aborted') return
    handlers.onError?.(event.error || 'speech error')
  }

  recognition.onend = () => {
    if (!stopped) {
      // Browsers end recognition periodically; restart to keep listening.
      try {
        recognition.start()
        return
      } catch {
        /* fall through to end */
      }
    }
    handlers.onEnd?.()
  }

  try {
    recognition.start()
  } catch (e) {
    handlers.onError?.(String(e))
    return null
  }

  return {
    stop: () => {
      stopped = true
      try {
        recognition.stop()
      } catch {
        /* ignore */
      }
    },
  }
}
