/**
 * Audio recording via MediaRecorder. We keep the audio as the source of truth so
 * a thought is never lost even if transcription mis-hears a word.
 */

export interface RecorderHandle {
  stop: () => Promise<{ blob: Blob; type: string; durationMs: number } | null>
  /** A 0..1 input level for the gentle "I'm listening" animation. */
  getLevel: () => number
  cancel: () => void
}

export function isRecordingSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  )
}

function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac']
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c
    } catch {
      /* ignore */
    }
  }
  return ''
}

export async function startRecording(): Promise<RecorderHandle | null> {
  if (!isRecordingSupported()) return null

  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch {
    return null
  }

  const mimeType = pickMimeType()
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }
  const startedAt = Date.now()
  recorder.start(250)

  // Lightweight level metering for the breathing animation.
  let level = 0
  let audioCtx: AudioContext | null = null
  let raf = 0
  try {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / data.length)
      level = Math.min(1, rms * 3)
      raf = requestAnimationFrame(tick)
    }
    tick()
  } catch {
    /* metering is optional */
  }

  const cleanup = () => {
    if (raf) cancelAnimationFrame(raf)
    audioCtx?.close().catch(() => {})
    stream.getTracks().forEach((t) => t.stop())
  }

  return {
    getLevel: () => level,
    cancel: () => {
      try {
        recorder.stop()
      } catch {
        /* ignore */
      }
      cleanup()
    },
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          cleanup()
          if (chunks.length === 0) {
            resolve(null)
            return
          }
          const type = recorder.mimeType || mimeType || 'audio/webm'
          resolve({ blob: new Blob(chunks, { type }), type, durationMs: Date.now() - startedAt })
        }
        try {
          recorder.stop()
        } catch {
          cleanup()
          resolve(null)
        }
      }),
  }
}
