import { Hoodochi } from './Hoodochi'
import type { Equip } from './Hoodochi'
import { useTicker } from '../hooks'
import { TOKENS } from '../sprites-v2'

interface Walker {
  token: number
  ticker: string | null
  equip: Equip
  speed: number
  y: number
  sleeping?: boolean
}

// Real tokens from the collection, at different points of their lives.
const WALKERS: Walker[] = [
  { token: 12, ticker: 'NVDA', equip: { tete: 4, yeux: 3, cou: 4, poignet: 4, main: 4 }, speed: 1.4, y: 0 },
  { token: 55, ticker: 'KO', equip: { poignet: 1 }, speed: 0.9, y: 4 },
  { token: 318, ticker: 'XOM', equip: { tete: 1, main: 2 }, speed: 0.8, y: 2 },
  { token: 66, ticker: 'GME', equip: {}, speed: 2.2, y: 6 },
  { token: 540, ticker: null, equip: { yeux: 2, cou: 1 }, speed: 0.5, y: 1, sleeping: true },
  { token: 731, ticker: 'PFE', equip: { tete: 2, cou: 2, main: 1 }, speed: 1.0, y: 3 },
  { token: 903, ticker: 'TSLA', equip: { tete: 3, yeux: 4, poignet: 3 }, speed: 1.9, y: 5 },
  { token: 150, ticker: 'AAPL', equip: { cou: 3, main: 3 }, speed: 1.2, y: 2 },
]

const PX = 3
const SPRITE_W = 48 * PX
const GAP = 110

/** A line of Hoodochi walking across the band, each at its own pace. */
export function Parade() {
  const tick = useTicker(30)
  const lane = SPRITE_W + GAP
  const total = WALKERS.length * lane

  return (
    <div className="parade" aria-hidden>
      {/* a flat pixel sky: sun, two clouds, two rows of hills */}
      <div className="parade-sun" />
      <div className="parade-clouds">
        <span style={{ top: 26, width: 90 }} />
        <span style={{ top: 58, width: 60 }} />
        <span style={{ top: 18, width: 70 }} />
      </div>
      <div className="parade-hills back" />
      <div className="parade-hills front" />
      <div className="parade-ground" />
      <div className="parade-line" />
      {WALKERS.map((w, i) => {
        const tok = TOKENS[w.token - 1]
        const x = ((i * lane + tick * w.speed) % (total + 400)) - SPRITE_W
        const step = Math.floor((tick * w.speed) / 10) % 2
        const hop = w.sleeping ? 0 : step * 3
        return (
          <div key={w.token} className="walker" style={{ transform: `translate(${Math.round(x)}px, ${-w.y - hop}px)` }}>
            <Hoodochi
              px={PX}
              body={tok.body}
              eyes={tok.eyes}
              antenna={tok.antenna}
              ticker={w.ticker}
              equip={w.equip}
              status={w.sleeping ? 'sleeping' : 'alive'}
            />
          </div>
        )
      })}
    </div>
  )
}
