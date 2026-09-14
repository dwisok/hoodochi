import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import {
  BODY_LAYERS,
  EYE_LAYERS,
  TIP_LAYERS,
  ITEMS,
  NECK,
  FONT,
  RARE_BACKGROUNDS,
  BACKGROUND_COLORS,
  CANVAS,
  OFFSET,
  CREATURE_W,
  CREATURE_H,
} from '../sprites-v2'
import type { BodyName, EyesName, TipName } from '../sprites-v2'

/** Tier per slot, 0 = empty, 1–4. */
export interface Equip {
  tete?: number
  yeux?: number
  cou?: number
  poignet?: number
  main?: number
}

export type Status = 'alive' | 'sleeping' | 'dead'

export interface HoodochiProps {
  body: BodyName
  eyes: EyesName
  antenna: TipName
  /** Ticker on the collar. None → no collar (it sleeps). */
  ticker?: string | null
  equip?: Equip
  /** Background: a palette name, a rare background name, a CSS colour, or 'none' (transparent). */
  bg?: string
  status?: Status
  /** Screen pixels per grid pixel (grid = 48×48). */
  px?: number
  className?: string
  title?: string
}

const OUT = '#1e1e1e'
const GOLD = '#ffd73c'

/**
 * The site Hoodochi — the same layers as the Python generator (items2.build),
 * stacked in the same order: background → body → eyes → antennae → head → eyewear
 * → wrist → hand → collar → neck item. Everything is 48×48, the collar and neck
 * items are drawn at ×2 (96×96) like the generator.
 */
export function Hoodochi({ body, eyes, antenna, ticker, equip = {}, bg = 'none', status = 'alive', px = 4, className = '', title }: HoodochiProps) {
  const size = CANVAS * px
  const rare = (RARE_BACKGROUNDS as Record<string, string>)[bg]
  const flat = (BACKGROUND_COLORS as Record<string, string>)[bg] ?? (bg !== 'none' && !rare ? bg : undefined)
  const t = ticker ? ticker.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) : ''
  const asleep = status === 'sleeping'
  const eyeLayer = status === 'dead' ? EYE_LAYERS.dizzy : asleep ? EYE_LAYERS.sleepy : EYE_LAYERS[eyes]

  const creature: CSSProperties = {
    left: OFFSET.x * px,
    top: OFFSET.y * px,
    width: CREATURE_W * px,
    height: CREATURE_H * px,
  }
  const full: CSSProperties = { left: 0, top: 0, width: size, height: size }

  const worn = (slot: 'tete' | 'yeux' | 'poignet' | 'main') => {
    const tier = equip[slot] ?? 0
    return tier > 0 ? ITEMS[slot][tier - 1] : null
  }
  const neck = t && (equip.cou ?? 0) > 0 ? NECK[(equip.cou ?? 1) - 1].uris[String(t.length)] : null

  const label = title ?? (status === 'dead' ? 'A dead Hoodochi' : t ? `Hoodochi wearing a ${t} collar` : 'A sleeping Hoodochi')

  return (
    <div
      className={`hoo ${status === 'dead' ? 'is-dead' : ''} ${className}`}
      style={{ width: size, height: size, background: flat ?? 'transparent' }}
      role="img"
      aria-label={label}
    >
      {rare && <img src={rare} alt="" style={full} draggable={false} />}
      <img src={BODY_LAYERS[body]} alt="" style={creature} draggable={false} />
      <img src={eyeLayer} alt="" style={creature} draggable={false} />
      <img src={TIP_LAYERS[antenna]} alt="" style={creature} draggable={false} />
      {(['tete', 'yeux', 'poignet', 'main'] as const).map((slot) => {
        const it = worn(slot)
        return it ? <img key={slot} src={it.uri} alt="" style={full} draggable={false} /> : null
      })}
      {t && <Collar ticker={t} px={px} />}
      {neck && <img src={neck} alt="" style={full} draggable={false} />}
    </div>
  )
}

/** Collar at ×2 resolution: short gold chain + rounded gold plate + 3×5 ticker — same geometry as scenes.draw_collar_hires. */
function Collar({ ticker, px }: { ticker: string; px: number }) {
  const rects = useMemo(() => {
    const out: { x: number; y: number; w: number; h: number; c: string }[] = []
    const neckY = (OFFSET.y + 31) * 2
    const cx = (OFFSET.x + 16) * 2
    const pw = 4 * ticker.length + 5
    const px0 = cx - Math.floor(pw / 2)
    const py0 = neckY + 4
    // chain: two short strands from under the head
    for (let i = 0; i < 4; i++) {
      out.push({ x: px0 - 1 - i, y: neckY + 3 - i, w: 1, h: 1, c: GOLD })
      out.push({ x: px0 + pw + i, y: neckY + 3 - i, w: 1, h: 1, c: GOLD })
    }
    out.push({ x: px0 - 1, y: neckY + 4, w: pw + 2, h: 1, c: GOLD })
    // plate: outline with the four corners left out, gold inside
    out.push({ x: px0 + 1, y: py0, w: pw - 2, h: 1, c: OUT })
    out.push({ x: px0 + 1, y: py0 + 8, w: pw - 2, h: 1, c: OUT })
    out.push({ x: px0, y: py0 + 1, w: 1, h: 7, c: OUT })
    out.push({ x: px0 + pw - 1, y: py0 + 1, w: 1, h: 7, c: OUT })
    out.push({ x: px0 + 1, y: py0 + 1, w: pw - 2, h: 7, c: GOLD })
    // ticker, 3×5 font, 4 px per glyph
    let gx = px0 + 3
    for (const ch of ticker) {
      const g = FONT[ch]
      if (g) {
        g.forEach((row, dy) => {
          for (let dx = 0; dx < 3; dx++) if (row[dx] === '1') out.push({ x: gx + dx, y: py0 + 2 + dy, w: 1, h: 1, c: OUT })
        })
      }
      gx += 4
    }
    return out
  }, [ticker])
  const n = CANVAS * 2
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={CANVAS * px} height={CANVAS * px} shapeRendering="crispEdges" style={{ left: 0, top: 0 }} aria-hidden>
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.c} />
      ))}
    </svg>
  )
}

