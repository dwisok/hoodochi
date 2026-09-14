import type { CSSProperties } from 'react'
import { Hoodochi } from './Hoodochi'
import type { Equip } from './Hoodochi'
import { TypeIn } from './Reveal'
import { useMedia, useScrollProgress, useTicker } from '../hooks'
import { SLOTS, TOKENS } from '../sprites-v2'
import type { Slot } from '../sprites-v2'
import { itemName } from '../items'

// The first screen IS the explanation: one Hoodochi living its weeks in the
// background — Monday a collar, Friday a verdict, then the week it dies — while
// the headline and the button sit on top. The reader drives it: each scroll
// step is one beat. No paragraph needed.

// Five evolutions, from naked to legendary. The reader scrolls through them.
// Each beat has its own colour, taken from the collection's own backgrounds.
interface Stage {
  word: string
  line: string
  equip: Equip
  ticker: string | null
  bg: string
  fg: string
  blob: string
  accent: string
}

const TOKEN = 42

const STAGES: Stage[] = [
  { word: 'Minted.', line: 'Nothing on it yet. Pick it a stock.', equip: {}, ticker: null, bg: '#f6efe4', fg: '#1a1f3a', blob: '#ebd296', accent: '#f8a672' },
  { word: 'One good week.', line: 'NVDA went up. It earned a red cap — and a slice of NVDA.', equip: { tete: 1 }, ticker: 'NVDA', bg: '#96cdf5', fg: '#1a1f3a', blob: '#f6efe4', accent: '#ffffff' },
  { word: 'Three.', line: 'A watch, sunglasses. Every up week adds an item, and more of the stock.', equip: { tete: 1, poignet: 2, yeux: 1 }, ticker: 'NVDA', bg: '#a0e1be', fg: '#1a1f3a', blob: '#ebd296', accent: '#ffffff' },
  { word: 'Five.', line: 'Gold chain, a phone. Starting to look like money.', equip: { tete: 2, poignet: 2, yeux: 1, cou: 3, main: 2 }, ticker: 'NVDA', bg: '#f8a672', fg: '#1a1f3a', blob: '#f6efe4', accent: '#ffffff' },
  { word: 'Eight.', line: 'Laser visor, big gold watch, a cigar. One bad week and all of this burns.', equip: { tete: 3, poignet: 3, yeux: 4, cou: 3, main: 3 }, ticker: 'NVDA', bg: '#c8b4f0', fg: '#1a1f3a', blob: '#fab4c8', accent: '#ffffff' },
  { word: 'Legendary.', line: 'Crown, diamonds, cash. Ten good weeks, not one fatal one.', equip: { tete: 4, poignet: 4, yeux: 4, cou: 4, main: 4 }, ticker: 'NVDA', bg: '#1a1f3a', fg: '#ffd73c', blob: '#2a2f4a', accent: '#f6efe4' },
]

const VH_PER_STEP = 70 // scroll distance (vh) per evolution

// Floating pixel squares behind everything. Depth drives the parallax.
const DECOR = [
  { x: 6, y: 18, s: 14, d: 1.2, c: 0 },
  { x: 14, y: 72, s: 10, d: 0.6, c: 1 },
  { x: 24, y: 40, s: 8, d: 1.8, c: 2 },
  { x: 38, y: 12, s: 12, d: 0.9, c: 1 },
  { x: 47, y: 84, s: 16, d: 1.4, c: 0 },
  { x: 58, y: 8, s: 8, d: 2.1, c: 2 },
  { x: 66, y: 62, s: 10, d: 0.7, c: 1 },
  { x: 78, y: 22, s: 14, d: 1.6, c: 0 },
  { x: 86, y: 78, s: 8, d: 1.1, c: 2 },
  { x: 93, y: 46, s: 12, d: 0.8, c: 1 },
  { x: 30, y: 92, s: 8, d: 2.4, c: 0 },
  { x: 72, y: 94, s: 10, d: 1.9, c: 2 },
]

/** Items gained between two stages, in slot order. */
function gained(prev: Equip | undefined, next: Equip): { slot: Slot; tier: number }[] {
  if (!prev) return []
  return SLOTS.filter((s) => (next[s] ?? 0) !== (prev[s] ?? 0)).map((s) => ({ slot: s, tier: next[s] ?? 0 }))
}

export function HeroScene({ xUrl, handle }: { xUrl: string; handle: string }) {
  const tok = TOKENS[TOKEN - 1]
  const steps = STAGES.length
  const { ref, progress } = useScrollProgress<HTMLElement>()
  const i = Math.min(steps - 1, Math.floor(progress * steps))
  const f = Math.min(1, Math.max(0, progress * steps - i)) // 0 → 1 inside the current beat
  const st = STAGES[i]
  const loot = gained(STAGES[i - 1]?.equip, st.equip)
  const narrow = useMedia('(max-width: 760px)')
  const petPx = narrow ? 5 : 9
  const tick = useTicker(3)
  const bob = (tick % 2) * 3
  // Parallax, snapped to 4 px so it still reads as pixel art.
  const px4 = (v: number) => Math.round(v / 4) * 4
  const jump = (k: number) => {
    const el = ref.current
    if (!el) return
    const total = el.offsetHeight - window.innerHeight
    window.scrollTo({ top: el.offsetTop + (total * (k + 0.5)) / steps, behavior: 'smooth' })
  }

  const vars = { '--hero-bg': st.bg, '--hero-fg': st.fg, '--hero-blob': st.blob, '--hero-accent': st.accent } as CSSProperties

  return (
    <section ref={ref} className="hero-scroll" style={{ height: `${steps * VH_PER_STEP + 40}vh` }}>
      <div className={`hero-scene stage-${i}`} style={vars}>
        {/* drifting pixel squares, parallaxed by the scroll */}
        <div className="hero-decor" aria-hidden>
          {DECOR.map((d, k) => (
            <span
              key={k}
              className={`decor c${d.c}`}
              style={{
                left: `${d.x}%`,
                top: `${d.y}%`,
                width: d.s,
                height: d.s,
                transform: `translate(${px4(Math.sin(k) * progress * 60 * d.d)}px, ${px4(-progress * 420 * d.d)}px)`,
              }}
            />
          ))}
        </div>

        <div className="hero-scene-inner">
          <div className="hero-copy">
            <p className="eyebrow fade-up" style={{ color: 'inherit', opacity: 0.6 }}>
              An on-chain pet that lives on your ticker.
            </p>
            <h1>
              <TypeIn text="Stake it." />
              <br />
              <TypeIn text="Earn the stock." offset={420} className="h1-accent" />
            </h1>
            <p className="lede fade-up d3">Put a stock on its collar and stake it. While it lives, it earns that stock — NVDA collar, NVDA in your pocket. Friday decides what it wears, or whether it lives.</p>
            <div className="cta-row fade-up d4">
              <a className="btn btn-gold" href={xUrl} target="_blank" rel="noreferrer">
                Follow the launch on X
              </a>
              <span className="cta-side" style={{ color: 'inherit', opacity: 0.6 }}>
                @{handle} · 1,000 at the mint · soon
              </span>
            </div>
          </div>

          <div className="hero-stage-v2">
            {/* the pixel blob behind the pet grows with every evolution */}
            <div className="hero-blob" style={{ transform: `translate(-50%, -50%) scale(${0.85 + i * 0.07 + f * 0.04})` }} aria-hidden />

            {/* a burst of squares every time something is earned */}
            {i > 0 && (
              <div key={`burst-${i}`} className="hero-burst" aria-hidden>
                {Array.from({ length: 10 }, (_, k) => (
                  <span key={k} style={{ '--a': `${k * 36}deg`, '--dl': `${(k % 3) * 40}ms` } as CSSProperties} />
                ))}
              </div>
            )}

            <div key={i} className={`hero-pet-v2 pixel-in ${i > 0 ? 'flash' : ''}`} style={{ transform: `translateY(${-bob}px)` }}>
              <Hoodochi body={tok.body} eyes={tok.eyes} antenna={tok.antenna} ticker={st.ticker} equip={st.equip} px={petPx} />
            </div>

            {/* what it just earned, popping out one after the other */}
            <ul key={`loot-${i}`} className="hero-loot" aria-live="polite">
              {loot.map((l, k) => (
                <li key={l.slot} className={`t${l.tier}`} style={{ animationDelay: `${200 + k * 140}ms` }}>
                  + {itemName(l.slot, l.tier)}
                </li>
              ))}
              {i > 0 && (
                <li className="yield" style={{ animationDelay: `${200 + loot.length * 140}ms` }}>
                  + a slice of {st.ticker}
                </li>
              )}
            </ul>

            <div className="hero-beat">
              <h2 key={`${i}-w`} className="hero-beat-word type-in">
                {st.word}
              </h2>
              <p key={`${i}-l`} className="hero-beat-line fade-up">
                {st.line}
              </p>
              <p className="hero-beat-tag">
                #{TOKEN} · {i === 0 ? 'fresh mint' : `evolution ${i} of ${steps - 1}`}
              </p>
              {/* evolution rail: one chunky segment per beat, filling as you scroll */}
              <div className="hero-rail" aria-label="Evolutions">
                {STAGES.map((_, k) => (
                  <button key={k} type="button" className={k < i ? 'done' : k === i ? 'on' : ''} onClick={() => jump(k)} aria-label={`Evolution ${k}`}>
                    <i style={{ width: k < i ? '100%' : k === i ? `${Math.round(f * 100)}%` : 0 }} />
                  </button>
                ))}
              </div>
              <p className="hero-hint">{i === 0 ? 'scroll to evolve ↓' : i + 1 < steps ? 'keep scrolling ↓' : "that's the whole game"}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
