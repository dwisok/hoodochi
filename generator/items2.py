"""Hoodochi — les 24 items, version soignée. Assemblage par calques sur canvas 96x96."""
from PIL import Image, ImageDraw
import numpy as np
import scenes as sc
from scenes import Canvas, OUT, GOLD, GOLD_D, WHITE, RED, DARK, GREY
from creature import PALETTES, render
import polished as po

S = 48
sc.S = S
CX, CY = 8, 3
sc.CX, sc.CY = CX, CY
GROUND = CY + 42
sc.GROUND = GROUND
po.CX, po.CY, po.GROUND = CX, CY, GROUND

CREAM = (246, 239, 228)
SAND = (228, 214, 184)
SAND_D = (212, 196, 165)
GOLD_L = (255, 236, 130)
SILVER = (225, 228, 235)
SILVER_D = (160, 165, 180)
DIAM, DIAM_D = po.DIAM, po.DIAM_D
GLASS = po.GLASS


def neutral_bg(c, col=(248, 166, 114)):
    c.a[:, :] = (*col, 255)


# ============================================================ TÊTE
def casquette(c):
    col, col_d, col_l = (222, 40, 48), (170, 24, 34), (245, 90, 90)
    x, y = CX + 5, CY + 5
    # calotte arrondie
    for i, (l, r) in enumerate(((5, 16), (3, 18), (2, 19), (1, 20), (0, 21), (0, 21))):
        c.hline(x + l, x + r, y + i, col)
        c.px(x + l - 1, y + i, OUT); c.px(x + r + 1, y + i, OUT)
    c.hline(x + 5, x + 16, y - 1, OUT)
    c.hline(x + 3, x + 6, y + 1, col_l)
    c.hline(x, x + 21, y + 6, OUT)
    # bouton
    c.px(x + 10, y - 1, OUT); c.px(x + 11, y - 1, OUT); c.px(x + 10, y - 2, OUT); c.px(x + 11, y - 2, OUT)
    # visière vers la droite
    c.rect(x + 14, y + 6, 14, 3, col, OUT)
    c.hline(x + 15, x + 26, y + 7, col_d)
    c.hline(x + 15, x + 26, y + 6, col)


def bob(c):
    col, col_d, band = (112, 132, 88), (82, 100, 64), (70, 84, 56)
    x, y = CX + 8, CY + 3
    # calotte
    c.rect(x, y, 16, 7, col, OUT)
    c.hline(x + 1, x + 14, y, OUT); c.hline(x + 2, x + 13, y - 1, OUT); c.hline(x + 2, x + 13, y, col)
    c.hline(x + 1, x + 14, y + 5, band)
    # bord évasé
    c.rect(x - 5, y + 7, 26, 3, col, OUT)
    c.hline(x - 4, x + 19, y + 8, col_d)
    c.px(x - 5, y + 6, OUT); c.px(x + 20, y + 6, OUT)


def beret(c):
    col, col_d = (58, 62, 120), (40, 44, 90)
    x, y = CX + 3, CY + 4
    for i, (l, r) in enumerate(((6, 15), (3, 18), (1, 20), (0, 21), (0, 22), (1, 22))):
        c.hline(x + l, x + r, y + i, col)
        c.px(x + l - 1, y + i, OUT); c.px(x + r + 1, y + i, OUT)
    c.hline(x + 6, x + 15, y - 1, OUT)
    c.hline(x + 1, x + 22, y + 6, OUT)
    c.hline(x + 3, x + 20, y + 5, col_d)
    c.px(x + 11, y - 2, OUT); c.px(x + 11, y - 3, OUT)


def couronne(c):
    po.couronne(c)


# ============================================================ YEUX
def lunettes_soleil(c):
    for ex in (CX + 3, CX + 19):
        c.rect(ex, CY + 17, 10, 7, (28, 28, 34), OUT)
        c.px(ex + 2, CY + 18, (90, 90, 110)); c.px(ex + 3, CY + 18, (90, 90, 110))
    c.hline(CX + 13, CX + 18, CY + 19, OUT); c.hline(CX + 13, CX + 18, CY + 20, OUT)
    c.hline(CX + 1, CX + 2, CY + 19, OUT); c.hline(CX + 29, CX + 30, CY + 19, OUT)


def monocle(c):
    cx, cy = CX + 23, CY + 20
    c.circle(cx, cy, 5, None, OUT)
    c.circle(cx, cy, 4, None, GOLD)
    c.px(cx - 3, cy - 3, GOLD_L); c.px(cx + 3, cy + 3, GOLD_D)
    # chaînette
    for i in range(7):
        c.px(cx + 5 + (i // 3), cy + 3 + i, GOLD if i % 2 else GOLD_D)
    c.px(cx + 7, cy + 10, OUT)


def lunettes_gold(c):
    po.lunettes_gold(c)


def visiere_laser(c):
    x, y = CX + 2, CY + 17
    c.rect(x, y, 28, 7, (40, 40, 52), OUT)
    c.rect(x + 2, y + 2, 24, 3, (255, 60, 60), None)
    c.hline(x + 3, x + 24, y + 3, (255, 150, 150))
    c.px(x - 1, y + 3, (255, 60, 60)); c.px(x + 28, y + 3, (255, 60, 60))
    c.px(x - 2, y + 3, (255, 170, 170)); c.px(x + 29, y + 3, (255, 170, 170))


# ============================================================ COU (pixels fins, après le collier)
def _hires(im):
    c = Canvas((0, 0, 0)); c.a = np.array(im)
    return c


def _plate_geom(ticker):
    cx = (CX + 16) * 2
    neck_y = (CY + 31) * 2
    pw = 4 * len(ticker) + 5
    return cx, neck_y, pw, cx - pw // 2


def cravate(im, ticker):
    c = _hires(im); S0 = sc.S; sc.S = im.size[0]
    cx, ny, pw, px0 = _plate_geom(ticker)
    col, col_d = (200, 36, 44), (150, 20, 30)
    # nœud au-dessus de la plaque
    c.rect(cx - 3, ny + 1, 6, 3, col, OUT)
    # pointe sous la plaque
    c.rect(cx - 3, ny + 13, 6, 4, col, OUT)
    c.px(cx - 2, ny + 17, OUT); c.px(cx + 1, ny + 17, OUT); c.px(cx - 1, ny + 17, col_d); c.px(cx, ny + 17, col_d)
    c.px(cx - 1, ny + 18, OUT); c.px(cx, ny + 18, OUT)
    sc.S = S0
    return Image.fromarray(c.a, "RGBA")


def foulard(im, ticker):
    c = _hires(im); S0 = sc.S; sc.S = im.size[0]
    cx, ny, pw, px0 = _plate_geom(ticker)
    col, col_d, dot = (214, 60, 90), (160, 40, 70), (255, 200, 210)
    # bande autour du cou, par-dessus le bas de la tête
    c.rect(cx - 18, ny - 3, 36, 6, col, OUT)
    for xx in range(cx - 16, cx + 17, 4):
        c.px(xx, ny - 1, dot)
    c.hline(cx - 17, cx + 16, ny + 1, col_d)
    # pan qui retombe à droite
    c.rect(cx + 10, ny + 2, 7, 12, col, OUT)
    c.px(cx + 12, ny + 6, dot); c.px(cx + 14, ny + 10, dot)
    c.hline(cx + 11, cx + 15, ny + 13, col_d)
    sc.S = S0
    return Image.fromarray(c.a, "RGBA")


def chaine_or(im, ticker):
    c = _hires(im); S0 = sc.S; sc.S = im.size[0]
    cx, ny, pw, px0 = _plate_geom(ticker)
    for i in range(5):
        for (xx, yy) in ((px0 - 2 - i, ny + 4 - i), (px0 + pw + 1 + i, ny + 4 - i)):
            c.px(xx, yy, GOLD); c.px(xx, yy - 1, GOLD_D); c.px(xx - 1, yy, OUT if i % 2 else GOLD_D)
    for xx in range(px0 - 2, px0 + pw + 2):
        c.px(xx, ny + 4, GOLD if xx % 2 else GOLD_D)
        c.px(xx, ny + 5, GOLD_D if xx % 2 else GOLD)
    sc.S = S0
    return Image.fromarray(c.a, "RGBA")


def pendentif_diamant(im, ticker):
    return po.collar_and_neck_after(im, ticker) if hasattr(po, "collar_and_neck_after") else _pendentif(im, ticker)


def _pendentif(im, ticker):
    im = chaine_or(im, ticker)
    c = _hires(im); S0 = sc.S; sc.S = im.size[0]
    cx, ny, pw, px0 = _plate_geom(ticker)
    dx, dy = cx, ny + 14
    c.px(dx, dy - 1, GOLD_D)
    for i, w in enumerate((2, 3, 2, 1, 0)):
        col = WHITE if i == 0 else (DIAM if i < 3 else DIAM_D)
        c.hline(dx - w, dx + w, dy + i, col)
        c.px(dx - w - 1, dy + i, OUT); c.px(dx + w + 1, dy + i, OUT)
    c.hline(dx - 3, dx + 3, dy - 1, OUT)
    c.px(dx, dy + 5, OUT)
    sc.S = S0
    return Image.fromarray(c.a, "RGBA")


# ============================================================ POIGNET
def bracelet_tissu(c):
    x, y = CX + 3, CY + 35
    c.hline(x, x + 5, y, (60, 150, 200)); c.hline(x, x + 5, y + 1, (240, 200, 60)); c.hline(x, x + 5, y + 2, (220, 60, 80))
    c.px(x - 1, y, OUT); c.px(x - 1, y + 1, OUT); c.px(x - 1, y + 2, OUT)
    c.px(x + 6, y, OUT); c.px(x + 6, y + 1, OUT); c.px(x + 6, y + 2, OUT)


def montre(c):
    x, y = CX + 3, CY + 34
    c.rect(x - 1, y - 1, 7, 7, SILVER, OUT)
    c.rect(x, y, 5, 5, WHITE, None)
    c.px(x + 2, y + 2, OUT); c.px(x + 2, y + 1, OUT); c.px(x + 3, y + 2, OUT)
    c.hline(x, x + 4, y + 5, SILVER_D)


def montre_gold(c):
    x, y = CX + 2, CY + 33
    c.rect(x - 1, y - 1, 9, 9, GOLD, OUT)
    c.rect(x + 1, y + 1, 5, 5, WHITE, OUT)
    c.px(x + 3, y + 3, OUT); c.px(x + 3, y + 2, OUT); c.px(x + 4, y + 3, OUT)
    c.hline(x, x + 6, y + 7, GOLD_D); c.px(x, y, GOLD_L)


def montre_diamant(c):
    po.montre_diamant(c)


# ============================================================ VÉHICULE
def velo(c):
    y = GROUND
    fr = (230, 120, 40)
    for x in (8, 28):
        c.circle(x, y - 6, 6, None, OUT)
        c.circle(x, y - 6, 4, None, GREY)
        c.px(x, y - 6, OUT)
    # cadre : triangle + fourche
    c.hline(12, 24, y - 15, fr); c.hline(12, 24, y - 16, OUT)
    for i in range(9):
        c.px(8 + i // 2, y - 6 - i, fr)          # tube de selle -> roue arrière
        c.px(24 - i // 2 + i // 4, y - 15 + i, fr)  # tube diagonal -> pédalier
        c.px(24 + i // 2, y - 15 + i, fr)        # fourche -> roue avant
    c.hline(12, 20, y - 7, fr)
    c.circle(20, y - 6, 1, OUT, OUT)
    # selle + guidon
    c.rect(6, y - 19, 7, 2, OUT, OUT); c.vline(9, y - 17, y - 15, OUT)
    c.hline(24, 30, y - 19, OUT); c.vline(26, y - 19, y - 16, OUT)
    # sacoche jaune sur porte-bagage
    c.rect(1, y - 20, 8, 6, GOLD, OUT); c.hline(2, 7, y - 17, GOLD_D)
    c.hline(4, 8, y - 14, OUT)


def scooter(c):
    y = GROUND
    col, col_d, col_l = (64, 168, 200), (44, 128, 160), (140, 215, 235)
    # carrosserie arrière + selle
    c.rect(3, y - 11, 20, 6, col, OUT)
    c.rect(6, y - 14, 14, 3, DARK, OUT)
    c.hline(4, 21, y - 8, col_d)
    # tablier avant
    c.rect(22, y - 20, 6, 15, col, OUT)
    c.hline(23, 26, y - 17, col_l)
    c.hline(19, 31, y - 21, OUT); c.px(19, y - 22, OUT); c.px(31, y - 22, OUT)
    c.px(28, y - 18, GOLD)  # phare
    # roues
    for x in (7, 27):
        c.circle(x, y - 4, 4, DARK, OUT); c.circle(x, y - 4, 1, GREY, None)
    c.hline(11, 23, y - 4, OUT)


def berline(c):
    y = GROUND
    col, col_d, col_l = (44, 50, 66), (28, 32, 44), (90, 100, 125)
    c.rect(0, y - 11, 42, 8, col, OUT)
    for i, (l, r) in enumerate(((10, 31), (8, 33), (7, 34))):
        c.hline(l, r, y - 14 + i, col); c.px(l - 1, y - 14 + i, OUT); c.px(r + 1, y - 14 + i, OUT)
    c.hline(10, 31, y - 15, OUT)
    c.rect(11, y - 14, 9, 3, GLASS, None); c.rect(22, y - 14, 9, 3, GLASS, None)
    c.vline(20, y - 14, y - 12, OUT); c.vline(21, y - 14, y - 12, OUT)
    c.hline(2, 39, y - 8, col_l)
    c.hline(1, 40, y - 4, col_d)
    for wx in (8, 33):
        c.circle(wx, y - 3, 4, DARK, OUT); c.circle(wx, y - 3, 1, GREY, None)
    c.px(1, y - 9, (255, 240, 180)); c.px(40, y - 9, RED)
    c.rect(18, y - 6, 6, 2, GREY, None)  # poignée / plaque


def supercar(c):
    po.supercar(c)


# ============================================================ LOGEMENT
def tente(c):
    x, y, h = 62, GROUND, 20
    col, col_d = (232, 128, 60), (190, 96, 44)
    for i in range(h):
        l = x + 14 - (i * 14) // h; r = x + 14 + (i * 14) // h
        c.hline(l, r, y - h + i + 1, col)
        c.hline(x + 14 + (i * 14) // (h * 2), r, y - h + i + 1, col_d)
        c.px(l, y - h + i + 1, OUT); c.px(r, y - h + i + 1, OUT)
    c.hline(x, x + 28, y + 1, OUT)
    c.px(x + 14, y - h, OUT); c.px(x + 14, y - h - 1, OUT)
    # entrée
    for i in range(9):
        c.hline(x + 14 - i // 2, x + 14 + i // 2, y - 8 + i, (70, 50, 40))
    # cordes depuis le sommet
    for i in range(5):
        c.px(x + 13 - i * 2, y - h + 1 + i, OUT); c.px(x + 15 + i * 2, y - h + 1 + i, OUT)
    c.px(x + 3, y, OUT); c.px(x + 25, y, OUT)


def studio(c):
    x, y, w, h = 62, GROUND - 34, 30, 35
    wall, wall_d = (206, 200, 190), (180, 172, 160)
    c.rect(x, y, w, h, wall, OUT)
    c.vline(x + w - 2, y + 1, y + h - 2, wall_d)
    c.hline(x, x + w - 1, y - 1, OUT); c.hline(x + 1, x + w - 2, y, wall_d)
    for yy in (y + 4, y + 14, y + 24):
        for xx in (x + 4, x + 12, x + 20):
            if yy == y + 24 and xx == x + 12:
                continue
            c.rect(xx, yy, 6, 7, GLASS, OUT); c.hline(xx + 1, xx + 4, yy + 1, WHITE)
    c.rect(x + 12, y + 24, 6, 11, (110, 78, 50), OUT); c.px(x + 16, y + 30, GOLD)
    c.rect(x + 10, y + 22, 10, 2, (200, 60, 60), OUT)  # auvent


def maison(c):
    x, y, w, h = 60, GROUND - 24, 32, 25
    wall, roof, roof_d = (250, 240, 222), (222, 112, 88), (190, 88, 70)
    c.rect(x, y, w, h, wall, OUT)
    for i in range(9):
        c.hline(x - 2 + i * 2, x + w + 1 - i * 2, y - 1 - i, roof)
        c.px(x - 3 + i * 2, y - 1 - i, OUT); c.px(x + w + 2 - i * 2, y - 1 - i, OUT)
    c.hline(x + 14, x + w - 15, y - 10, OUT)
    c.hline(x - 2, x + w + 1, y - 1, roof_d)
    c.rect(x + 22, y - 14, 4, 6, (140, 90, 70), OUT)  # cheminée
    c.rect(x + 4, y + 5, 8, 7, GLASS, OUT); c.rect(x + 20, y + 5, 8, 7, GLASS, OUT)
    c.vline(x + 8, y + 6, y + 10, OUT); c.vline(x + 24, y + 6, y + 10, OUT)
    c.rect(x + 13, y + 14, 7, 11, (120, 80, 50), OUT); c.px(x + 18, y + 20, GOLD)
    c.rect(x + 3, y + 18, 7, 6, (110, 180, 100), OUT)  # buisson
    c.rect(x + 22, y + 18, 7, 6, (110, 180, 100), OUT)


def villa(c):
    po.palm(c, 84, GROUND - 52)
    po.villa(c)


# ============================================================ MAIN (bras droit)
def gobelet(c):
    x, y = CX + 26, CY + 31
    c.rect(x, y, 6, 8, WHITE, OUT)
    c.hline(x - 1, x + 6, y, OUT); c.hline(x, x + 5, y + 1, (110, 75, 45))
    c.hline(x + 1, x + 4, y + 4, (200, 60, 60))
    c.px(x + 2, y - 2, GREY); c.px(x + 3, y - 3, GREY)


def telephone(c):
    x, y = CX + 26, CY + 30
    c.rect(x, y, 6, 10, (40, 40, 52), OUT)
    c.rect(x + 1, y + 1, 4, 7, (120, 200, 255), None)
    c.hline(x + 1, x + 4, y + 2, (90, 220, 130)); c.hline(x + 1, x + 3, y + 4, WHITE)
    c.px(x + 2, y + 8, GREY); c.px(x + 3, y + 8, GREY)


def cigare(c):
    x, y = CX + 27, CY + 33
    c.rect(x, y, 9, 3, (150, 100, 60), OUT)
    c.hline(x + 1, x + 7, y + 1, (120, 78, 45))
    c.px(x + 3, y + 1, (220, 60, 60)); c.px(x + 4, y + 1, GOLD)
    c.px(x + 9, y + 1, (255, 120, 60)); c.px(x + 10, y + 1, (255, 200, 120))
    for i, (dx, dy) in enumerate(((11, -1), (12, -3), (11, -5), (12, -7))):
        c.px(x + dx, y + dy, (200, 200, 205))


def liasse(c):
    x, y = CX + 25, CY + 30
    for i in range(3):
        c.rect(x + i, y + 6 - i * 3, 9, 4, (120, 190, 110), OUT)
        c.hline(x + i + 1, x + i + 7, y + 7 - i * 3, (90, 160, 90))
    c.rect(x + 5, y + 1, 3, 2, GOLD, None)
    c.px(x + 2, y + 1, (60, 120, 70)); c.px(x + 8, y + 1, (60, 120, 70))
    c.px(x - 1, y - 2, GOLD); c.px(x + 11, y - 1, GOLD); c.px(x + 12, y + 3, GOLD)


# ============================================================ grille
GRID = {
    "tete":     [("casquette", casquette), ("bob", bob), ("beret", beret), ("couronne", couronne)],
    "yeux":     [("lunettes de soleil", lunettes_soleil), ("monocle", monocle), ("lunettes gold", lunettes_gold), ("visiere laser", visiere_laser)],
    "cou":      [("cravate", cravate), ("foulard", foulard), ("chaine d'or", chaine_or), ("pendentif diamant", _pendentif)],
    "poignet":  [("bracelet tissu", bracelet_tissu), ("montre", montre), ("grosse montre gold", montre_gold), ("montre a diamants", montre_diamant)],
    "main":     [("gobelet cafe", gobelet), ("telephone", telephone), ("cigare", cigare), ("liasse de billets", liasse)],
    "vehicule": [("velo", velo), ("scooter", scooter), ("berline", berline), ("supercar rouge", supercar)],
    "logement": [("tente", tente), ("studio", studio), ("maison", maison), ("villa piscine", villa)],
}


def build(body, eyes, tip, ticker, equip, bg=neutral_bg):
    c = Canvas((0, 0, 0))
    bg(c)
    for slot in ("logement", "vehicule"):
        t = equip.get(slot, 0)
        if t:
            GRID[slot][t - 1][1](c)
    c.blit(render(body, eyes, tip), CX, CY)
    for slot in ("tete", "yeux", "poignet", "main"):
        t = equip.get(slot, 0)
        if t:
            GRID[slot][t - 1][1](c)
    im = Image.fromarray(c.a, "RGBA").resize((S * 2, S * 2), Image.NEAREST)
    if ticker:
        im = sc.draw_collar_hires(im, ticker)
        t = equip.get("cou", 0)
        if t:
            im = GRID["cou"][t - 1][1](im, ticker)
    return im


def label_sheet(cells, labels, cols, scale=2, pad=8, bg=(30, 30, 30), row_labels=None):
    cw = S * 2 * scale
    lh = 16
    left = 100 if row_labels else 0
    rows = (len(cells) + cols - 1) // cols
    out = Image.new("RGB", (left + cols * (cw + pad) + pad, rows * (cw + pad + lh) + pad), bg)
    d = ImageDraw.Draw(out)
    for i, im in enumerate(cells):
        x = left + pad + (i % cols) * (cw + pad); y = pad + (i // cols) * (cw + pad + lh)
        out.paste(im.resize((cw, cw), Image.NEAREST), (x, y))
        d.text((x + 4, y + cw + 2), labels[i].upper(), fill=CREAM)
        if row_labels and i % cols == 0:
            d.text((8, y + cw // 2), row_labels[i // cols].upper(), fill=GOLD)
    return out


if __name__ == "__main__":
    body, eyes, tip, ticker = PALETTES["mint"], "red", "ball", "TSLA"
    cells, labels = [], []
    for slot, items in list(GRID.items())[:5]:
        for t, (name, _) in enumerate(items, 1):
            cells.append(build(body, eyes, tip, ticker, {slot: t}))
            labels.append(f"P{t} {name}")
    label_sheet(cells, labels, 4, scale=4, row_labels=list(GRID)[:5]).save("/mnt/user-data/outputs/hoodochi_items_propre.png")
    full = build(body, eyes, tip, ticker, {"tete": 4, "yeux": 3, "cou": 4, "poignet": 4, "main": 4})
    full.resize((768, 768), Image.NEAREST).save("/mnt/user-data/outputs/hoodochi_complet.png")
    import random; random.seed(3)
    from creature import BACKGROUNDS, EYES, TIPS
    cells = []
    for i in range(8):
        eq = {s: random.choice([0, 1, 2, 3, 4]) for s in ("tete", "yeux", "cou", "poignet", "main")}
        bgc = random.choice(list(BACKGROUNDS.values()))
        cells.append(build(random.choice(list(PALETTES.values())), random.choice(list(EYES)), random.choice(list(TIPS)), random.choice(["TSLA", "NVDA", "AAPL", "GME", "AMD"]), eq, bg=lambda c, col=bgc: neutral_bg(c, col)))
    label_sheet(cells, [""] * 8, 4, scale=3).save("/mnt/user-data/outputs/hoodochi_exemples.png")
    print("ok")
