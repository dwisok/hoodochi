#!/usr/bin/env node
// Friday settlement for Hoodochi v2 (BRIEF §3).
//
// For every staked, alive, collared Hoodochi: read the week's return of its
// ticker, divide by the ticker's own weekly volatility (σ over the previous
// 52 weeks), and send z10 = round(z × 10) to settleWeek. The contract decides
// item / nothing / death from its own thresholds. Yield units are abstract
// (BRIEF §2.4, legal review pending): units = z × 0.02 × 1e6 on an up week.
//
// Idempotent: a Hoodochi already settled since this week's Friday close
// (Settled event) is skipped, so running twice does not count a week twice.
//
//   node keeper/settle.mjs               dry run, this week
//   node keeper/settle.mjs --send        broadcast (needs KEEPER_PRIVATE_KEY)
//   --date 2026-09-18   settle the week containing that date
//   --all               dry-run every collared Hoodochi, staked or not (for testing)
//   --rpc URL  --hoodochi 0x…  --force (ignore the "market still open" guard)
//
// Prices: POLYGON_KEY if set, else Yahoo Finance, else Stooq. Daily closes, 2 years.

import { createPublicClient, createWalletClient, http, parseAbi, hexToString, defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const args = process.argv.slice(2)
const flag = (n) => args.includes(n)
const opt = (n, d) => {
  const i = args.indexOf(n)
  return i >= 0 && args[i + 1] ? args[i + 1] : d
}

const RPC = opt('--rpc', process.env.RPC_URL || 'https://rpc.mainnet.chain.robinhood.com')
const HOOD = opt('--hoodochi', process.env.HOODOCHI_ADDRESS || '0x23409CaD886380f066329eF237a37d55950AF9Ad')
const SEND = flag('--send')
const ALL = flag('--all')
const FORCE = flag('--force')
const DATE = opt('--date', new Date().toISOString().slice(0, 10))
const UNIT = 1_000_000
const MIN_SAMPLE = 20
const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11'

const ABI = parseAbi([
  'function totalMinted() view returns (uint256)',
  'function keeper() view returns (address)',
  'function petOf(uint256 id) view returns (uint256 collarId, bytes8 ticker, bool staked, bool alive, uint32 weeksPlayed, uint8[5] slots, uint8 level, int16 lastZ10, uint256 pending, bytes8 deathTicker)',
  'function settleWeek(uint256[] ids, int16[] z10, uint256[] units)',
  'event Settled(uint256 indexed id, int16 z10, uint8 slot, uint8 tier, uint256 yieldUnits)',
])

const log = (...a) => console.log(...a)
const b8 = (h) => hexToString(h, { size: 8 }).replace(/\0+$/g, '')

// ---- dates ------------------------------------------------------------------
const weekKey = (date) => {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}
const addDays = (date, n) => {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// ---- prices -----------------------------------------------------------------
const UA = { 'user-agent': 'Mozilla/5.0 (hoodochi keeper)' }

async function fromPolygon(t, key) {
  const to = new Date().toISOString().slice(0, 10)
  const from = addDays(to, -800)
  const r = await fetch(`https://api.polygon.io/v2/aggs/ticker/${t}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${key}`)
  if (!r.ok) throw new Error(`polygon ${r.status}`)
  const j = await r.json()
  if (!j.results?.length) throw new Error('polygon: no results')
  return j.results.map((x) => ({ date: new Date(x.t).toISOString().slice(0, 10), close: x.c }))
}

async function fromYahoo(t) {
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(t)}?range=2y&interval=1d&events=div%2Csplit`, { headers: UA })
  if (!r.ok) throw new Error(`yahoo ${r.status}`)
  const j = await r.json()
  const res = j.chart?.result?.[0]
  if (!res) throw new Error('yahoo: no result')
  const ts = res.timestamp
  const closes = res.indicators?.adjclose?.[0]?.adjclose ?? res.indicators?.quote?.[0]?.close
  const out = []
  ts.forEach((s, i) => {
    if (closes[i] != null) out.push({ date: new Date(s * 1000).toISOString().slice(0, 10), close: closes[i] })
  })
  if (out.length < 60) throw new Error('yahoo: too short')
  return out
}

async function fromStooq(t) {
  const r = await fetch(`https://stooq.com/q/d/l/?s=${t.toLowerCase()}.us&i=d`, { headers: UA })
  if (!r.ok) throw new Error(`stooq ${r.status}`)
  const txt = await r.text()
  const rows = txt.trim().split('\n').slice(1)
  const out = rows
    .map((l) => l.split(','))
    .filter((c) => c.length >= 5 && !Number.isNaN(Number(c[4])))
    .map((c) => ({ date: c[0], close: Number(c[4]) }))
  if (out.length < 60) throw new Error('stooq: too short / limit')
  return out.slice(-800)
}

async function closes(ticker) {
  const errs = []
  if (process.env.POLYGON_KEY) {
    try {
      return { bars: await fromPolygon(ticker, process.env.POLYGON_KEY), source: 'polygon' }
    } catch (e) {
      errs.push(e.message)
    }
  }
  for (const [name, fn] of [
    ['yahoo', fromYahoo],
    ['stooq', fromStooq],
  ]) {
    try {
      return { bars: await fn(ticker), source: name }
    } catch (e) {
      errs.push(e.message)
    }
  }
  throw new Error(errs.join(' | '))
}

/** Weekly returns keyed by the Monday of the week: last close of the week vs last close of the week before. */
function weekly(bars) {
  const last = new Map()
  for (const b of bars) last.set(weekKey(b.date), { end: b.date, close: b.close })
  const keys = [...last.keys()].sort()
  const out = []
  for (let i = 1; i < keys.length; i++) out.push({ start: keys[i], end: last.get(keys[i]).end, ret: last.get(keys[i]).close / last.get(keys[i - 1]).close - 1 })
  return out
}

const stdev = (xs) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1))
}

/** z-score of the target week for one ticker, or a reason it cannot be settled. */
function scoreWeek(bars, monday) {
  const weeks = weekly(bars)
  const i = weeks.findIndex((w) => w.start === monday)
  if (i < 0) return { skip: 'no close for that week yet' }
  const hist = weeks.slice(Math.max(0, i - 52), i).map((w) => w.ret)
  if (hist.length < MIN_SAMPLE) return { skip: `history too short (${hist.length} weeks)` }
  const sigma = stdev(hist)
  if (!(sigma > 0)) return { skip: 'zero volatility' }
  const w = weeks[i]
  const z = w.ret / sigma
  const z10 = Math.max(-32768, Math.min(32767, Math.round(z * 10)))
  const units = z > 0 ? Math.round(z * 0.02 * UNIT) : 0
  return { end: w.end, ret: w.ret, sigma, z, z10, units }
}

// ---- chain ------------------------------------------------------------------
async function blockAt(pub, ts) {
  // first block with timestamp >= ts, by bisection
  let lo = 0n
  let hi = await pub.getBlockNumber()
  const t0 = Number((await pub.getBlock({ blockNumber: hi })).timestamp)
  if (t0 < ts) return hi
  while (lo < hi) {
    const mid = (lo + hi) / 2n
    const b = await pub.getBlock({ blockNumber: mid })
    if (Number(b.timestamp) < ts) lo = mid + 1n
    else hi = mid
  }
  return lo
}

async function main() {
  const monday = weekKey(DATE)
  const friday = addDays(monday, 4)
  const closeTs = Date.UTC(...friday.split('-').map((x, i) => (i === 1 ? Number(x) - 1 : Number(x))), 20, 30) / 1000 // 16:30 New York in summer, 15:30 in winter: after the close either way
  log(`week ${monday} → ${friday}  (${SEND ? 'BROADCAST' : 'dry run'})`)
  if (Date.now() / 1000 < closeTs && !FORCE) {
    log('the market has not closed for this week yet; pass --date for a previous week or --force')
    process.exit(2)
  }

  const chainId = await createPublicClient({ transport: http(RPC) }).getChainId()
  const chain = defineChain({
    id: chainId,
    name: chainId === 4663 ? 'Robinhood Chain' : `chain ${chainId}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [RPC] } },
    contracts: { multicall3: { address: MULTICALL3 } },
  })
  const pub = createPublicClient({ chain, transport: http(RPC, { retryCount: 3 }) })
  const hood = { address: HOOD, abi: ABI }

  const [total, keeper] = await pub.multicall({ contracts: [{ ...hood, functionName: 'totalMinted' }, { ...hood, functionName: 'keeper' }], allowFailure: false })
  const n = Number(total)
  log(`chain ${chainId} · hoodochi ${HOOD} · minted ${n} · keeper ${keeper}`)
  if (n === 0) return log('nothing minted yet')

  const ids = Array.from({ length: n }, (_, i) => i + 1)
  const pets = await pub.multicall({ contracts: ids.map((id) => ({ ...hood, functionName: 'petOf', args: [BigInt(id)] })), allowFailure: true, batchSize: 16_384 })
  const candidates = []
  ids.forEach((id, i) => {
    if (pets[i].status !== 'success') return
    const [collarId, ticker, staked, alive] = pets[i].result
    if (!alive || collarId === 0n) return
    if (!staked && !ALL) return
    candidates.push({ id, ticker: b8(ticker), staked })
  })
  log(`candidates: ${candidates.length}${ALL ? ' (--all: staked or not)' : ' staked'}`)
  if (!candidates.length) return

  // already settled since this week's close?
  const fromBlock = await blockAt(pub, closeTs)
  const settled = new Set()
  try {
    const logs = await pub.getContractEvents({ ...hood, eventName: 'Settled', fromBlock, toBlock: 'latest' })
    for (const l of logs) settled.add(Number(l.args.id))
  } catch (e) {
    log('cannot read Settled events, refusing to risk a double settlement:', e.message.split('\n')[0])
    process.exit(3)
  }

  const byTicker = new Map()
  for (const c of candidates) byTicker.set(c.ticker, null)
  for (const t of byTicker.keys()) {
    try {
      const { bars, source } = await closes(t)
      byTicker.set(t, { ...scoreWeek(bars, monday), source })
    } catch (e) {
      byTicker.set(t, { skip: `no price data (${e.message})` })
    }
  }

  const rows = []
  for (const c of candidates) {
    const s = byTicker.get(c.ticker)
    if (settled.has(c.id)) rows.push({ ...c, skip: 'already settled this week' })
    else if (s.skip) rows.push({ ...c, skip: s.skip })
    else rows.push({ ...c, ...s })
  }
  log('')
  log(' id   ticker  stk   week-end     ret      σ       z    z10    units   source / reason')
  for (const r of rows) {
    if (r.skip) log(`${String(r.id).padStart(3)}   ${r.ticker.padEnd(6)}  ${r.staked ? 'yes' : 'no '}   —            skip: ${r.skip}`)
    else log(`${String(r.id).padStart(3)}   ${r.ticker.padEnd(6)}  ${r.staked ? 'yes' : 'no '}   ${r.end}   ${(r.ret * 100).toFixed(2).padStart(6)}%  ${(r.sigma * 100).toFixed(2).padStart(5)}%  ${r.z.toFixed(2).padStart(6)}  ${String(r.z10).padStart(4)}  ${String(r.units).padStart(7)}   ${r.source}`)
  }
  const go = rows.filter((r) => !r.skip && r.staked)
  log('')
  log(`${go.length} to settle`)
  if (!SEND || !go.length) return log(SEND ? 'nothing to send' : 'dry run: nothing sent (add --send)')

  const pk = process.env.KEEPER_PRIVATE_KEY || process.env.PRIVATE_KEY
  if (!pk) throw new Error('KEEPER_PRIVATE_KEY missing')
  const account = privateKeyToAccount(pk.startsWith('0x') ? pk : `0x${pk}`)
  if (account.address.toLowerCase() !== keeper.toLowerCase()) throw new Error(`key is ${account.address}, contract keeper is ${keeper}`)
  const wallet = createWalletClient({ account, chain, transport: http(RPC) })
  for (let i = 0; i < go.length; i += 100) {
    const batch = go.slice(i, i + 100)
    const hash = await wallet.writeContract({ ...hood, functionName: 'settleWeek', args: [batch.map((r) => BigInt(r.id)), batch.map((r) => r.z10), batch.map((r) => BigInt(r.units))] })
    log(`sent ${hash} (${batch.length} ids)`)
    const rc = await pub.waitForTransactionReceipt({ hash })
    log(`  ${rc.status} in block ${rc.blockNumber}, gas ${rc.gasUsed}`)
    if (rc.status !== 'success') process.exit(4)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
