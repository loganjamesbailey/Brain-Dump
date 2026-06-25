/**
 * Next-smallest-step suggestions.
 *
 * Occupational therapy's core move against overwhelm: shrink a vague intention down
 * to one concrete, almost-too-small action. "Sort out the car" becomes "find the
 * last oil-change date." These are gentle prefills — the user can edit or ignore.
 */

interface Rule {
  match: RegExp
  step: string
}

const RULES: Rule[] = [
  { match: /get up|wake|alarm|morning/, step: 'Set one alarm for tomorrow.' },
  { match: /bed ?time|go to bed|sleep/, step: 'Pick a bedtime and set a wind-down alarm.' },
  { match: /medicine|medication|meds|pills/, step: 'Put tomorrow’s dose somewhere you’ll see it.' },
  { match: /refill|pharmacy|prescription/, step: 'Check how many days of meds are left.' },
  { match: /hygiene|shower|teeth|bath/, step: 'Lay out what you need tonight.' },
  { match: /laundry|wash.*clothes/, step: 'Put one load in.' },
  { match: /dishes/, step: 'Wash just the sink-front five.' },
  { match: /tidy|clean|vacuum|declutter/, step: 'Set a 5-minute timer for one surface.' },
  { match: /grocer|food shop/, step: 'Add three things to a list.' },
  { match: /bills|rent|mortgage|utilities/, step: 'Open one bill and note the due date.' },
  { match: /budget|finances|spending|money/, step: 'Check one account balance.' },
  { match: /oil change|change.*oil/, step: 'Find the last service date or mileage.' },
  { match: /registration|tags|license plate/, step: 'Find the renewal date on the card.' },
  { match: /car|vehicle|tires|brakes|maintenance/, step: 'Look up when it was last serviced.' },
  { match: /air filter|hvac|furnace/, step: 'Check the filter size on the old one.' },
  { match: /dentist|dental/, step: 'Find the number to call.' },
  { match: /doctor|checkup|physical|appointment/, step: 'Note one date you could call.' },
  { match: /exercis|work ?out|gym|walk|run|stretch/, step: 'Plan a 5-minute version.' },
  { match: /water|hydrat/, step: 'Fill one bottle and keep it close.' },
  { match: /eat|meals|breakfast/, step: 'Decide one easy thing to eat.' },
  { match: /read|book/, step: 'Open to one page.' },
  { match: /call|phone|email|message|reply/, step: 'Draft the first sentence.' },
]

const GENERIC = 'Name the very first tiny step.'

/** Suggest a small first step for an item title. Returns a gentle generic if unknown. */
export function suggestNextStep(title: string): string {
  const t = title.toLowerCase()
  for (const rule of RULES) {
    if (rule.match.test(t)) return rule.step
  }
  return GENERIC
}

/** True when we have a specific (non-generic) suggestion — lets UI offer it proactively. */
export function hasSpecificNextStep(title: string): boolean {
  return suggestNextStep(title) !== GENERIC
}
