/**
 * Cadences and life-areas — the shared vocabulary of Brain Dump.
 *
 * Cadence priming examples live here too. Before recording, we show a few gentle
 * examples per cadence so a foggy or paralyzed mind has something to grab onto.
 * These are prompts to think with — never a checklist to complete.
 */

export type Cadence =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'biannual'
  | 'annual'
  | 'unsorted'

export type LifeArea =
  | 'morning'
  | 'health'
  | 'hygiene'
  | 'home'
  | 'laundry'
  | 'finance'
  | 'vehicle'
  | 'errands'
  | 'work'
  | 'people'
  | 'leisure'
  | 'other'

export const CADENCE_ORDER: Cadence[] = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'biannual',
  'annual',
  'unsorted',
]

export const CADENCE_LABEL: Record<Cadence, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Every few months',
  biannual: 'Twice a year',
  annual: 'Yearly',
  unsorted: 'No rhythm yet',
}

export const AREA_LABEL: Record<LifeArea, string> = {
  morning: 'Mornings',
  health: 'Health & meds',
  hygiene: 'Hygiene',
  home: 'Home',
  laundry: 'Laundry & clothes',
  finance: 'Money & bills',
  vehicle: 'Car',
  errands: 'Errands',
  work: 'Work',
  people: 'People',
  leisure: 'Rest & play',
  other: 'Other',
}

/** Gentle priming examples shown before the first brain dump. */
export const CADENCE_EXAMPLES: { cadence: Cadence; examples: string[] }[] = [
  {
    cadence: 'daily',
    examples: [
      'Getting up on time',
      'Taking medicine on time',
      'Brushing teeth / hygiene',
      'Setting an alarm before bed',
    ],
  },
  {
    cadence: 'weekly',
    examples: ['Laundry', 'Washing clothes', 'Grocery run', 'Tidying up'],
  },
  {
    cadence: 'monthly',
    examples: ['Paying bills', 'Checking the budget', 'Refilling prescriptions'],
  },
  {
    cadence: 'quarterly',
    examples: ['Oil change', 'Deep clean a room', 'Reviewing goals'],
  },
  {
    cadence: 'biannual',
    examples: ['HVAC service', 'Dentist visit', 'Swapping seasonal clothes'],
  },
  {
    cadence: 'annual',
    examples: ['Car registration', 'Air-filter changes', 'Yearly checkup'],
  },
]
