import { useState } from 'react'
import { Hoodochi } from './Hoodochi'
import type { Equip } from './Hoodochi'
import { Reveal } from './Reveal'
import { TOKENS, SLOT_LABEL, SLOTS } from '../sprites-v2'
import { itemName as name } from '../items'
import type { Slot } from '../sprites-v2'

const TOKEN = 128
const TIER_WORD = ['Up week', 'Good week', 'Big week', 'Exceptional']

/** The closed grid: 5 slots × 4 tiers. Hover a cell to try it on. */
export function Wardrobe() {
  const tok = TOKENS[TOKEN - 1]
  const [hover, setHover] = useState<{ slot: Slot; tier: number } | null>(null)
  const [tried, setTried] = useState<Equip>({})
  const equip: Equip = hover ? { ...tried, [hover.slot]: hover.tier } : tried
  const level = SLOTS.reduce((a, s) => a + (equip[s] ?? 0), 0)

  return (
    <section className="wardrobe" id="wardrobe">
      <div className="wardrobe-head">
        <Reveal>
          <p className="eyebrow">Twenty things to earn</p>
          <h2 className="section-title">Rarity you can't mint.</h2>
        </Reveal>
        <Reveal delay={120}>
          <p>
            Nothing on this grid is for sale. Five slots, four tiers each. An up week gives tier one; the bigger the week,
            by the stock's own standards, the higher the tier. Tier four only comes from a week the market barely ever
            has. The slot is drawn at random. Fill the grid and you've survived about ten good weeks without a single fatal
            one.
          </p>
        </Reveal>
      </div>

      <div className="wardrobe-body">
        <div className="wardrobe-fit">
          <div className="wardrobe-model">
            <Hoodochi px={6} body={tok.body} eyes={tok.eyes} antenna={tok.antenna} ticker="NVDA" equip={equip} bg="sky" />
          </div>
          <p className="wardrobe-level">
            <span>#{TOKEN}</span>
            <b>{level === 0 ? 'nothing yet' : level >= 20 ? 'complete' : `level ${level}`}</b>
          </p>
          <button className="chip" onClick={() => setTried({})} disabled={level === 0 && !hover}>
            strip it
          </button>
        </div>

        <table className="wardrobe-grid">
          <thead>
            <tr>
              <th />
              {TIER_WORD.map((w, i) => (
                <th key={w}>
                  <span className="tier-num">{i + 1}</span>
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map((slot, r) => (
              <tr key={slot}>
                <th>{SLOT_LABEL[slot]}</th>
                {[1, 2, 3, 4].map((tier) => {
                  const on = (tried[slot] ?? 0) === tier
                  return (
                    <td key={tier}>
                      <Reveal delay={r * 60 + tier * 40}>
                        <button
                          className={`ward-cell t${tier} ${on ? 'on' : ''}`}
                          onMouseEnter={() => setHover({ slot, tier })}
                          onMouseLeave={() => setHover(null)}
                          onFocus={() => setHover({ slot, tier })}
                          onBlur={() => setHover(null)}
                          onClick={() => setTried((t) => ({ ...t, [slot]: on ? 0 : tier }))}
                          aria-pressed={on}
                        >
                          <span className="ward-art">
                            <Hoodochi px={2} body={tok.body} eyes={tok.eyes} antenna={tok.antenna} ticker="NVDA" equip={{ [slot]: tier }} />
                          </span>
                          <span className="ward-name">{name(slot, tier)}</span>
                        </button>
                      </Reveal>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
