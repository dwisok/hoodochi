import { useEffect, useMemo, useState } from 'react'
import { Hoodochi } from './Hoodochi'
import type { Equip, Status } from './Hoodochi'
import { useTicker } from '../hooks'
import { TOKENS, SLOT_LABEL } from '../sprites-v2'
import { itemName } from '../items'
import type { Slot } from '../sprites-v2'

// One life, replayed in the hero: Monday a collar, Friday a verdict, a few
// weeks in a row, then the week it dies. Then a new Hoodochi takes the slot.
// Nothing here is a number — it is a creature getting dressed, then buried.

type Beat =
  | { kind: 'monday'; ticker: string }
  | { kind: 'friday'; slot: Slot; tier: number }
  | { kind: 'flat' }
  | { kind: 'sleep' }
  | { kind: 'dead' }

const LIVES: { token: number; bg: string; beats: Beat[] }[] = [
  {
    token: 42,
    bg: 'synthwave',
    beats: [
      { kind: 'monday', ticker: 'NVDA' },
      { kind: 'friday', slot: 'tete', tier: 1 },
      { kind: 'monday', ticker: 'NVDA' },
      { kind: 'friday', slot: 'poignet', tier: 2 },
      { kind: 'monday', ticker: 'TSLA' },
      { kind: 'flat' },
      { kind: 'monday', ticker: 'TSLA' },
      { kind: 'friday', slot: 'cou', tier: 3 },
      { kind: 'sleep' },
      { kind: 'monday', ticker: 'GME' },
      { kind: 'friday', slot: 'yeux', tier: 4 },
      { kind: 'monday', ticker: 'GME' },
      { kind: 'dead' },
    ],
  },
  {
    token: 327,
    bg: 'lavender',
    beats: [
      { kind: 'monday', ticker: 'KO' },
      { kind: 'friday', slot: 'main', tier: 1 },
      { kind: 'monday', ticker: 'AAPL' },
      { kind: 'friday', slot: 'tete', tier: 2 },
      { kind: 'monday', ticker: 'AMD' },
      { kind: 'friday', slot: 'yeux', tier: 3 },
      { kind: 'monday', ticker: 'AMD' },
      { kind: 'flat' },
      { kind: 'monday', ticker: 'PLTR' },
      { kind: 'friday', slot: 'tete', tier: 4 },
      { kind: 'monday', ticker: 'PLTR' },
      { kind: 'dead' },
    ],
  },
]

const BEAT_MS = 3400
const DEAD_MS = 5000

export function HeroPet() {
  const [life, setLife] = useState(0)
  const [i, setI] = useState(-1) // -1 = fresh mint, no collar yet
  const L = LIVES[life % LIVES.length]
  const tok = TOKENS[L.token - 1]

  useEffect(() => {
    const beat = L.beats[i]
    const wait = beat?.kind === 'dead' ? DEAD_MS : i < 0 ? 2800 : BEAT_MS
    const id = setTimeout(() => {
      if (i + 1 >= L.beats.length) {
        setLife((l) => l + 1)
        setI(-1)
      } else setI(i + 1)
    }, wait)
    return () => clearTimeout(id)
  }, [i, L])

  // state at beat i
  const { equip, ticker, status, week, line } = useMemo(() => {
    let equip: Equip = {}
    let ticker: string | null = null
    let status: Status = 'alive'
    let week = 0
    let line = `#${L.token}, fresh from the mint. Nothing on it yet.`
    for (let k = 0; k <= i; k++) {
      const b = L.beats[k]
      if (b.kind === 'monday') {
        ticker = b.ticker
        status = 'alive'
        week++
        line = `Monday. ${b.ticker} collar on. Nothing to do until Friday.`
      } else if (b.kind === 'friday') {
        equip = { ...equip, [b.slot]: b.tier }
        line = `Friday. Up week — it earned a ${itemName(b.slot, b.tier)}. Keeps it for good.`
      } else if (b.kind === 'flat') {
        line = 'Friday. Flat week. Nothing gained, nothing lost.'
      } else if (b.kind === 'sleep') {
        ticker = null
        status = 'sleeping'
        line = 'No collar this week. It sleeps. Zero risk, zero reward.'
      } else if (b.kind === 'dead') {
        status = 'dead'
        line = `Friday. ${ticker} dumped. Dead in week ${week}, with everything it was wearing.`
      }
    }
    return { equip, ticker, status, week, line }
  }, [i, L])

  const tick = useTicker(status === 'sleeping' ? 1 : 3, status !== 'dead')
  const bob = status === 'dead' ? 0 : status === 'sleeping' ? (tick % 2) * 1 : (tick % 2) * 3
  const beat = L.beats[i]
  const flash = beat?.kind === 'friday' || beat?.kind === 'dead'
  const worn = (Object.keys(equip) as Slot[]).filter((s) => (equip[s] ?? 0) > 0)

  return (
    <div className={`hero-pet ${status === 'dead' ? 'is-dead' : ''}`}>
      <div className="hero-frame">
        <div key={`${life}-${i}`} className={`hero-stage ${flash ? 'flash' : ''}`} style={{ transform: `translateY(${-bob}px)` }}>
          <Hoodochi body={tok.body} eyes={tok.eyes} antenna={tok.antenna} bg={L.bg} ticker={ticker} equip={equip} status={status} px={7} />
        </div>
        {status === 'sleeping' && <span className="moods-zzz hero-zzz">z z z</span>}
        <div className="hero-tag">
          <span>#{L.token}</span>
          <span>{week ? `week ${week}` : 'minted'}</span>
        </div>
      </div>
      <p key={line} className="hero-line type-in">
        {line}
      </p>
      <ul className="hero-worn" aria-label="What it is wearing">
        {(['tete', 'yeux', 'cou', 'poignet', 'main'] as Slot[]).map((s) => (
          <li key={s} className={worn.includes(s) ? 'on' : ''}>
            <span>{SLOT_LABEL[s]}</span>
            <b>{(equip[s] ?? 0) > 0 ? itemName(s, equip[s]!) : '—'}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}
