import { useEffect, useRef, useState } from 'react'
import { Hoodochi } from './Hoodochi'
import { Reveal } from './Reveal'
import { useScrollProgress } from '../hooks'
import { SLOTS, SLOT_LABEL, TOKENS } from '../sprites-v2'
import type { Slot } from '../sprites-v2'
import { itemName } from '../items'

// The closed grid as a ride: 20 tiles, tier one to tier four, that slide
// sideways while the reader scrolls down. The further you go, the rarer.

const TIER_WORD = ['up week', 'good week', 'big week', 'exceptional week']
const TIER_BG = ['sand', 'sky', 'lavender', '#ffd73c']
// One token per tile, spread across the collection so bodies vary.
const TOKEN_FOR = (k: number) => TOKENS[(k * 53 + 7) % TOKENS.length]

interface Tile {
  slot: Slot
  tier: number
}

const TILES: Tile[] = [1, 2, 3, 4].flatMap((tier) => SLOTS.map((slot) => ({ slot, tier })))

export function ItemRail() {
  const { ref, progress } = useScrollProgress<HTMLElement>()
  const trackRef = useRef<HTMLUListElement>(null)
  const [dist, setDist] = useState(0)

  // How far the track has to travel = its overflow. The section is that tall
  // plus one screen, so vertical scroll maps 1:1 to sideways motion.
  useEffect(() => {
    const measure = () => {
      const el = trackRef.current
      if (!el) return
      const narrow = window.innerWidth < 760
      setDist(narrow ? 0 : Math.max(0, el.scrollWidth - el.clientWidth))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const x = -Math.round(progress * dist)

  return (
    <section ref={ref} className="rail" style={dist ? { height: `calc(100vh + ${dist}px)` } : undefined}>
      <div className="rail-sticky">
        <div className="rail-head">
          <Reveal>
            <p className="eyebrow">Twenty things to earn</p>
            <h2 className="section-title">
              <span className="hl hl-gold">Rarity you can't mint.</span>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="rail-lede">Five slots, four tiers. Nothing here is for sale: the market hands them out, one per good week, the slot drawn at random.</p>
          </Reveal>
        </div>
        <ul ref={trackRef} className="rail-track" style={{ transform: `translateX(${x}px)` }}>
          {TILES.map((t, k) => {
            const tok = TOKEN_FOR(k)
            return (
              <li key={`${t.slot}-${t.tier}`} className={`rail-tile t${t.tier}`} style={{ marginTop: (k % 3) * 18 }}>
                <span className="rail-tier">tier {t.tier}</span>
                <div className="rail-art">
                  <Hoodochi px={4} body={tok.body} eyes={tok.eyes} antenna={tok.antenna} ticker="NVDA" equip={{ [t.slot]: t.tier }} bg={TIER_BG[t.tier - 1]} />
                </div>
                <b className="rail-name">{itemName(t.slot, t.tier)}</b>
                <span className="rail-meta">
                  {SLOT_LABEL[t.slot]} · {TIER_WORD[t.tier - 1]}
                </span>
              </li>
            )
          })}
          <li className="rail-tile rail-end">
            <b>Fill all five.</b>
            <span>About ten good weeks. Not one fatal one.</span>
          </li>
        </ul>
        <div className="rail-bar" aria-hidden>
          <i style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>
    </section>
  )
}
