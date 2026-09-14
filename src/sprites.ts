// Hoodochi sprite system — 24×24 grid, flat colours, 1px dark outline.
// Each layer is 24 rows of 24 chars. '.' is transparent.
// Legend: k outline · b body · w eye white · p pupil · y beak · a antenna tip
//         c collar band · t collar tag · h hat · g gold · r red

export type Layer = string[]
export type Palette = Record<string, string>

export const GRID = 24

export const BASE: Layer = [
  '.....aaa........aaa.....',
  '......k..........k......',
  '......k..........k......',
  '.......k........k.......',
  '.....kkkkkkkkkkkkkk.....',
  '....kbbbbbbbbbbbbbbk....',
  '...kbbbbbbbbbbbbbbbbk...',
  '..kbbbbbbbbbbbbbbbbbbk..',
  '..kbbbkkkbbbbbbkkkbbbk..',
  '..kbbkwwwkbbbbkwwwkbbk..',
  '..kbbkwppkbbbbkwppkbbk..',
  '..kbbkwppkbbbbkwppkbbk..',
  '..kbbbkkkbbbbbbkkkbbbk..',
  '..kbbbbbbbbkyybbbbbbbk..',
  '...kbbbbbbbbkybbbbbbk...',
  '....kbbbbbbbbbbbbbbk....',
  '.....kkkkkccccckkkk.....',
  '......kbbbcttcbbbk......',
  '....kkbbbbbbbbbbbbkk....',
  '...kbkbbbbbbbbbbbbkbk...',
  '...kkkbbbbbbbbbbbbkkk...',
  '.....kbbbbbbbbbbbbk.....',
  '......kkbbkkkkbbkk......',
  '......kkkk....kkkk......',
]

// Thin variant: same silhouette, body narrowed by a pixel each side.
export const BASE_THIN: Layer = [
  '.....aaa........aaa.....',
  '......k..........k......',
  '......k..........k......',
  '.......k........k.......',
  '.....kkkkkkkkkkkkkk.....',
  '....kbbbbbbbbbbbbbbk....',
  '...kbbbbbbbbbbbbbbbbk...',
  '..kbbbbbbbbbbbbbbbbbbk..',
  '..kbbbkkkbbbbbbkkkbbbk..',
  '..kbbkwwwkbbbbkwwwkbbk..',
  '..kbbkwppkbbbbkwppkbbk..',
  '..kbbkwppkbbbbkwppkbbk..',
  '..kbbbkkkbbbbbbkkkbbbk..',
  '..kbbbbbbbbkyybbbbbbbk..',
  '...kbbbbbbbbkybbbbbbk...',
  '....kbbbbbbbbbbbbbbk....',
  '.....kkkkkccccckkkk.....',
  '.......kbbcttcbbk.......',
  '......kkbbbbbbbbkk......',
  '.....kbkbbbbbbbbkbk.....',
  '.....kkkbbbbbbbbkkk.....',
  '.......kbbbbbbbbk.......',
  '.......kbbkkkkbbk.......',
  '.......kkk....kkk.......',
]

// Fat variant: wider body, slightly rounder.
export const BASE_FAT: Layer = [
  '.....aaa........aaa.....',
  '......k..........k......',
  '......k..........k......',
  '.......k........k.......',
  '.....kkkkkkkkkkkkkk.....',
  '....kbbbbbbbbbbbbbbk....',
  '...kbbbbbbbbbbbbbbbbk...',
  '..kbbbbbbbbbbbbbbbbbbk..',
  '..kbbbkkkbbbbbbkkkbbbk..',
  '..kbbkwwwkbbbbkwwwkbbk..',
  '..kbbkwppkbbbbkwppkbbk..',
  '..kbbkwppkbbbbkwppkbbk..',
  '..kbbbkkkbbbbbbkkkbbbk..',
  '..kbbbbbbbbkyybbbbbbbk..',
  '...kbbbbbbbbkybbbbbbk...',
  '....kbbbbbbbbbbbbbbk....',
  '....kkkkkkccccckkkkk....',
  '...kbbbbbbcttcbbbbbbk...',
  '..kkbbbbbbbbbbbbbbbbkk..',
  '.kbkbbbbbbbbbbbbbbbbkbk.',
  '.kkkbbbbbbbbbbbbbbbbkkk.',
  '...kbbbbbbbbbbbbbbbbk...',
  '....kkbbkkkkkkkkbbkk....',
  '....kkkk........kkkk....',
]

// Eye overlays: 5×5 boxes placed at (5,8) for the left eye, mirrored at (14,8).
const EYES: Record<string, string[]> = {
  calm: ['.kkk.', 'kwwwk', 'kwppk', 'kwppk', '.kkk.'],
  happy: ['.....', '.kkk.', 'k...k', '.....', '.....'],
  sad: ['...kk', '.kkk.', 'kwwwk', 'kwppk', '.kkk.'],
  sleep: ['.....', '.....', 'kkkkk', '.....', '.....'],
  manic: ['.kkk.', 'kwwwk', 'kwpwk', 'kwwwk', '.kkk.'],
  dead: ['.....', 'k...k', '.k.k.', 'k...k', '.....'],
  red: ['.kkk.', 'kwwwk', 'kwrrk', 'kwrrk', '.kkk.'],
}

export type Mood = keyof typeof EYES

const EMPTY = '.'.repeat(GRID)
const empty = (): Layer => Array.from({ length: GRID }, () => EMPTY)

function stamp(layer: Layer, rows: string[], x0: number, y0: number, mirror = false): Layer {
  const out = layer.map((r) => r.split(''))
  rows.forEach((row, dy) => {
    const cells = mirror ? row.split('').reverse() : row.split('')
    cells.forEach((ch, dx) => {
      if (ch !== '.') out[y0 + dy][x0 + dx] = ch
    })
  })
  return out.map((r) => r.join(''))
}

export function eyes(mood: Mood): Layer {
  const box = EYES[mood]
  let l = empty()
  // Clear the eye sockets first so a closed eye reads as body colour.
  l = stamp(l, ['bbbbb', 'bbbbb', 'bbbbb', 'bbbbb', 'bbbbb'], 5, 8)
  l = stamp(l, ['bbbbb', 'bbbbb', 'bbbbb', 'bbbbb', 'bbbbb'], 14, 8)
  l = stamp(l, box, 5, 8)
  l = stamp(l, box, 14, 8, true)
  return l
}

// Accessories: earned by surviving. Rows 0–4 sit above / on the head.
export const HATS: Record<string, Layer> = {
  none: empty(),
  cap: stamp(
    empty(),
    [
      '..kkkkkkkk..',
      '.khhhhhhhhk.',
      'khhhhhhhhhhk',
      'kkkkkkkkkkkkkkkk',
    ],
    6,
    2,
  ),
  crown: stamp(
    empty(),
    ['k..k..k..k', 'kggkggkggk', 'kggggggggk', 'kkkkkkkkkk'],
    7,
    1,
  ),
  halo: stamp(empty(), ['.kkkkkkkk.', 'kggggggggk', '.kkkkkkkk.'], 7, 0),
  horns: stamp(
    empty(),
    ['k.......k', 'kk.....kk', '.kk...kk.'],
    7,
    2,
  ),
}

export type Hat = keyof typeof HATS

export interface HoodochiSpec {
  body?: 'thin' | 'normal' | 'fat'
  mood?: Mood
  hat?: Hat
  /** Walk cycle frame: 0 = feet together, 1 = feet apart. */
  frame?: 0 | 1
  palette?: Partial<Palette>
}

// Second walk frame: only the last two rows change (feet apart).
const FEET_APART: Record<'thin' | 'normal' | 'fat', [string, string]> = {
  normal: ['.....kkbbkkkkkkbbkk.....', '.....kkkk......kkkk.....'],
  thin: ['......kbbkkkkkkbbk......', '......kkk......kkk......'],
  fat: ['...kkbbkkkkkkkkkkbbkk...', '...kkkk..........kkkk...'],
}

export const NIGHT = '#1a1f3a'
export const CREAM = '#f6efe4'

export const DEFAULT_PALETTE: Palette = {
  k: NIGHT,
  b: '#a7c7ff',
  w: '#ffffff',
  p: NIGHT,
  y: '#f2a33a',
  a: NIGHT,
  c: '#3b2f2f',
  t: '#e6c15a',
  h: '#d94848',
  g: '#e6c15a',
  r: '#e03a3a',
}

// Game Boy DMG palette, for the LCD hero.
export const LCD = {
  bg: '#9bbc0f',
  light: '#8bac0f',
  dark: '#306230',
  ink: '#0f380f',
}

export const LCD_PALETTE: Palette = {
  k: LCD.ink,
  b: LCD.light,
  w: LCD.bg,
  p: LCD.ink,
  y: LCD.dark,
  a: LCD.ink,
  c: LCD.dark,
  t: LCD.bg,
  h: LCD.dark,
  g: LCD.dark,
  r: LCD.ink,
}

export function compose(spec: HoodochiSpec): Layer {
  const body = spec.body ?? 'normal'
  let base = body === 'thin' ? BASE_THIN : body === 'fat' ? BASE_FAT : BASE
  if (spec.frame === 1) {
    base = [...base.slice(0, GRID - 2), ...FEET_APART[body]]
  }
  const layers = [base, eyes(spec.mood ?? 'calm'), HATS[spec.hat ?? 'none']]
  const grid = empty().map((r) => r.split(''))
  for (const layer of layers) {
    layer.forEach((row, y) => {
      for (let x = 0; x < GRID; x++) {
        const ch = row[x]
        if (ch && ch !== '.') grid[y][x] = ch
      }
    })
  }
  return grid.map((r) => r.join(''))
}

export interface Rect {
  x: number
  y: number
  w: number
  ch: string
}

// Merge horizontal runs so the SVG stays small.
export function toRects(layer: Layer): Rect[] {
  const rects: Rect[] = []
  layer.forEach((row, y) => {
    let x = 0
    while (x < GRID) {
      const ch = row[x]
      if (ch === '.') {
        x++
        continue
      }
      let x2 = x
      while (x2 + 1 < GRID && row[x2 + 1] === ch) x2++
      rects.push({ x, y, w: x2 - x + 1, ch })
      x = x2 + 1
    }
  })
  return rects
}
