import { compose, toRects, DEFAULT_PALETTE, GRID } from '../sprites'
import type { HoodochiSpec, Palette } from '../sprites'

interface Props extends HoodochiSpec {
  /** Pixel size on screen; the SVG is GRID*px wide. */
  px?: number
  palette?: Palette
  className?: string
  title?: string
}

/** Standalone SVG of one Hoodochi. */
export function Sprite({ px = 6, palette, className, title, ...spec }: Props) {
  const pal = { ...DEFAULT_PALETTE, ...(palette ?? {}) }
  const rects = toRects(compose(spec))
  return (
    <svg
      viewBox={`0 0 ${GRID} ${GRID}`}
      width={GRID * px}
      height={GRID * px}
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-label={title ?? 'Hoodochi'}
    >
      {title && <title>{title}</title>}
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={pal[r.ch] ?? '#f0f'} />
      ))}
    </svg>
  )
}

/** Same thing as a <g>, for nesting inside another SVG (the LCD). */
export function SpriteGroup({
  palette,
  transform,
  ...spec
}: HoodochiSpec & { palette: Palette; transform?: string }) {
  const rects = toRects(compose(spec))
  return (
    <g transform={transform} shapeRendering="crispEdges">
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={palette[r.ch] ?? '#f0f'} />
      ))}
    </g>
  )
}
