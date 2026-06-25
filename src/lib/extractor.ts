/**
 * The structuring engine — on-device, explainable, humble.
 *
 * It reads a brain-dump transcript and proposes a cadence-organized set of items.
 * It never changes anything on its own: it returns *suggestions* the user confirms.
 *
 * Two behaviours, matching the product:
 *  - First dump: propose everything it hears as new items.
 *  - Returning dump: only ADD genuinely new things, and only UPDATE when the user
 *    explicitly says a rhythm changed. Anything not mentioned is left untouched.
 */

import type { Cadence, LifeArea } from './cadence'
import { newId, type Item, type Suggestion } from '../db/db'

interface Topic {
  key: string
  title: string
  area: LifeArea
  cadence: Cadence
  /** Matched anywhere in the transcript (word-ish boundaries). */
  patterns: RegExp[]
}

/** A small, honest knowledge base of common life-admin topics. */
const TOPICS: Topic[] = [
  { key: 'wake', title: 'Get up on time', area: 'morning', cadence: 'daily',
    patterns: [/\bget(ting)? up\b/, /\bwak(e|ing) up\b/, /\boversleep/, /\bmorning alarm\b/] },
  { key: 'bedtime', title: 'Set a bedtime alarm', area: 'health', cadence: 'daily',
    patterns: [/\bbed ?time\b/, /\bgo to bed\b/, /\balarm (at|before) (night|bed)/, /\bgo to sleep\b/] },
  { key: 'meds', title: 'Take medicine on time', area: 'health', cadence: 'daily',
    patterns: [/\bmedicine\b/, /\bmedication\b/, /\bmeds\b/, /\bpills?\b/, /\bprescriptions?\b/] },
  { key: 'hygiene', title: 'Hygiene routine', area: 'hygiene', cadence: 'daily',
    patterns: [/\bhygiene\b/, /\bshower/, /\bbath(e|ing)?\b/, /\bbrush(ing)? (my )?teeth\b/, /\bteeth\b/, /\bdeodorant\b/] },
  { key: 'exercise', title: 'Move my body', area: 'health', cadence: 'daily',
    patterns: [/\bexercis/, /\bwork ?out/, /\bgym\b/, /\bgo for a (walk|run)\b/, /\bstretch/] },
  { key: 'hydrate', title: 'Drink water', area: 'health', cadence: 'daily',
    patterns: [/\bdrink (more )?water\b/, /\bhydrat/] },
  { key: 'meals', title: 'Eat regular meals', area: 'health', cadence: 'daily',
    patterns: [/\beat (regular|on time|breakfast|meals)\b/, /\bskip(ping)? meals\b/, /\bremember to eat\b/] },
  { key: 'dishes', title: 'Wash the dishes', area: 'home', cadence: 'daily',
    patterns: [/\bdishes\b/, /\bwash up\b/] },
  { key: 'laundry', title: 'Do laundry', area: 'laundry', cadence: 'weekly',
    patterns: [/\blaundry\b/, /\bwash(ing)? (my )?clothes\b/, /\bclothes washed\b/] },
  { key: 'tidy', title: 'Tidy the house', area: 'home', cadence: 'weekly',
    patterns: [/\btidy/, /\bvacuum/, /\bclean (the )?(house|room|kitchen|place)\b/, /\bdeclutter/] },
  { key: 'groceries', title: 'Grocery shopping', area: 'errands', cadence: 'weekly',
    patterns: [/\bgrocer/, /\bfood shop/, /\bshopping for food\b/] },
  { key: 'bills', title: 'Pay bills', area: 'finance', cadence: 'monthly',
    patterns: [/\bbills?\b/, /\bpay (the )?rent\b/, /\bmortgage\b/, /\butilities\b/] },
  { key: 'budget', title: 'Check the budget', area: 'finance', cadence: 'monthly',
    patterns: [/\bbudget/, /\bmy finances\b/, /\bcheck my money\b/, /\bspending\b/] },
  { key: 'refill', title: 'Refill prescriptions', area: 'health', cadence: 'monthly',
    patterns: [/\brefill/, /\bpharmacy\b/, /\bpick up (my )?(meds|prescription)/] },
  { key: 'oil', title: 'Oil change', area: 'vehicle', cadence: 'quarterly',
    patterns: [/\boil change\b/, /\bchange (the )?oil\b/] },
  { key: 'filters', title: 'Change air filters / HVAC', area: 'home', cadence: 'quarterly',
    patterns: [/\bair filters?\b/, /\bhvac\b/, /\bfurnace filter/, /\bac filter/, /\bair conditioning\b/] },
  { key: 'dentist', title: 'Dentist visit', area: 'health', cadence: 'biannual',
    patterns: [/\bdentist\b/, /\bteeth clean/, /\bdental\b/] },
  { key: 'carmaint', title: 'Car maintenance', area: 'vehicle', cadence: 'biannual',
    patterns: [/\b(car|vehicle) (maintenance|service|inspection)\b/, /\btires?\b/, /\bbrakes?\b/] },
  { key: 'checkup', title: 'Doctor checkup', area: 'health', cadence: 'annual',
    patterns: [/\bcheck ?up\b/, /\bphysical\b/, /\bdoctor('?s)? appointment\b/, /\bsee (my|the) doctor\b/] },
  { key: 'registration', title: 'Car registration', area: 'vehicle', cadence: 'annual',
    patterns: [/\bregistration\b/, /\bregister (the|my) car\b/, /\b(car|license) tags?\b/, /\blicense plate\b/] },
]

/** Cadence cue phrases, most-frequent first. */
const CADENCE_CUES: { cadence: Cadence; re: RegExp }[] = [
  { cadence: 'daily', re: /\b(daily|every ?day|each day|every morning|every night|every other day)\b/ },
  { cadence: 'weekly', re: /\b(weekly|every week|each week|once a week|twice a week|a few times a week)\b/ },
  { cadence: 'monthly', re: /\b(monthly|every month|each month|once a month)\b/ },
  { cadence: 'quarterly', re: /\b(quarterly|every (few|three|3|couple|couple of) months|seasonal|each season)\b/ },
  { cadence: 'biannual', re: /\b(twice a year|bi-?annual|semi-?annual|every (six|6) months)\b/ },
  { cadence: 'annual', re: /\b(annually|yearly|every year|each year|once a year|annual)\b/ },
]

/** Verbs that introduce a free-form intention we don't have in the KB. */
const INTENT_RE =
  /\b(?:i (?:want|need|have|ought|would like|wanna|gotta) to|i should|i('| a)?m trying to|get better at|work on|remember to|stop forgetting to|trouble (?:with|getting)|struggle (?:to|with)|keep forgetting to)\s+([a-z][a-z0-9 '-]{2,60})/g

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?\n]+|,? (?:and then|and also|also,?|then,?|plus)\b/i)
    .map((s) => s.trim())
    .filter(Boolean)
}

function detectCadence(text: string): Cadence | null {
  for (const cue of CADENCE_CUES) {
    if (cue.re.test(text)) return cue.cadence
  }
  return null
}

function titleCase(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'to', 'my', 'on', 'in', 'of', 'at', 'and', 'but', 'so', 'or',
  'time', 'some', 'point', 'get', 'getting', 'do', 'doing', 'more', 'better', 'i',
  'want', 'need', 'start', 'starting', 'keep', 'this', 'that', 'be', 'am', 'is',
  'every', 'each', 'day', 'week', 'month', 'year', 'daily', 'weekly', 'monthly',
])

/** Trim a free-form phrase at the first conjunction and drop trailing filler. */
function cleanPhrase(raw: string): string {
  let p = raw.trim()
  p = p.split(/\b(?:and|but|so|because|plus|then|or)\b/)[0]
  p = p.replace(/\b(at some point|some ?time|for now|today|tonight|again)\b.*$/i, '')
  return p.replace(/\s+/g, ' ').trim()
}

function contentWords(s: string): string[] {
  return norm(s)
    .split(' ')
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
}

/** True if the phrase shares a meaningful word with an already-captured title. */
function overlapsSeen(phrase: string, seen: Set<string>): boolean {
  const words = new Set(contentWords(phrase))
  // Only stopwords left — not a meaningful new item; assume it's already covered.
  if (words.size === 0) return true
  for (const title of seen) {
    if (contentWords(title).some((w) => words.has(w))) return true
  }
  return false
}

export interface AnalyzeResult {
  suggestions: Suggestion[]
  /** A short, gentle reflection of what we heard — the OT-flavoured summary. */
  reflection: string
}

/**
 * Analyze a transcript against the user's existing items.
 * `existing` is empty for the very first dump.
 */
export function analyzeDump(transcript: string, existing: Item[]): AnalyzeResult {
  const lower = ' ' + transcript.toLowerCase() + ' '
  const sentences = splitSentences(lower)
  const activeByTitle = new Map<string, Item>()
  for (const it of existing) {
    if (it.status !== 'archived') activeByTitle.set(norm(it.title), it)
  }

  const suggestions: Suggestion[] = []
  const seenTitles = new Set<string>()

  const considerTopic = (title: string, area: LifeArea, defaultCadence: Cadence, raw: string) => {
    const key = norm(title)
    if (seenTitles.has(key)) return
    seenTitles.add(key)

    // Cadence: explicit cue in the mention wins; else the topic default.
    const cued = detectCadence(raw)
    const cadence = cued ?? defaultCadence

    const existingItem = activeByTitle.get(key)
    if (existingItem) {
      // Returning dump: only surface a change if the user explicitly re-stated a
      // rhythm and it differs. Otherwise leave it completely untouched.
      if (cued && cued !== existingItem.cadence) {
        suggestions.push({
          kind: 'update',
          itemId: existingItem.id,
          field: 'cadence',
          from: existingItem.cadence,
          to: cued,
          title: existingItem.title,
          raw: raw.trim(),
        })
      }
      return
    }

    suggestions.push({
      kind: 'add',
      tempId: newId('s'),
      title,
      area,
      cadence,
      raw: raw.trim(),
    })
  }

  // 1) Known topics — find the sentence each is mentioned in (for cadence context).
  for (const topic of TOPICS) {
    const matched = topic.patterns.some((p) => p.test(lower))
    if (!matched) continue
    const sentence =
      sentences.find((s) => topic.patterns.some((p) => p.test(s))) ?? lower
    considerTopic(topic.title, topic.area, topic.cadence, sentence)
  }

  // 2) Free-form intentions not covered by the KB. Split into clauses at
  // conjunctions first, so a run-on ("...oil change and I want to read a book")
  // can't let one clause swallow the next.
  const clauses = sentences.flatMap((s) => s.split(/\b(?:and|but|then|also|plus|or)\b/))
  for (const clause of clauses) {
    INTENT_RE.lastIndex = 0
    const m = INTENT_RE.exec(clause)
    if (!m) continue
    const phrase = cleanPhrase(m[2] ?? '')
    if (!phrase || phrase.length < 3) continue
    // Skip if it clearly overlaps something we already captured.
    if (overlapsSeen(phrase, seenTitles)) continue
    const cadence = detectCadence(clause) ?? 'unsorted'
    considerTopic(titleCase(phrase), 'other', cadence, clause)
  }

  return { suggestions, reflection: buildReflection(suggestions, existing.length > 0) }
}

function buildReflection(suggestions: Suggestion[], returning: boolean): string {
  const adds = suggestions.filter((s) => s.kind === 'add').length
  const updates = suggestions.filter((s) => s.kind === 'update').length

  if (adds === 0 && updates === 0) {
    return returning
      ? "Got it — nothing new to add here. Everything else stays exactly as it was."
      : "I didn't catch anything specific yet. No worries — tap the button and just talk, even a little."
  }

  const parts: string[] = []
  if (adds > 0) parts.push(`${adds} thing${adds === 1 ? '' : 's'} to keep track of`)
  if (updates > 0) parts.push(`${updates} update${updates === 1 ? '' : 's'} to what you already had`)
  const what = parts.join(' and ')
  return returning
    ? `Heard you. I've got ${what}. Anything you didn't mention stays untouched.`
    : `Nice work getting that out. I picked up ${what}. Have a look — you're in control of all of it.`
}
