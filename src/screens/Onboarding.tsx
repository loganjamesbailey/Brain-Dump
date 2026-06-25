import { useState } from 'react'
import { useApp } from '../store/store'
import { createProfile, completeOnboarding } from '../db/actions'
import { CADENCE_EXAMPLES, CADENCE_LABEL } from '../lib/cadence'

/**
 * Onboarding is deliberately gentle: one micro-step per screen, lots of room,
 * encouraging and normalizing — never a quiz, never blame. The only thing we ask
 * for is a first name. Everything else (time, timezone) the app detects itself.
 */
export default function Onboarding() {
  const go = useApp((s) => s.go)
  const setFirstDump = useApp((s) => s.setFirstDump)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')

  const steps = ['welcome', 'name', 'reassure', 'how', 'prime', 'ready'] as const
  const current = steps[step]
  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1))

  async function handleNameNext() {
    if (name.trim()) await createProfile(name)
    next()
  }

  async function begin() {
    await completeOnboarding()
    setFirstDump(true)
    go('dump')
  }

  return (
    <div className="flex flex-1 flex-col px-7 pb-10 pt-16">
      <Progress count={steps.length} index={step} />

      <div key={current} className="flex flex-1 animate-fade-up flex-col">
        {current === 'welcome' && (
          <Step
            eyebrow="Brain Dump"
            title="Let's clear some space."
            body="A quiet place to get everything out of your head — and gently make sense of it. One small step at a time."
            cta="Begin"
            onCta={next}
          />
        )}

        {current === 'name' && (
          <div className="flex flex-1 flex-col">
            <Eyebrow>First things first</Eyebrow>
            <h1 className="mt-3 text-3xl font-semibold text-mist-100">What should I call you?</h1>
            <p className="mt-3 text-mist-400">Just a first name is perfect. That's the only setup there is.</p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameNext()}
              placeholder="Your name"
              className="field mt-8"
              enterKeyHint="done"
            />
            <Spacer />
            <button className="btn-primary w-full" onClick={handleNameNext}>
              Continue
            </button>
          </div>
        )}

        {current === 'reassure' && (
          <Step
            eyebrow={name ? `Hi, ${name}` : 'A quick note'}
            title="This isn't about you being broken."
            body="Brains are different, and some need things on the outside instead of all in your head. That's not a flaw — it's just how we do things here. We'll build the structure together."
            cta="Okay"
            onCta={next}
          />
        )}

        {current === 'how' && (
          <Step
            eyebrow="How this works"
            title="You talk. I'll sort."
            body="You just say what's on your mind — the stuff you want to get done and the stuff that's hard to keep up with. I'll quietly organize it into a calm map you can actually use. You're always in control."
            cta="Got it"
            onCta={next}
          />
        )}

        {current === 'prime' && (
          <div className="flex flex-1 flex-col">
            <Eyebrow>Before you start</Eyebrow>
            <h1 className="mt-3 text-3xl font-semibold text-mist-100">A few things to spark ideas</h1>
            <p className="mt-3 text-mist-400">
              No pressure to cover any of these — they're just here to get the wheels turning.
            </p>
            <div className="mt-6 flex-1 space-y-3 overflow-y-auto pb-2">
              {CADENCE_EXAMPLES.map((group) => (
                <div key={group.cadence} className="card">
                  <p className="text-xs font-semibold uppercase tracking-wide text-nebula-300">
                    {CADENCE_LABEL[group.cadence]}
                  </p>
                  <p className="mt-1 text-mist-200">{group.examples.join(' · ')}</p>
                </div>
              ))}
            </div>
            <button className="btn-primary mt-4 w-full" onClick={next}>
              I'm ready
            </button>
          </div>
        )}

        {current === 'ready' && (
          <Step
            eyebrow="That's it"
            title="Whenever you're ready, just talk."
            body="There's no wrong way to do this. Ramble, jump around, change your mind. Get it all out — I'll catch it and make it make sense."
            cta="Start my brain dump"
            onCta={begin}
          />
        )}
      </div>
    </div>
  )
}

function Step(props: {
  eyebrow: string
  title: string
  body: string
  cta: string
  onCta: () => void
}) {
  return (
    <div className="flex flex-1 flex-col">
      <Eyebrow>{props.eyebrow}</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold leading-tight text-mist-100">{props.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-mist-400">{props.body}</p>
      <Spacer />
      <button className="btn-primary w-full" onClick={props.onCta}>
        {props.cta}
      </button>
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold uppercase tracking-widest text-nebula-300">{children}</p>
}

function Spacer() {
  return <div className="flex-1" />
}

function Progress({ count, index }: { count: number; index: number }) {
  return (
    <div className="mb-10 flex justify-center gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === index ? 'w-6 bg-nebula-400' : 'w-1.5 bg-white/15'
          }`}
        />
      ))}
    </div>
  )
}
