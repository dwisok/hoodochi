// Weekly rules — pure functions, no DOM, no network. BRIEF v2 §3 / NFT brief §5.
// Monday: a collar goes on. Friday close: the week's return, in standard
// deviations of the ticker's own weekly moves, decides one thing:
// an item (tier 1–4), nothing, or death.
//
// THRESHOLDS ARE PROVISIONAL (BRIEF §9.3, open): to be calibrated on history
// before launch. They only shape the demo on the landing page.

import type { Bar } from './engine'
import { stdev } from './engine'
import type { Equip } from './components/Hoodochi'

export const SLOTS = ['tete', 'yeux', 'cou', 'poignet', 'main'] as const
export type Slot = (typeof SLOTS)[number]

export interface Thresholds {
  /** z at or above which each tier is reachable (index 0 = tier 1). */
  tiers: [number, number, number, number]
  /** z at or below which the Hoodochi dies. */
  death: number
}

export const THRESHOLDS: Thresholds = {
  tiers: [0.3, 0.8, 1.4, 2.0],
  death: -1.5,
}

export interface Week {
  /** Monday of the week, YYYY-MM-DD. */
  start: string
  /** Last close of the week, YYYY-MM-DD. */
  end: string
  ret: number
}

/** ISO week key (Monday-based) of a YYYY-MM-DD date. */
function weekKey(date: string): string {
  const d = new Date(date + 'T00:00:00Z')
  const day = (d.getUTCDay() + 6) % 7 // Mon = 0
  d.setUTCDate(d.getUTCDate() - day)
  return d.toISOString().slice(0, 10)
}

/** Weekly returns: last close of each week vs last close of the previous one. */
export function weeklyReturns(bars: Bar[]): Week[] {
  const closes = new Map<string, { end: string; close: number }>()
  for (const b of bars) closes.set(weekKey(b.date), { end: b.date, close: b.close })
  const keys = [...closes.keys()].sort()
  const out: Week[] = []
  for (let i = 1; i < keys.length; i++) {
    const prev = closes.get(keys[i - 1])!
    const cur = closes.get(keys[i])!
    out.push({ start: keys[i], end: cur.end, ret: cur.close / prev.close - 1 })
  }
  return out
}

export type Outcome = { kind: 'item'; tier: 1 | 2 | 3 | 4 } | { kind: 'nothing' } | { kind: 'dead' }

/** What Friday decides, from the week's z-score. */
export function outcomeOf(z: number, t: Thresholds = THRESHOLDS): Outcome {
  if (z <= t.death) return { kind: 'dead' }
  let tier = 0
  t.tiers.forEach((th, i) => {
    if (z >= th) tier = i + 1
  })
  return tier > 0 ? { kind: 'item', tier: tier as 1 | 2 | 3 | 4 } : { kind: 'nothing' }
}

/** Slots that can take an item of this tier: empty, or holding a lower tier. */
export function eligibleSlots(equip: Equip, tier: number): Slot[] {
  return SLOTS.filter((s) => (equip[s] ?? 0) < tier)
}

/** Deterministic pick (so a demo replays the same way). */
export function pickSlot(equip: Equip, tier: number, seed: number): Slot | null {
  const el = eligibleSlots(equip, tier)
  if (el.length === 0) return null
  const r = Math.abs(Math.sin(seed * 9301 + 49297) * 233280) % 1
  return el[Math.floor(r * el.length)]
}

export interface WeekResult {
  week: Week
  z: number
  sigma: number
  outcome: Outcome
  /** Slot the item went to (null when nothing / dead / no eligible slot). */
  slot: Slot | null
  equip: Equip
  alive: boolean
}

export interface Replay {
  results: WeekResult[]
  equip: Equip
  alive: boolean
  /** Total tiers acquired, 0–20 (NFT metadata "Level"). */
  level: number
  weeksPlayed: number
}

/**
 * Replays a run: one collar, every week from `fromWeek` on. Volatility is
 * estimated on the weeks before each one (min `minSample` weeks; fewer → uses
 * everything available), so a calm ticker and a wild one are judged alike.
 */
export function replay(bars: Bar[], opts: { weeks?: number; minSample?: number; seed?: number; thresholds?: Thresholds } = {}): Replay {
  const all = weeklyReturns(bars)
  const n = opts.weeks ?? 12
  const minSample = opts.minSample ?? 8
  const start = Math.max(minSample, all.length - n)
  const results: WeekResult[] = []
  let equip: Equip = {}
  let alive = true
  for (let i = start; i < all.length && alive; i++) {
    const hist = all.slice(0, i).map((w) => w.ret)
    const sigma = stdev(hist) || 0.03
    const z = all[i].ret / sigma
    const outcome = outcomeOf(z, opts.thresholds)
    let slot: Slot | null = null
    if (outcome.kind === 'item') {
      slot = pickSlot(equip, outcome.tier, (opts.seed ?? 1) * 31 + i)
      if (slot) equip = { ...equip, [slot]: outcome.tier }
    }
    if (outcome.kind === 'dead') alive = false
    results.push({ week: all[i], z, sigma, outcome, slot, equip, alive })
  }
  return { results, equip, alive, level: levelOf(equip), weeksPlayed: results.length }
}

export function levelOf(equip: Equip): number {
  return SLOTS.reduce((a, s) => a + (equip[s] ?? 0), 0)
}

/** Words for the landing page — never a number (BRIEF §6). */
export function wordFor(r: WeekResult): string {
  if (r.outcome.kind === 'dead') return 'Dead.'
  if (r.outcome.kind === 'nothing') return r.z < 0 ? 'Rough week. Kept everything.' : 'Flat week. Nothing new.'
  if (!r.slot) return 'Great week. Nothing left to wear.'
  const tier = r.outcome.tier
  return tier === 4 ? 'Exceptional week.' : tier === 3 ? 'Big week.' : tier === 2 ? 'Good week.' : 'Up week.'
}
