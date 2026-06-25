# Brain Dump — by CorNebula

A voice-first, on-device life-structure builder for ADHD / executive-function brains.

> **Talk → it's captured → it gets gently structured for you → the next small step is obvious.**

This isn't a notes app. It's a calm system that turns the things you *want to get
done but struggle to* into a living, cadence-organized map of your life — grown and
updated just by talking.

---

## Who it's for
People with ADHD / executive-function challenges who carry too much in their head:
getting up on time, taking meds, hygiene, laundry, bills, the car's oil change, the
HVAC filter — the endless background admin of being a person. The mental load is the
problem. Externalizing it (a core occupational-therapy strategy) is the fix.

## The feeling (non-negotiable design principles)
- **It is never about the user being broken.** Framing is always: *"This isn't about
  you. This is just how we do things here."* No blame, no shame, no red overdue badges.
- **One micro-step at a time.** Flowing. Each screen does one small thing.
- **Minimal on screen.** Real minimal. Lots of breathing room. No clutter.
- **No anthropomorphism.** Clean and quiet, not a chirpy cartoon assistant.
- **Almost no setup.** First open asks only: *what should I call you?* (first name).
  The app detects time / timezone / DST itself — never asks for any of that.
- **Encouraging, easy to digest.** Reduce overwhelm and analysis-paralysis at every turn.

## First-run flow
1. **Welcome + name** — single field: "What should I call you?" That's the entire setup.
2. **Calming onboarding** — a few micro-step screens that motivate, normalize, and
   explain *what* the brain dump is and *why* we do it this way. Reassuring, brief.
3. **Prime the mind** — before recording, show gentle **examples by cadence** so a
   foggy/paralyzed brain has something to grab onto:
   - **Daily** — get up on time, take meds on time, hygiene, set a bedtime alarm
   - **Weekly** — laundry, wash clothes
   - **Monthly** — bills
   - **Quarterly** — e.g. oil change (by mileage/time)
   - **Biannual** — e.g. HVAC service, deep cleaning
   - **Annual** — registration, vehicle maintenance, air-filter swaps
   Prompts like: *"What do you want to be more timely with? A better morning routine?
   Laundry on a rhythm? Oil changes and registration handled on time?"*
4. **The brain dump** — one big button. The user just talks about everything going on
   that they want to get done or struggle with. Transcribed **on-device** (Web Speech),
   with the **audio kept too** so nothing is lost if a word mis-transcribes.

## The engine (psychology + occupational therapy, built in)
- The app **reads everything said** and **loosely infers** structure: which life areas
  came up, what cadence each thing wants, where the user seems to need the most
  coordination/scaffolding, and *how to present it back gently*.
- Output is a **cadence-organized map** of items the user **confirms** (never forced).
- Inference is mild and humble — it suggests, the user is always in control.

## Returning = additive, never destructive
- Any time: tap **Brain Dump**, talk. The app reads only the **new** things said.
- It does **not** ask questions unless explicitly prompted to.
- **Anything not mentioned is left completely untouched.** Talk about a book you're
  reading without mentioning hygiene → hygiene is not touched.
- **Explicit changes update + confirm.** "Laundry's now weekly, not every other day"
  → that one item updates, user confirms. Everything else stays as-is.

---

## Tech (private by default)
- **PWA** — React + Vite + TypeScript, installable to the home screen, works offline.
- **Voice → text** — Web Speech API, on-device. Audio also recorded (MediaRecorder).
- **Storage** — IndexedDB (Dexie) on the device. Nothing leaves the phone.
- **"Smart" organizing** — on-device, explainable rules first (cadence + life-area
  detection, change detection). Optional opt-in cloud AI can come later for sharper
  parsing — only if the user chooses it.
- **Backup** — encrypted export/import. "iCloud" = the user drops the export file into
  iCloud Drive via the iOS share sheet (a PWA can't write iCloud directly).

## Data model (core)
- **Profile** — first name, created time, detected timezone, gentle preferences.
- **Item (intention)** — title, life-area, cadence (daily…annual), status, source dump,
  history of changes, optional next-smallest-step, optional reminder.
- **Dump** — a brain-dump session: timestamp, transcript, audio blob, and the
  add/update suggestions it produced (for confirm/undo + an honest audit trail).

## Build phases
- **P0 Scaffold** — Vite/React/TS/Tailwind, PWA, Dexie, manifest/icons. *(installable shell)*
- **P1 Onboarding + Capture** — name, calming onboarding, cadence priming, talk-to-capture.
- **P2 Structuring engine** — parse transcript → cadence/area items → confirm screen.
- **P3 The map + focus** — calm home view, "today / next step", gentle browse.
- **P4 Returning dumps** — additive merge + change detection + confirm.
- **P5 Routines & reminders** — recurring intentions become gentle scaffolds.
- **P6 Backup & polish** — encrypted export/import, offline polish, install UX.
