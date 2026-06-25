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

// Broad words that are too generic to imply two items are the same on their own
// (e.g. "house" in both "Tidy the house" and "Sell the house").
const WEAK_WORDS = new Set(['house', 'home', 'place', 'room', 'stuff', 'things', 'thing', 'area', 'list', 'routine', 'work'])

/** True if the phrase clearly refers to something already captured. */
function overlapsSeen(phrase: string, seen: Iterable<string>): boolean {
  const words = new Set(contentWords(phrase))
  // Only stopwords left — not a meaningful new item; assume it's already covered.
  if (words.size === 0) return true
  for (const title of seen) {
    const shared = contentWords(title).filter((w) => words.has(w))
    if (shared.some((w) => !WEAK_WORDS.has(w))) return true // a specific shared word
    if (shared.length >= 2) return true // or two generic ones together
  }
  return false
}

// Clause boundaries — used to keep a topic's cadence cue from bleeding in from a
// neighbouring clause ("Laundry is fine; I pay bills monthly").
const CLAUSE_BOUNDARY = /[;,]|\b(?:and|but|then|also|plus|or|while|because|so)\b/

/** First regex match (with position) of any of a topic's patterns. */
function findMatch(text: string, patterns: RegExp[]): RegExpExecArray | null {
  let best: RegExpExecArray | null = null
  for (const p of patterns) {
    const m = p.exec(text)
    if (m && (best === null || m.index < best.index)) best = m
  }
  return best
}

/**
 * Detect the cadence for a topic mention from a TIGHT window around the match:
 * a few words before and after, cut at clause boundaries. This is the fix for
 * cadence cues bleeding across items in unpunctuated speech transcripts.
 */
function cadenceForMatch(text: string, m: RegExpExecArray): Cadence | null {
  const afterClause = text.slice(m.index + m[0].length).split(CLAUSE_BOUNDARY)[0]
  const after = afterClause.trim().split(/\s+/).filter(Boolean).slice(0, 4).join(' ')
  const beforeParts = text.slice(0, m.index).split(CLAUSE_BOUNDARY)
  const before = (beforeParts[beforeParts.length - 1] ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-3)
    .join(' ')
  return detectCadence(`${before} ${m[0]} ${after}`)
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

  // Match existing items by stable topicKey first (survives renames), then title.
  const activeByTitle = new Map<string, Item>()
  const activeByKey = new Map<string, Item>()
  const activeTitles: string[] = []
  for (const it of existing) {
    if (it.status === 'archived') continue
    activeByTitle.set(norm(it.title), it)
    if (it.topicKey) activeByKey.set(it.topicKey, it)
    activeTitles.push(it.title)
  }

  const suggestions: Suggestion[] = []
  const seenTitles = new Set<string>()

  const considerTopic = (
    title: string,
    area: LifeArea,
    cued: Cadence | null,
    defaultCadence: Cadence,
    topicKey?: string,
  ) => {
    const nk = norm(title)
    if (seenTitles.has(nk)) return
    seenTitles.add(nk)

    const existingItem = (topicKey ? activeByKey.get(topicKey) : undefined) ?? activeByTitle.get(nk)
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
          raw: title,
        })
      }
      return
    }

    suggestions.push({
      kind: 'add',
      tempId: newId('s'),
      title,
      area,
      cadence: cued ?? defaultCadence,
      key: topicKey,
      raw: title,
    })
  }

  // 1) Known topics — cadence is read from a tight window around the actual match.
  for (const topic of TOPICS) {
    const m = findMatch(lower, topic.patterns)
    if (!m) continue
    considerTopic(topic.title, topic.area, cadenceForMatch(lower, m), topic.cadence, topic.key)
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
    // Skip if it overlaps something captured this dump OR an existing item.
    if (overlapsSeen(phrase, seenTitles) || overlapsSeen(phrase, activeTitles)) continue
    considerTopic(titleCase(phrase), 'other', detectCadence(clause), 'unsorted')
  }

  return { suggestions, reflection: buildReflection(suggestions, existing.length > 0) }
}

function buildReflection(suggestions: Suggestion[], returning: boolean): string {
  const adds = suggestions.filter((s) => s.kind === 'add').length
  const updates = suggestions.filter((s) => s.kind === 'update').length

  if (adds === 0 && updates === 0) {
    return returning
      ? 'Nothing new to add here. Everything else stays exactly as it was.'
      : 'Nothing specific came through yet. No worries — tap the button and just talk, even a little.'
  }

  const parts: string[] = []
  if (adds > 0) parts.push(`${adds} thing${adds === 1 ? '' : 's'} to keep track of`)
  if (updates > 0) parts.push(`${updates} update${updates === 1 ? '' : 's'} to what you already had`)
  const what = parts.join(' and ')
  return returning
    ? `${what}, captured. Anything you didn't mention stays untouched.`
    : `Nice work getting that out. ${what}, captured — have a look. You're in control of all of it.`
}
