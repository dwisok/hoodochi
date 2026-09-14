// Market maths — pure functions, no DOM, no network. The weekly rules live in week.ts.

export interface Bar {
  date: string // YYYY-MM-DD (exchange day)
  close: number
}

export function returns(closes: number[]): number[] {
  const out: number[] = []
  for (let i = 1; i < closes.length; i++) out.push(closes[i] / closes[i - 1] - 1)
  return out
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = xs.reduce((a, b) => a + b, 0) / xs.length
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)
  return Math.sqrt(v)
}

/** NYSE regular hours, Mon–Fri 9:30–16:00 New York time (holidays ignored). */
export function isMarketOpen(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const wd = get('weekday')
  if (wd === 'Sat' || wd === 'Sun') return false
  const mins = Number(get('hour')) * 60 + Number(get('minute'))
  return mins >= 9 * 60 + 30 && mins < 16 * 60
}

/** Today's mood from the day's move in standard deviations (used by the Game Boy in the rules section). */
export type DayMood = 'manic' | 'happy' | 'calm' | 'sad' | 'miserable'
export function dayMoodOf(z: number, streak: number): DayMood {
  if (streak >= 5 || z >= 1.8) return 'manic'
  if (z >= 0.5) return 'happy'
  if (z <= -1.8) return 'miserable'
  if (z <= -0.5) return 'sad'
  return 'calm'
}
