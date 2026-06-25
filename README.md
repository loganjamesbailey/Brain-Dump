# Brain Dump — by CorNebula

A voice-first, on-device life-structure builder for ADHD / executive-function brains.

> **Talk → it's captured → it gets gently structured for you → the next small step is obvious.**

You just talk about the things you want to keep up with and the things that slip
(getting up on time, meds, hygiene, laundry, bills, the car's oil change…). Brain
Dump transcribes it **on your device**, gently organizes it into a calm, cadence-based
map, and only ever changes what you confirm. Anything you don't mention is left alone.

See [`VISION.md`](./VISION.md) for the full product philosophy and the psychology /
occupational-therapy principles behind it.

## Principles
- **Never about you being broken** — "this is just how we do things here."
- **One micro-step at a time**, minimal on screen, calm.
- **Almost no setup** — just your first name. Time/timezone are detected automatically.
- **Private by default** — transcription and storage are on-device; nothing leaves the phone.
- **Additive, never destructive** — returning brain dumps only add new things or update
  rhythms you explicitly changed.

## Tech
- **PWA** — React + Vite + TypeScript, installable, offline-capable (`vite-plugin-pwa`).
- **Voice → text** — Web Speech API (on-device); audio is also recorded as a backstop.
- **Storage** — IndexedDB via Dexie.
- **Structuring** — an on-device, explainable rules engine (`src/lib/extractor.ts`).

## Develop
```bash
npm install      # install dependencies
npm run dev      # start the dev server (https needed for mic on real devices)
npm run build    # type-check + production build (+ PWA service worker)
npm run preview  # preview the production build
npm run typecheck
npm run lint
```

> **Microphone & PWA install need HTTPS.** `localhost` works for local dev. To try it
> on your phone, serve over HTTPS (or use a tunnel) and "Add to Home Screen".

## Project layout
```
src/
  lib/
    speech.ts      on-device speech-to-text (Web Speech API)
    recorder.ts    audio recording (MediaRecorder) + mic level
    extractor.ts   the structuring engine: transcript → cadence-organized suggestions
    cadence.ts     cadences, life-areas, priming examples
    time.ts        timezone + gentle greetings
  db/
    db.ts          Dexie schema (profile, items, dumps)
    actions.ts     create profile, save dumps, apply confirmed suggestions
  store/store.ts   tiny UI navigation store (zustand)
  screens/         Onboarding, BrainDump, Review, Home
  components/       RecordButton, StarField
```

## Status
Phases 0–2 (+ part of 3–4) are in place: scaffold, calming onboarding, voice capture,
on-device structuring, confirm screen, and the calm home map. Next: routines &
reminders, change-detection polish, and encrypted backup/import (the "iCloud Drive" flow).
Roadmap in [`VISION.md`](./VISION.md).
