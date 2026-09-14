"""Exporte les calques du générateur vers le site (src/sprites-v2.ts) en data URIs.
Pixel-identique à items2.build : mêmes fonctions, même canvas, même ordre."""
import base64, io, json, sys
import numpy as np
from PIL import Image
import scenes as sc
import items2 as it
from items2 import GRID, CX, CY, S
from creature import ROWS, COLORS, PALETTES, EYES, TIPS, BACKGROUNDS, W, H
import rare_bg
from scenes import FONT

OUT_TS = sys.argv[1] if len(sys.argv) > 1 else "sprites-v2.ts"


def uri(im):
    b = io.BytesIO(); im.save(b, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(b.getvalue()).decode()


def layer_from_rows(rows, body=None, keep=None):
    """rows -> RGBA 32x44 ; keep(ch, x, y) filtre les pixels gardés"""
    img = np.zeros((H, W, 4), np.uint8)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            c = COLORS[ch]
            if c is None or (keep and not keep(ch, x, y)):
                continue
            if c == "BODY":
                c = body
            img[y, x] = (*c, 255)
    return Image.fromarray(img, "RGBA")


# --- base : corps (yeux remplacés par du corps, antennes vidées)
base_rows = [list(r) for r in ROWS]
for dy in range(5):
    for dx in range(5):
        base_rows[dy][1 + dx] = "."; base_rows[dy][26 + dx] = "."
for dy in range(6):
    for dx in range(8):
        base_rows[17 + dy][4 + dx] = "m"; base_rows[17 + dy][20 + dx] = "m"
base_rows = ["".join(r) for r in base_rows]
bodies = {k: uri(layer_from_rows(base_rows, v)) for k, v in PALETTES.items()}

# --- yeux : seulement les pixels des yeux
eyes = {}
for name, el in EYES.items():
    rows = [["."] * W for _ in range(H)]
    er = [r[::-1] for r in el]
    for dy in range(6):
        for dx in range(8):
            if el[dy][dx] != ".": rows[17 + dy][4 + dx] = el[dy][dx]
            if er[dy][dx] != ".": rows[17 + dy][20 + dx] = er[dy][dx]
    eyes[name] = uri(layer_from_rows(["".join(r) for r in rows]))

# --- bouts d'antennes (+ connecteur du cœur)
tips = {}
for name, tl in TIPS.items():
    rows = [["."] * W for _ in range(H)]
    tr = [r[::-1] for r in tl]
    for dy in range(5):
        for dx in range(5):
            rows[dy][1 + dx] = tl[dy][dx]; rows[dy][26 + dx] = tr[dy][dx]
    if tl[4][4] == "." and tl[4][3] != ".":
        rows[4][4] = "#"; rows[4][27] = "#"
    tips[name] = uri(layer_from_rows(["".join(r) for r in rows]))


# --- items portés (48x48, transparents)
def transparent():
    c = sc.Canvas((0, 0, 0)); c.a[:, :] = 0
    return c


items = {}
for slot in ("tete", "yeux", "poignet", "main"):
    items[slot] = []
    for name, fn in GRID[slot]:
        c = transparent(); fn(c)
        items[slot].append({"name": name, "uri": uri(Image.fromarray(c.a, "RGBA"))})

# --- cou (96x96, dépend de la longueur du ticker pour chaîne/pendentif)
neck = []
for name, fn in GRID["cou"]:
    entry = {"name": name, "uris": {}}
    for n in range(1, 6):
        blank = Image.fromarray(np.zeros((S * 2, S * 2, 4), np.uint8), "RGBA")
        entry["uris"][str(n)] = uri(fn(blank, "X" * n))
    neck.append(entry)

# --- fonds rares (48x48)
rare = {}
for name, fn in rare_bg.RARE:
    c = sc.Canvas((0, 0, 0)); fn(c)
    rare[name] = uri(Image.fromarray(c.a, "RGBA"))

# --- tombe (48x48) — cimetière
c = transparent()
sc.S = S
try:
    sc.gravestone(c)
    grave = uri(Image.fromarray(c.a, "RGBA"))
except Exception as e:
    grave = ""
    print("gravestone skipped:", e)

coll = json.load(open(sys.argv[2] if len(sys.argv) > 2 else "../collection/collection.json"))
tokens = coll["tokens"]

ts = f"""// GÉNÉRÉ par generator/export_site.py — ne pas éditer à la main.
// Calques pixel-identiques au générateur Python (items2.build).
// Grille : créature 32×44 posée en ({CX},{CY}) sur un canvas 48×48 ; collier et cou en 96×96 (×2).

export const CREATURE_W = {W}
export const CREATURE_H = {H}
export const CANVAS = {S}
export const OFFSET = {{ x: {CX}, y: {CY} }}

export const BODY_COLORS = {json.dumps({k: '#%02x%02x%02x' % v for k, v in PALETTES.items()}, indent=2)} as const
export type BodyName = keyof typeof BODY_COLORS

export const BACKGROUND_COLORS = {json.dumps({k: '#%02x%02x%02x' % v for k, v in BACKGROUNDS.items()}, indent=2)} as const

export const BODY_LAYERS: Record<BodyName, string> = {json.dumps(bodies, indent=2)}

export const EYE_LAYERS = {json.dumps(eyes, indent=2)} as const
export type EyesName = keyof typeof EYE_LAYERS

export const TIP_LAYERS = {json.dumps(tips, indent=2)} as const
export type TipName = keyof typeof TIP_LAYERS

export const RARE_BACKGROUNDS = {json.dumps(rare, indent=2)} as const
export type RareBgName = keyof typeof RARE_BACKGROUNDS

export const SLOTS = ['tete', 'yeux', 'cou', 'poignet', 'main'] as const
export type Slot = (typeof SLOTS)[number]
export const SLOT_LABEL: Record<Slot, string> = {{ tete: 'Head', yeux: 'Eyewear', cou: 'Neck', poignet: 'Wrist', main: 'Hand' }}

/** Items portés, 48×48 transparents, index = palier − 1. */
export const ITEMS: Record<Exclude<Slot, 'cou'>, {{ name: string; uri: string }}[]> = {json.dumps(items, indent=2)}

/** Items de cou, 96×96, par longueur de ticker (1–5). */
export const NECK: {{ name: string; uris: Record<string, string> }}[] = {json.dumps(neck, indent=2)}

export const GRAVE = {json.dumps(grave)}

/** Police 3×5 du ticker sur la plaque. */
export const FONT: Record<string, string[]> = {json.dumps(FONT)}

/** Les 1 000 traits de naissance (index 0 = token #1), depuis collection.json. */
export const TOKENS: {{ body: BodyName; eyes: EyesName; antenna: TipName; background: string }}[] = {json.dumps(tokens, separators=(',', ':'))}
"""
open(OUT_TS, "w").write(ts)
print("ok", len(ts) // 1024, "KB")
