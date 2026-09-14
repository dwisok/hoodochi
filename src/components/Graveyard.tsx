import { Hoodochi } from './Hoodochi'
import { Reveal } from './Reveal'
import { useReveal, useTicker } from '../hooks'
import { TOKENS } from '../sprites-v2'

// A pixel graveyard at night. Each stone is a ticker that killed one.
// The stones rise out of the ground on scroll; the last one has a ghost.

const GRAVES: { x: number; ticker: string; week: number; h: number }[] = [
  { x: 22, ticker: 'BBBY', week: 3, h: 32 },
  { x: 74, ticker: 'AMC', week: 5, h: 30 },
  { x: 118, ticker: 'COIN', week: 9, h: 36 },
  { x: 176, ticker: 'PLTR', week: 2, h: 31 },
  { x: 232, ticker: 'GME', week: 7, h: 38 },
  { x: 286, ticker: 'TSLA', week: 11, h: 33 },
]

const W = 336
const H = 130
const GROUND = 104

function Stone({ x, h, ticker, week, i, on }: { x: number; h: number; ticker: string; week: number; i: number; on: boolean }) {
  const w = 30
  const top = GROUND - h
  return (
    <g className={`stone ${on ? 'up' : ''}`} style={{ transitionDelay: `${i * 140}ms` }}>
      {/* dirt mound */}
      <rect x={x - 5} y={GROUND - 3} width={w + 10} height={3} fill="#2a2f4a" />
      {/* slab: rounded top in pixel steps */}
      <rect x={x + 4} y={top} width={w - 8} height={2} fill="#3b4060" />
      <rect x={x + 2} y={top + 2} width={w - 4} height={2} fill="#3b4060" />
      <rect x={x} y={top + 4} width={w} height={h - 4} fill="#3b4060" />
      {/* face */}
      <rect x={x + 2} y={top + 6} width={w - 4} height={h - 8} fill="#4a5070" />
      {/* engraving */}
      <text x={x + w / 2} y={top + 15} textAnchor="middle" className="grave-ticker">
        {ticker}
      </text>
      <rect x={x + 7} y={top + 18} width={w - 14} height={1} fill="#2a2f4a" />
      <text x={x + w / 2} y={top + 25} textAnchor="middle" className="grave-week">
        wk {week}
      </text>
      {/* crack on the older ones */}
      {i % 2 === 0 && (
        <>
          <rect x={x + w - 6} y={top + 3} width={1} height={3} fill="#2a2f4a" />
          <rect x={x + w - 7} y={top + 6} width={1} height={2} fill="#2a2f4a" />
        </>
      )}
    </g>
  )
}

export function Graveyard() {
  const { ref, inView } = useReveal<HTMLElement>(0.35)
  const tick = useTicker(2)
  const ghostTok = TOKENS[46]
  const float = (tick % 2) * 2

  return (
    <section ref={ref} className={`grave2 ${inView ? 'in' : ''}`}>
      <svg className="grave2-scene" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden>
        {/* sky */}
        <rect width={W} height={H} fill="#1a1f3a" />
        {/* stars */}
        {[
          [14, 12], [40, 30], [61, 8], [95, 22], [130, 6], [150, 34], [190, 14], [214, 28], [250, 9], [280, 24], [310, 12], [326, 38], [72, 46], [200, 44],
        ].map(([sx, sy], k) => (
          <rect key={k} x={sx} y={sy} width={1} height={1} fill="#f6efe4" className="star" style={{ animationDelay: `${(k * 370) % 2100}ms` }} />
        ))}
        {/* moon */}
        <g fill="#f6efe4">
          <rect x={270} y={12} width={8} height={1} />
          <rect x={268} y={13} width={12} height={2} />
          <rect x={267} y={15} width={14} height={6} />
          <rect x={268} y={21} width={12} height={2} />
          <rect x={270} y={23} width={8} height={1} />
        </g>
        <g fill="#e2dbcc">
          <rect x={271} y={16} width={2} height={2} />
          <rect x={276} y={18} width={2} height={1} />
          <rect x={273} y={20} width={1} height={1} />
        </g>
        {/* far hills */}
        <rect x={0} y={GROUND - 14} width={60} height={14} fill="#22274a" />
        <rect x={10} y={GROUND - 18} width={36} height={4} fill="#22274a" />
        <rect x={120} y={GROUND - 10} width={90} height={10} fill="#22274a" />
        <rect x={140} y={GROUND - 13} width={50} height={3} fill="#22274a" />
        <rect x={260} y={GROUND - 16} width={76} height={16} fill="#22274a" />
        {/* dead tree */}
        <g fill="#2a2f4a">
          <rect x={150} y={GROUND - 40} width={3} height={40} />
          <rect x={144} y={GROUND - 32} width={8} height={2} />
          <rect x={142} y={GROUND - 36} width={2} height={4} />
          <rect x={152} y={GROUND - 28} width={9} height={2} />
          <rect x={160} y={GROUND - 33} width={2} height={5} />
          <rect x={146} y={GROUND - 44} width={5} height={4} />
        </g>
        {/* fence */}
        {Array.from({ length: 24 }, (_, k) => (
          <rect key={k} x={4 + k * 14} y={GROUND - 8} width={2} height={8} fill="#2a2f4a" />
        ))}
        <rect x={0} y={GROUND - 6} width={W} height={1} fill="#2a2f4a" />
        {/* stones */}
        {GRAVES.map((g, i) => (
          <Stone key={g.ticker} {...g} i={i} on={inView} />
        ))}
        {/* ground */}
        <rect x={0} y={GROUND} width={W} height={H - GROUND} fill="#141833" />
        <rect x={0} y={GROUND} width={W} height={2} fill="#3b4060" />
        {[8, 44, 90, 133, 170, 205, 249, 300].map((gx) => (
          <rect key={gx} x={gx} y={GROUND + 6} width={6} height={1} fill="#2a2f4a" />
        ))}
        {/* fog */}
        <rect x={0} y={GROUND - 4} width={W} height={6} fill="#f6efe4" opacity={0.06} className="fog" />
      </svg>

      {/* the ghost of #47, floating over its GME stone */}
      <div className="grave2-ghost" style={{ transform: `translateY(${-float}px)` }}>
        <Hoodochi px={3} body={ghostTok.body} eyes={ghostTok.eyes} antenna={ghostTok.antenna} ticker="GME" equip={{ tete: 4, cou: 3, main: 2 }} status="dead" title="The ghost of a dead Hoodochi" />
      </div>

      <div className="grave2-copy">
        <Reveal>
          <p className="eyebrow">Graveyard</p>
          <h2>Died in week 7. Wearing a crown.</h2>
        </Reveal>
        <Reveal delay={150}>
          <p>GME collar, one bad Friday. Six weeks of loot, gone. The body stays yours — a dead Hoodochi is still an NFT, with its whole life on it.</p>
        </Reveal>
      </div>
    </section>
  )
}
