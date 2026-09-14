import { useCallback, useEffect, useRef, useState } from 'react'
import { SpriteGroup } from './Sprite'
import { LCD, LCD_PALETTE } from '../sprites'
import type { Mood } from '../sprites'
import { useTicker } from '../hooks'
import { loadSeries } from '../market'
import type { Series } from '../market'
import { returns, stdev, dayMoodOf } from '../engine'
import { useBackend, fmtUnits, fmtEth } from '../wallet'
import type { Pet } from '../wallet'
import { itemName } from '../items'
import { CHAIN } from '../chain'

// ---- the Game Boy -----------------------------------------------------------
// The handheld IS the app. Screens are driven by the D-pad, A and B (click or
// keyboard). With contract addresses in .env.local and a wallet, every action is a
// real transaction on Robinhood Chain; otherwise the same loop runs in demo mode.
//
//   TITLE ─A─▶ MENU (your Hoodochi / MINT) ─A─▶ PET
//   PET: COLLAR (pick the ticker) · STAKE / UNSTAKE · PLAY (hop the candles) · CLAIM
//   The hop game is decorative: coins caught are just a score for the session.

const W = 160
const H = 144
const CW = 18
const BODY_W = 10
const SPRITE_X = 46
const GROUND_Y = 92
const STAND_TICKS = 16
const JUMP_TICKS = 12
const GROW_TICKS = 8
const JUMP_H = 22
const COIN_RATE = 0.28
const COIN_D = 30
const COIN_LIFT = 34
const SPIN = [30, 30, 30, 28, 24, 18, 10, 4, 2, 4, 10, 18, 24, 28, 30, 30]
const PX_PER_PCT = 5
const LOOP_DAYS = 90

export const DEVICE_TICKER = 'NVDA'
const TICKERS = ['NVDA', 'TSLA', 'GME', 'KO', 'AAPL', 'AMD', 'XOM', 'MSFT', 'META', 'PLTR', 'JPM', 'PFE', 'HOOD', 'COIN', 'DIS', 'F']

interface Coin {
  ticker: string
  taken: number
}
interface Candle {
  i: number
  open: number
  close: number
  grow: number
  coin?: Coin
  mood?: Mood
  label?: string
}
interface Sim {
  candles: Candle[]
  k: number
  phase: 'stand' | 'jump'
  t: number
  camX: number
  camY: number
  squash: number
  joy: number
  tick: number
  seed: number
  ticker?: string
  real?: Candle[]
  /** manual: only jumps when A is pressed */
  manual: boolean
  score: number
}

function rnd(sim: Sim) {
  sim.seed = (sim.seed * 1103515245 + 12345) & 0x7fffffff
  return sim.seed / 0x7fffffff
}

function makeCandle(sim: Sim, i: number, open: number, prevHadCoin: boolean): Candle {
  const rise = 5 + Math.floor(rnd(sim) * 12)
  const c: Candle = { i, open, close: open + rise, grow: 0 }
  if (i > 1 && !prevHadCoin && rnd(sim) < COIN_RATE) c.coin = { ticker: TICKERS[Math.floor(rnd(sim) * 8)], taken: 0 }
  return c
}

function newSim(): Sim {
  const sim: Sim = { candles: [], k: 0, phase: 'stand', t: 0, camX: 0, camY: 0, squash: 0, joy: 0, tick: 0, seed: 4711, manual: false, score: 0 }
  let open = 20
  for (let i = 0; i < 12; i++) {
    const prev = sim.candles[sim.candles.length - 1]
    const c = makeCandle(sim, i, open, !!prev?.coin)
    c.grow = i === 0 ? 1 : 0
    sim.candles.push(c)
    open = c.close
  }
  sim.camX = candleX(0) - SPRITE_X - 12 + CW / 2
  sim.camY = sim.candles[0].close
  return sim
}

function realCandles(series: Series): Candle[] {
  const bars = series.bars.slice(-(LOOP_DAYS + 25))
  const closes = bars.map((b) => b.close)
  const rets = returns(closes)
  const out: Candle[] = []
  let open = 20
  let prevCoin = false
  const start = Math.max(0, rets.length - LOOP_DAYS)
  for (let i = start; i < rets.length; i++) {
    const r = rets[i]
    const vol = stdev(rets.slice(Math.max(0, i - 40), i + 1)) || 0.01
    const z = r / vol
    const dm = dayMoodOf(z, 0)
    const c: Candle = { i: out.length, open, close: open + r * 100 * PX_PER_PCT, grow: 0, mood: dm === 'miserable' ? 'sad' : dm, label: bars[i + 1].date.slice(5).replace('-', '/') }
    if (z >= 1 && !prevCoin) c.coin = { ticker: series.ticker, taken: 0 }
    prevCoin = Boolean(c.coin)
    out.push(c)
    open = c.close
  }
  return out
}

function attachReal(sim: Sim, series: Series) {
  const real = realCandles(series)
  if (real.length < 10) return
  sim.real = real
  sim.ticker = series.ticker
  restart(sim)
}

function restart(sim: Sim) {
  if (sim.real) {
    sim.candles = sim.real.map((c) => ({ ...c, coin: c.coin ? { ...c.coin } : undefined }))
  } else {
    sim.candles = []
    let open = 20
    for (let i = 0; i < 12; i++) {
      const prev = sim.candles[sim.candles.length - 1]
      const c = makeCandle(sim, i, open, !!prev?.coin)
      sim.candles.push(c)
      open = c.close
    }
  }
  sim.candles[0].grow = 1
  sim.k = 0
  sim.phase = 'stand'
  sim.t = 0
  sim.score = 0
  sim.camX = candleX(0) - SPRITE_X - 12 + CW / 2
  sim.camY = sim.candles[0].close
}

const candleX = (i: number) => i * CW
const topOf = (c: Candle) => c.open + (c.close - c.open) * c.grow

function jump(sim: Sim) {
  const cur = sim.candles[sim.k]
  if (sim.phase === 'stand' && cur.grow >= 1) {
    sim.phase = 'jump'
    sim.t = 0
  }
}

function step(sim: Sim) {
  const cur = sim.candles[sim.k]
  const nxt = sim.candles[sim.k + 1]
  while (sim.candles.length < sim.k + 12) {
    const last = sim.candles[sim.candles.length - 1]
    if (sim.real) {
      const src = sim.real[sim.candles.length % sim.real.length]
      const delta = src.close - src.open
      sim.candles.push({ ...src, i: last.i + 1, open: last.close, close: last.close + delta, grow: 0, coin: src.coin ? { ...src.coin, taken: 0 } : undefined })
    } else {
      sim.candles.push(makeCandle(sim, last.i + 1, last.close, !!last.coin))
    }
  }
  if (cur.grow < 1) {
    cur.grow = Math.min(1, cur.grow + 1 / GROW_TICKS)
    if (cur.grow === 1) sim.squash = 3
  }
  sim.tick++
  sim.t++
  if (sim.phase === 'stand') {
    if (!sim.manual && cur.grow >= 1 && sim.t >= STAND_TICKS) jump(sim)
  } else if (sim.t >= JUMP_TICKS) {
    sim.k++
    sim.phase = 'stand'
    sim.t = 0
    sim.squash = 2
    nxt.grow = Math.max(nxt.grow, 0.01)
    if (nxt.coin && nxt.coin.taken === 0) {
      nxt.coin.taken = 1
      sim.joy = 24
      sim.score++
    }
  }
  sim.candles.forEach((c) => {
    if (c.coin && c.coin.taken > 0) c.coin.taken++
  })
  if (sim.joy > 0) sim.joy--
  if (sim.squash > 0) sim.squash--
  const pos = creaturePos(sim)
  const targetX = pos.x - SPRITE_X - 12
  const targetY = pos.y
  sim.camX += Math.round((targetX - sim.camX) / 3)
  sim.camY += Math.round((targetY - sim.camY) / 4)
}

function creaturePos(sim: Sim) {
  const cur = sim.candles[sim.k]
  const x0 = candleX(sim.k) + CW / 2
  if (sim.phase === 'stand') return { x: x0, y: topOf(cur), air: 0 }
  const nxt = sim.candles[sim.k + 1]
  const u = sim.t / JUMP_TICKS
  const x1 = candleX(sim.k + 1) + CW / 2
  const y = topOf(cur) + (topOf(nxt) - topOf(cur)) * u + JUMP_H * 4 * u * (1 - u)
  return { x: x0 + (x1 - x0) * u, y, air: 1 }
}

const sx = (sim: Sim, x: number) => Math.round(x - sim.camX)
const sy = (sim: Sim, price: number) => Math.round(GROUND_Y - (price - sim.camY))

// ---- screens ------------------------------------------------------------------

type Screen = 'title' | 'menu' | 'mint' | 'pet' | 'collar' | 'play' | 'claim' | 'friday' | 'msg'
type Key = 'up' | 'down' | 'left' | 'right' | 'a' | 'b'

const PET_ACTIONS = ['COLLAR', 'STAKE', 'PLAY', 'CLAIM', 'FRIDAY'] as const

function T({ x, y, children, end, dim, big }: { x: number; y: number; children: React.ReactNode; end?: boolean; dim?: boolean; big?: boolean }) {
  return (
    <text x={x} y={y} className={big ? 'lcd-big' : 'lcd-text'} fill={dim ? LCD.dark : LCD.ink} textAnchor={end ? 'end' : 'start'}>
      {children}
    </text>
  )
}

function Cursor({ y, blink }: { y: number; blink: number }) {
  if (Math.floor(blink / 8) % 2) return null
  return <rect x={6} y={y - 6} width={4} height={6} fill={LCD.ink} />
}

/** A tappable button drawn on the LCD. Primary = filled. */
function Btn({ x, y, w, h = 16, label, onClick, primary, disabled }: { x: number; y: number; w: number; h?: number; label: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <g className={`lcd-btn ${disabled ? 'off' : ''}`} onClick={disabled ? undefined : onClick} role="button" aria-label={label} tabIndex={-1}>
      <rect x={x} y={y} width={w} height={h} fill={primary ? LCD.ink : LCD.bg} stroke={LCD.ink} strokeWidth={2} />
      {primary && <rect x={x + 2} y={y + h} width={w} height={2} fill={LCD.ink} opacity={0.5} />}
      <text x={x + w / 2} y={y + h / 2 + 4} className="lcd-text" fill={primary ? LCD.bg : LCD.ink} textAnchor="middle">
        {label}
      </text>
    </g>
  )
}

/** A tappable list row. Selected = inverted. */
function Row({ y, label, selected, onClick, right }: { y: number; label: string; selected: boolean; onClick: () => void; right?: string }) {
  return (
    <g className="lcd-row" onClick={onClick} role="button" aria-label={label} tabIndex={-1}>
      <rect className="row-bg" x={8} y={y} width={W - 16} height={12} fill={selected ? LCD.ink : LCD.bg} />
      <text x={14} y={y + 9} className="lcd-text" fill={selected ? LCD.bg : LCD.ink}>
        {selected ? '> ' : '  '}
        {label}
      </text>
      {right && (
        <text x={W - 12} y={y + 9} className="lcd-text" fill={selected ? LCD.bg : LCD.dark} textAnchor="end">
          {right}
        </text>
      )}
    </g>
  )
}

export function Device() {
  const be = useBackend()
  const simRef = useRef<Sim>(newSim())
  const lastTick = useRef(0)
  const tick = useTicker(30)
  const [, force] = useState(0)
  const [screen, setScreen] = useState<Screen>('title')
  const [cursor, setCursor] = useState(0)
  const [petId, setPetId] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ title: string; lines: string[]; back: Screen }>({ title: '', lines: [], back: 'menu' })
  const seriesRef = useRef<Record<string, Series>>({})

  const pet: Pet | null = be.pets.find((p) => p.id === petId) ?? null

  // real closes for the hop game: the collar's ticker, else NVDA
  const loadChart = useCallback((ticker: string) => {
    const cached = seriesRef.current[ticker]
    if (cached) {
      attachReal(simRef.current, cached)
      return
    }
    loadSeries(ticker)
      .then((s) => {
        seriesRef.current[ticker] = s
        attachReal(simRef.current, s)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadChart(DEVICE_TICKER)
  }, [loadChart])

  useEffect(() => {
    const n = Math.min(6, Math.max(1, tick - lastTick.current))
    lastTick.current = tick
    const sim = simRef.current
    if (screen === 'title' || screen === 'play') for (let i = 0; i < n; i++) step(sim)
    force((v) => v + 1)
  }, [tick, screen])

  const go = (s: Screen, c = 0) => {
    setScreen(s)
    setCursor(c)
  }
  const say = (title: string, lines: string[], back: Screen = 'pet') => {
    setMsg({ title, lines, back })
    setScreen('msg')
  }

  // ---- input ----------------------------------------------------------------
  const press = useCallback(
    (k: Key, at?: number) => {
      const sim = simRef.current
      if (be.busy) return
      const c = at ?? cursor
      if (at !== undefined) setCursor(at)
      switch (screen) {
        case 'title':
          if (k === 'a') {
            if (be.mode === 'chain' && be.status === 'none') window.open('https://metamask.io/download/', '_blank', 'noopener')
            else if (be.mode === 'chain' && be.status !== 'ready') void be.connect().then(() => setScreen('menu'))
            else go('menu')
          }
          break
        case 'menu': {
          const n = be.pets.length + 1 // pets + MINT
          if (k === 'up') setCursor((c) => (c + n - 1) % n)
          if (k === 'down') setCursor((c) => (c + 1) % n)
          if (k === 'b') go('title')
          if (k === 'a') {
            if (c < be.pets.length) {
              setPetId(be.pets[c].id)
              go('pet')
            } else go('mint')
          }
          break
        }
        case 'mint':
          if (k === 'b') go('menu')
          if (k === 'a') {
            void be
              .mint()
              .then((id) => {
                if (id) {
                  setPetId(id)
                  say(`#${id} IS YOURS`, ['NAKED. NO COLLAR.', 'PICK IT A STOCK.'], 'pet')
                }
              })
              .catch(() => {})
          }
          break
        case 'pet': {
          const n = PET_ACTIONS.length - (be.mode === 'demo' ? 0 : 1) // FRIDAY only in demo
          if (k === 'up') setCursor((c) => (c + n - 1) % n)
          if (k === 'down') setCursor((c) => (c + 1) % n)
          if (k === 'b') go('menu')
          if (k === 'a' && pet) {
            const act = PET_ACTIONS[c]
            if (act === 'COLLAR') {
              if (!pet.alive) say('DEAD.', ['NO NEW COLLAR.', 'MINT ANOTHER.'])
              else if (pet.staked) say('STAKED.', ['UNSTAKE FIRST', 'TO SWAP STOCK.'])
              else go('collar', Math.max(0, TICKERS.indexOf(pet.ticker ?? 'NVDA')))
            } else if (act === 'STAKE') {
              if (!pet.alive) say('DEAD.', ['IT DOES NOT PLAY', 'ANYMORE.'])
              else if (!pet.ticker) say('NO COLLAR.', ['PICK A STOCK', 'FIRST.'])
              else if (pet.staked) void be.unstake(pet.id).then(() => say('UNSTAKED.', ['IT SLEEPS.', 'LOOT STAYS.'])).catch(() => {})
              else void be.stake(pet.id).then(() => say(`STAKED ON ${pet.ticker}`, ['EARNING ' + pet.ticker, 'FRIDAY DECIDES.'])).catch(() => {})
            } else if (act === 'PLAY') {
              sim.manual = true
              loadChart(pet.ticker ?? DEVICE_TICKER)
              restart(sim)
              go('play')
            } else if (act === 'CLAIM') {
              go('claim')
            } else if (act === 'FRIDAY') {
              if (!pet.staked) say('NOT STAKED.', ['NOTHING TO', 'SETTLE.'])
              else {
                be.demoFriday(pet.id)
                go('friday')
              }
            }
          }
          break
        }
        case 'collar':
          if (k === 'up' || k === 'left') setCursor((c) => (c + TICKERS.length - 1) % TICKERS.length)
          if (k === 'down' || k === 'right') setCursor((c) => (c + 1) % TICKERS.length)
          if (k === 'b') go('pet', 0)
          if (k === 'a' && pet) {
            const t = TICKERS[c]
            void be
              .setCollar(pet.id, t)
              .then(() => {
                loadChart(t)
                say(`${t} COLLAR ON`, ['NOW STAKE IT.', 'OR SWAP.'])
              })
              .catch(() => {})
          }
          break
        case 'play':
          if (k === 'a') jump(sim)
          if (k === 'b') {
            sim.manual = false
            go('pet', 2)
          }
          break
        case 'claim':
          if (k === 'b') go('pet', 3)
          if (k === 'a' && pet) {
            if (pet.pending === 0n) say('NOTHING', ['TO CLAIM YET.', 'PLAY A WEEK.'])
            else {
              const t = pet.ticker ?? pet.deathTicker ?? '?'
              const u = fmtUnits(pet.pending)
              void be.claim(pet.id).then(() => say('CLAIMED', [`${u} ${t}`, 'IN YOUR LEDGER.'])).catch(() => {})
            }
          }
          break
        case 'friday':
          if (k === 'a' || k === 'b') go('pet', 4)
          break
        case 'msg':
          if (k === 'a' || k === 'b') go(msg.back, 0)
          break
      }
    },
    [screen, cursor, be, pet, msg.back, loadChart],
  )

  const onKeyDown = (e: React.KeyboardEvent) => {
    const map: Record<string, Key> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'a', z: 'a', Z: 'a', ' ': 'a', Backspace: 'b', x: 'b', X: 'b', Escape: 'b' }
    const k = map[e.key]
    if (k) {
      e.preventDefault()
      press(k)
    }
  }

  // ---- render -----------------------------------------------------------------
  const sim = simRef.current
  const pos = creaturePos(sim)
  const feetY = sy(sim, pos.y)
  const frame: 0 | 1 = pos.air || sim.squash > 0 ? 1 : 0
  const cur = sim.candles[sim.k]
  const mood: Mood = sim.joy > 0 ? 'manic' : sim.real ? (pos.air ? 'happy' : (cur.mood ?? 'calm')) : 'happy'
  const visible = sim.candles.filter((c) => sx(sim, candleX(c.i)) > -CW && sx(sim, candleX(c.i)) < W + CW)
  const blink = sim.tick

  const world = (
    <g clipPath="url(#screen)">
      <g fill={LCD.light}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
          const gx = ((i * 20 - sim.camX) % 180) + (((i * 20 - sim.camX) % 180) < 0 ? 180 : 0) - 10
          return <rect key={`v${i}`} x={gx} y={0} width={1} height={H} />
        })}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const gy = ((i * 20 + sim.camY) % 160) + (((i * 20 + sim.camY) % 160) < 0 ? 160 : 0) - 8
          return <rect key={`h${i}`} x={0} y={gy} width={W} height={1} />
        })}
      </g>
      {visible.map((c) => {
        const x = sx(sim, candleX(c.i))
        const yClose = sy(sim, topOf(c))
        const yOpen = sy(sim, c.open)
        const down = c.close < c.open
        const top = Math.min(yClose, yOpen)
        const bottom = Math.max(yClose, yOpen)
        const future = c.i > sim.k && c.grow === 0
        const isCur = c.i === sim.k
        const pulse = isCur && c.grow < 1 && Math.floor(sim.t / 2) % 2 === 0
        return (
          <g key={c.i}>
            {future ? (
              <rect x={x + CW / 2 - BODY_W / 2} y={bottom} width={BODY_W} height={2} fill={LCD.dark} />
            ) : (
              <>
                <rect x={x + CW / 2 - 1} y={top - 4} width={2} height={bottom - top + 6} fill={LCD.ink} />
                <rect x={x + CW / 2 - BODY_W / 2} y={top} width={BODY_W} height={Math.max(2, bottom - top)} fill={LCD.ink} />
                <rect x={x + CW / 2 - BODY_W / 2 + 1} y={top + 1} width={BODY_W - 2} height={Math.max(0, bottom - top - 2)} fill={pulse || down ? LCD.bg : LCD.dark} />
                {isCur && c.grow < 1 && (
                  <g fill={LCD.ink}>
                    <rect x={x + 1} y={top - 6} width={2} height={2} />
                    <rect x={x + CW - 3} y={top - 9} width={2} height={2} />
                    <rect x={x + CW / 2 - 1} y={top - 12} width={2} height={2} />
                  </g>
                )}
              </>
            )}
          </g>
        )
      })}
      {visible.map((c) => {
        if (!c.coin) return null
        const cx = sx(sim, candleX(c.i) + CW / 2)
        const taken = c.coin.taken
        if (taken > 14) return null
        if (taken > 0 && taken % 2 === 0) return null
        const hover = taken > 0 ? taken * 3 : Math.floor(sim.tick / 8) % 2
        const cy = sy(sim, Math.max(c.open, c.close) + COIN_LIFT + hover)
        const w = SPIN[(sim.tick + c.i * 5) % SPIN.length]
        const face = w >= COIN_D - 2
        const r = COIN_D / 2
        return (
          <g key={`coin${c.i}`}>
            <ellipse cx={cx} cy={cy} rx={w / 2} ry={r} fill={LCD.ink} />
            {w > 4 && <ellipse cx={cx} cy={cy} rx={w / 2 - 2} ry={r - 2} fill={LCD.bg} />}
            {w > 8 && <ellipse cx={cx} cy={cy} rx={w / 2 - 4} ry={r - 4} fill={LCD.ink} />}
            {w > 10 && <ellipse cx={cx} cy={cy} rx={w / 2 - 5} ry={r - 5} fill={LCD.bg} />}
            {face ? (
              <text x={cx} y={cy + 3} className="lcd-coin" fill={LCD.ink} textAnchor="middle">
                {c.coin.ticker}
              </text>
            ) : (
              w > 12 && <rect x={cx - (w - 12) / 2} y={cy - 3} width={w - 12} height={6} fill={LCD.dark} />
            )}
            {taken === 0 && <rect x={cx - 4} y={sy(sim, topOf(c)) - 2} width={8} height={1} fill={LCD.dark} />}
          </g>
        )
      })}
      <SpriteGroup palette={LCD_PALETTE} mood={mood} body="normal" frame={frame} transform={`translate(${SPRITE_X} ${feetY - 24 + (sim.squash > 0 && !pos.air ? 1 : 0)})`} />
    </g>
  )

  const header = (l: string, r: string) => (
    <>
      <rect x="0" y="0" width={W} height="17" fill={LCD.bg} />
      <T x={6} y={12}>
        {l}
      </T>
      <T x={W - 6} y={12} end>
        {r}
      </T>
      <rect x="6" y="16" width={W - 12} height="1" fill={LCD.dark} />
    </>
  )

  const busyBox = be.busy && (
    <g>
      <rect x={20} y={56} width={120} height={32} fill={LCD.bg} stroke={LCD.ink} strokeWidth={2} />
      <T x={W / 2 - 40} y={76}>
        {be.busy}
        {'.'.repeat(Math.floor(blink / 10) % 4)}
      </T>
    </g>
  )

  const errLine = be.error && (
    <T x={6} y={H - 6} dim>
      {be.error.slice(0, 28).toUpperCase()}
    </T>
  )

  let body: React.ReactNode
  switch (screen) {
    case 'title':
      body = (
        <>
          {world}
          {header(sim.ticker ?? 'ONLY UP', sim.real ? (cur.label ?? '') : `DAY ${sim.k + 1}`)}
          <rect x={12} y={H - 58} width={W - 24} height={50} fill={LCD.bg} stroke={LCD.ink} strokeWidth={2} />
          <T x={W / 2 - 34} y={H - 43} big>
            HOODOCHI
          </T>
          <Btn
            x={20}
            y={H - 34}
            w={W - 40}
            h={18}
            primary
            label={
              be.mode !== 'chain'
                ? 'START'
                : be.status === 'ready'
                  ? 'START'
                  : be.status === 'connecting'
                    ? 'CONNECTING' + '.'.repeat(Math.floor(blink / 10) % 4)
                    : be.status === 'none'
                      ? 'GET A WALLET'
                      : 'CONNECT WALLET'
            }
            onClick={() => press('a')}
          />
          {be.mode === 'chain' && be.status === 'none' && (
            <T x={W / 2 - 46} y={H - 62} dim>
              NO WALLET IN BROWSER
            </T>
          )}
          {errLine}
        </>
      )
      break
    case 'menu': {
      const rows = [...be.pets.map((p) => `#${p.id}  ${p.alive ? (p.ticker ?? 'NAKED') : 'DEAD'}${p.staked ? ' *' : ''}`), `MINT ONE  ${be.totalMinted}/1000`]
      body = (
        <>
          {header(be.mode === 'chain' ? (be.address ? be.address.slice(0, 6) + '…' : CHAIN.name.toUpperCase()) : 'DEMO MODE', be.pets.length ? `${be.pets.length} OWNED` : '')}
          {rows.slice(0, 6).map((r, i) => (
            <Row key={i} y={24 + i * 14} label={r} selected={cursor === i} onClick={() => press('a', i)} />
          ))}
          <T x={6} y={H - 6} dim>
            {be.pets.length === 0 ? 'NOTHING YET. TAP MINT.' : 'TAP ONE  ·  * = STAKED'}
          </T>
          {busyBox}
        </>
      )
      break
    }
    case 'mint':
      body = (
        <>
          {header('MINT', `${be.totalMinted}/1000`)}
          <T x={14} y={40} big>
            ONE HOODOCHI
          </T>
          <T x={14} y={58}>
            {be.mintPrice ? fmtEth(be.mintPrice) : '…'}
          </T>
          <T x={14} y={70} dim>
            CHEAP ON PURPOSE
          </T>
          <T x={14} y={90}>
            RANDOM BODY, EYES,
          </T>
          <T x={14} y={102}>
            ANTENNAE. NO COLLAR.
          </T>
          <Btn x={10} y={112} w={88} label="MINT NOW" primary onClick={() => press('a')} />
          <Btn x={104} y={112} w={46} label="BACK" onClick={() => press('b')} />
          {busyBox}
          {errLine}
        </>
      )
      break
    case 'pet': {
      if (!pet) {
        body = header('…', '')
        break
      }
      const worn = (['tete', 'yeux', 'cou', 'poignet', 'main'] as const).filter((s) => (pet.equip[s] ?? 0) > 0).length
      const actions = PET_ACTIONS.slice(0, be.mode === 'demo' ? 5 : 4).map((a) => (a === 'STAKE' && pet.staked ? 'UNSTAKE' : a))
      body = (
        <>
          {header(`#${pet.id}`, pet.alive ? (pet.staked ? 'STAKED' : pet.ticker ? 'IDLE' : 'NAKED') : 'DEAD')}
          <T x={14} y={30}>
            {pet.alive ? `COLLAR ${pet.ticker ?? '—'}` : `KILLED BY ${pet.deathTicker ?? '?'}`}
          </T>
          <T x={14} y={42}>
            LVL {pet.level}  WEEKS {pet.weeksPlayed}  ITEMS {worn}
          </T>
          <T x={14} y={54}>
            PENDING {fmtUnits(pet.pending)} {pet.ticker ?? pet.deathTicker ?? ''}
          </T>
          <rect x="6" y="59" width={W - 12} height="1" fill={LCD.dark} />
          {actions.map((a, i) => (
            <Row key={a} y={63 + i * 13} label={a} selected={cursor === i} onClick={() => press('a', i)} right={a === 'COLLAR' ? 'MON' : a === 'PLAY' ? 'GAME' : a === 'CLAIM' ? 'FRI' : ''} />
          ))}
          <Btn x={W - 44} y={H - 16} w={38} h={12} label="BACK" onClick={() => press('b')} />
          <T x={6} y={H - 6} dim>
            {be.mode === 'demo' ? 'DEMO: FRIDAY NOW' : 'FRIDAY ON-CHAIN'}
          </T>
          {busyBox}
          {errLine}
        </>
      )
      break
    }
    case 'collar': {
      const t = TICKERS[cursor]
      body = (
        <>
          {header('PICK A STOCK', `${cursor + 1}/${TICKERS.length}`)}
          <rect x={40} y={40} width={80} height={36} fill={LCD.ink} />
          <rect x={43} y={43} width={74} height={30} fill={LCD.bg} />
          <T x={W / 2 - t.length * 5} y={64} big>
            {t}
          </T>
          <Btn x={8} y={48} w={26} h={20} label="<" onClick={() => press('left')} />
          <Btn x={W - 34} y={48} w={26} h={20} label=">" onClick={() => press('right')} />
          <T x={W / 2 - 48} y={92} dim>
            {TICKERS[(cursor + TICKERS.length - 1) % TICKERS.length]}   ·   {TICKERS[(cursor + 1) % TICKERS.length]}
          </T>
          <Btn x={10} y={112} w={88} label={`COLLAR ${t}`} primary onClick={() => press('a')} />
          <Btn x={104} y={112} w={46} label="BACK" onClick={() => press('b')} />
          {busyBox}
          {errLine}
        </>
      )
      break
    }
    case 'play':
      body = (
        <>
          {world}
          {header(sim.ticker ?? 'ONLY UP', `COINS ${sim.score}`)}
          <rect className="lcd-tap" x={0} y={17} width={W} height={H - 17} fill="transparent" onClick={() => press('a')} />
          <T x={6} y={H - 6} dim>
            TAP TO JUMP
          </T>
          <Btn x={W - 44} y={H - 16} w={38} h={12} label="BACK" onClick={() => press('b')} />
        </>
      )
      break
    case 'claim': {
      const t = pet?.ticker ?? pet?.deathTicker ?? ''
      body = (
        <>
          {header('CLAIM', `#${pet?.id ?? ''}`)}
          <T x={14} y={40} dim>
            PENDING
          </T>
          <T x={14} y={56} big>
            {pet ? fmtUnits(pet.pending) : '0'} {t}
          </T>
          <T x={14} y={80} dim>
            YOUR LEDGER
          </T>
          {Object.entries(be.ledger)
            .slice(0, 3)
            .map(([k, v], i) => (
              <T key={k} x={14} y={94 + i * 11}>
                {fmtUnits(v)} {k}
              </T>
            ))}
          {Object.keys(be.ledger).length === 0 && (
            <T x={14} y={94}>
              EMPTY
            </T>
          )}
          <Btn x={10} y={122} w={88} h={16} label="CLAIM" primary onClick={() => press('a')} />
          <Btn x={104} y={122} w={46} h={16} label="BACK" onClick={() => press('b')} />
          {busyBox}
          {errLine}
        </>
      )
      break
    }
    case 'friday': {
      const z = pet?.lastZ10 ?? 0
      const word = !pet ? '' : !pet.alive ? 'DEAD.' : z >= 20 ? 'EXCEPTIONAL.' : z >= 14 ? 'BIG WEEK.' : z >= 8 ? 'GOOD WEEK.' : z >= 3 ? 'UP WEEK.' : z < 0 ? 'DOWN. STILL ALIVE.' : 'FLAT.'
      const items = pet ? (['tete', 'yeux', 'cou', 'poignet', 'main'] as const).filter((s) => (pet.equip[s] ?? 0) > 0).map((s) => itemName(s, pet.equip[s]!)) : []
      body = (
        <>
          {header('FRIDAY', pet?.ticker ?? pet?.deathTicker ?? '')}
          <T x={14} y={44} big>
            {word}
          </T>
          {pet && !pet.alive ? (
            <>
              <T x={14} y={66}>
                EVERYTHING IT WORE
              </T>
              <T x={14} y={78}>
                IS GONE. NO RESPAWN.
              </T>
            </>
          ) : (
            <>
              <T x={14} y={66} dim>
                WEARING {items.length}/5
              </T>
              {items.slice(-3).map((n, i) => (
                <T key={n} x={14} y={78 + i * 11}>
                  {n.toUpperCase()}
                </T>
              ))}
              <T x={14} y={116}>
                PENDING {pet ? fmtUnits(pet.pending) : ''} {pet?.ticker ?? ''}
              </T>
            </>
          )}
          <Btn x={10} y={122} w={W - 20} h={16} label="OK" primary onClick={() => press('a')} />
        </>
      )
      break
    }
    case 'msg':
      body = (
        <>
          {header('', '')}
          <T x={14} y={50} big>
            {msg.title}
          </T>
          {msg.lines.map((l, i) => (
            <T key={i} x={14} y={72 + i * 12}>
              {l}
            </T>
          ))}
          <Btn x={10} y={122} w={W - 20} h={16} label="OK" primary onClick={() => press('a')} />
          {errLine}
        </>
      )
      break
  }

  return (
    <div className="device" aria-label="Hoodochi handheld" tabIndex={0} onKeyDown={onKeyDown}>
      <div className="device-top">
        <span className="device-brand">HOODOCHI</span>
        <span className="device-led" data-on="true" aria-hidden />
      </div>
      <div className="bezel">
        <svg className="lcd" viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges">
          <defs>
            <clipPath id="screen">
              <rect width={W} height={H} />
            </clipPath>
          </defs>
          <rect width={W} height={H} fill={LCD.bg} />
          {body}
        </svg>
      </div>
      <div className="device-gap" aria-hidden />
      <div className="controls">
        <div className="dpad">
          <button type="button" className="dpad-btn up" aria-label="Up" onClick={() => press('up')} />
          <button type="button" className="dpad-btn down" aria-label="Down" onClick={() => press('down')} />
          <button type="button" className="dpad-btn left" aria-label="Left" onClick={() => press('left')} />
          <button type="button" className="dpad-btn right" aria-label="Right" onClick={() => press('right')} />
        </div>
        <div className="ab">
          <button type="button" className="btn-round" onClick={() => press('b')}>
            B
          </button>
          <button type="button" className="btn-round" onClick={() => press('a')}>
            A
          </button>
        </div>
      </div>
      <p className="device-hint">tap the screen · or arrows, enter = A, backspace = B</p>
    </div>
  )
}
