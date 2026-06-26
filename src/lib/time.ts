/**
 * Time helpers. The app detects everything itself — we never ask the user for
 * their timezone, area code, or DST. That's the whole point.
 */

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** A gentle, time-of-day greeting. No name required, but uses it if present. */
export function greeting(name?: string): string {
  const hour = new Date().getHours()
  let part: string
  if (hour < 5) part = 'Hi'
  else if (hour < 12) part = 'Good morning'
  else if (hour < 17) part = 'Good afternoon'
  else if (hour < 21) part = 'Good evening'
  else part = 'Hi'
  return name ? `${part}, ${name}` : part
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.round(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const day = Math.round(hr / 24)
  if (day === 1) return 'yesterday'
  if (day < 7) return `${day} days ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
