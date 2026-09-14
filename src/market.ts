// Market data — read-only public prices (BRIEF §8). Polygon.io, end-of-day.
// No key → simulated series, clearly flagged in the UI.

import type { Bar } from './engine'

export type Sector = 'tech' | 'energy' | 'consumer' | 'health' | 'finance' | 'meme' | 'industrial'

export interface Series {
  ticker: string
  bars: Bar[]
  sector: Sector
  source: 'polygon' | 'simulated'
  fetchedAt: number
}

const KEY = (import.meta.env.VITE_POLYGON_KEY as string | undefined)?.trim()
const CACHE_TTL = 60 * 60 * 1000 // 1 h — free tier is end-of-day anyway
const DAYS = 300 // calendar days of history to request (~40 weeks: 12 played + volatility sample)

export const hasKey = () => Boolean(KEY)

// Known tickers → sector, so the common ones need no extra call.
const KNOWN: Record<string, Sector> = {
  NVDA: 'tech', AAPL: 'tech', MSFT: 'tech', AMD: 'tech', PLTR: 'tech', META: 'tech', GOOGL: 'tech', AMZN: 'consumer',
  TSLA: 'consumer', KO: 'consumer', DIS: 'consumer', MCD: 'consumer', NKE: 'consumer', F: 'industrial',
  XOM: 'energy', CVX: 'energy', OXY: 'energy',
  PFE: 'health', JNJ: 'health', LLY: 'health',
  JPM: 'finance', GS: 'finance', BAC: 'finance', HOOD: 'finance', COIN: 'finance',
  GME: 'meme', AMC: 'meme', BBBY: 'meme',
  BA: 'industrial', CAT: 'industrial', GE: 'industrial',
}

/** Rough SIC description → sector. Only used for tickers not in KNOWN. */
function sectorFromSic(desc: string | undefined): Sector {
  const d = (desc ?? '').toLowerCase()
  if (/software|semiconductor|computer|electronic|internet|data|telecom/.test(d)) return 'tech'
  if (/oil|gas|petrol|energy|coal|mining/.test(d)) return 'energy'
  if (/pharma|medic|drug|health|biolog|hospital/.test(d)) return 'health'
  if (/bank|finance|insurance|security|broker|invest/.test(d)) return 'finance'
  if (/retail|food|beverage|apparel|restaurant|motor vehicle|consumer/.test(d)) return 'consumer'
  if (/aircraft|machinery|construction|industrial|manufactur/.test(d)) return 'industrial'
  return 'tech'
}

function cacheKey(t: string) {
  return `hoodochi:series:${t}`
}

function readCache(t: string): Series | null {
  try {
    const raw = localStorage.getItem(cacheKey(t))
    if (!raw) return null
    const s = JSON.parse(raw) as Series
    if (Date.now() - s.fetchedAt > CACHE_TTL) return null
    return s
  } catch {
    return null
  }
}

function writeCache(s: Series) {
  try {
    localStorage.setItem(cacheKey(s.ticker), JSON.stringify(s))
  } catch {
    /* private mode etc. */
  }
}

function isoDaysAgo(n: number) {
  const d = new Date(Date.now() - n * 86400000)
  return d.toISOString().slice(0, 10)
}

interface PolyAgg {
  t: number
  c: number
}

async function fetchPolygon(ticker: string): Promise<Series> {
  const from = isoDaysAgo(DAYS)
  const to = isoDaysAgo(0)
  const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=500&apiKey=${KEY}`
  const res = await fetch(url)
  if (res.status === 429) throw new Error('rate-limited')
  if (!res.ok) throw new Error(`polygon ${res.status}`)
  const json = (await res.json()) as { results?: PolyAgg[]; resultsCount?: number }
  const results = json.results ?? []
  if (results.length < 5) throw new Error('unknown-ticker')
  const bars: Bar[] = results.map((r) => ({ date: new Date(r.t).toISOString().slice(0, 10), close: r.c }))

  let sector = KNOWN[ticker]
  if (!sector) {
    try {
      const d = await fetch(`https://api.polygon.io/v3/reference/tickers/${encodeURIComponent(ticker)}?apiKey=${KEY}`)
      const j = (await d.json()) as { results?: { sic_description?: string } }
      sector = sectorFromSic(j.results?.sic_description)
    } catch {
      sector = 'tech'
    }
  }
  return { ticker, bars, sector, source: 'polygon', fetchedAt: Date.now() }
}

// ---- simulated fallback --------------------------------------------------

function hash(s: string) {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A plausible random walk with the ticker's flavour (meme = wild, consumer = calm). */
export function simulated(ticker: string): Series {
  const sector = KNOWN[ticker] ?? 'tech'
  const volBySector: Record<Sector, number> = {
    meme: 0.06, tech: 0.025, energy: 0.018, consumer: 0.012, health: 0.014, finance: 0.016, industrial: 0.015,
  }
  const driftBySector: Record<Sector, number> = {
    meme: -0.0005, tech: 0.0008, energy: 0.0002, consumer: 0.0002, health: 0.0001, finance: 0.0003, industrial: 0.0002,
  }
  const rnd = mulberry(hash(ticker))
  const gauss = () => {
    const u = 1 - rnd()
    const v = rnd()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  const vol = volBySector[sector]
  const drift = driftBySector[sector]
  const bars: Bar[] = []
  let price = 40 + rnd() * 400
  // walk back ~140 trading days, weekdays only
  const d = new Date()
  const days: string[] = []
  while (days.length < 140) {
    const wd = d.getUTCDay()
    if (wd !== 0 && wd !== 6) days.unshift(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() - 1)
  }
  for (const date of days) {
    price *= 1 + drift + vol * gauss()
    bars.push({ date, close: Math.max(0.5, price) })
  }
  return { ticker, bars, sector, source: 'simulated', fetchedAt: Date.now() }
}

// ---- public ----------------------------------------------------------------

const inflight = new Map<string, Promise<Series>>()

export function loadSeries(rawTicker: string): Promise<Series> {
  const ticker = rawTicker.trim().toUpperCase()
  if (!/^[A-Z.]{1,6}$/.test(ticker)) return Promise.reject(new Error('bad-ticker'))
  if (!KEY) return Promise.resolve(simulated(ticker))
  const cached = readCache(ticker)
  if (cached) return Promise.resolve(cached)
  let p = inflight.get(ticker)
  if (!p) {
    p = fetchPolygon(ticker)
      .then((s) => {
        writeCache(s)
        return s
      })
      .finally(() => inflight.delete(ticker))
    inflight.set(ticker, p)
  }
  return p
}

export const SECTOR_COLOR: Record<Sector, string> = {
  tech: '#a7c7ff',
  energy: '#ffd28a',
  consumer: '#ffb3c1',
  health: '#b8e8c0',
  finance: '#d6c7ff',
  meme: '#ffe27a',
  industrial: '#d9d9d9',
}
