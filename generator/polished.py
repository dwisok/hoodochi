"""Hoodochi — exemple soigné : un Hoodochi complet (6 slots au palier 4)."""
from PIL import Image
import numpy as np
import scenes as sc
from scenes import Canvas, OUT, GOLD, GOLD_D, WHITE, RED, DARK, GREY
from creature import PALETTES, render

S = 96
sc.S = S
CX, CY = 32, 46
sc.CX, sc.CY = CX, CY
GROUND = CY + 42            # y des pieds
sc.GROUND = GROUND

# palette scène
SKY_TOP = (255, 196, 140)
SKY_MID = (255, 214, 160)
SKY_LOW = (255, 228, 180)
HILL = (215, 200, 150)
SAND = (238, 222, 185)
SAND_D = (222, 204, 165)
POOL = (96, 200, 235)
POOL_D = (70, 170, 215)
VILLA = (252, 248, 240)
VILLA_S = (235, 228, 214)
ROOF = (222, 112, 88)
ROOF_D = (190, 88, 70)
GLASS = (168, 214, 240)
PALM_T = (128, 90, 56)
PALM_L = (96, 168, 96)
PALM_LD = (70, 135, 78)
CAR = (222, 40, 48)
CAR_D = (170, 24, 34)
CAR_L = (245, 90, 90)
DIAM = (180, 245, 255)
DIAM_D = (110, 200, 230)


def sky(c):
    c.a[:, :] = (*SKY_TOP, 255)
    c.a[30:, :] = (*SKY_MID, 255)
    c.a[56:, :] = (*SKY_LOW, 255)
    # soleil
    c.circle(16, 16, 7, (255, 236, 150), (255, 200, 90))
    # nuages plats
    for x, y, w in ((40, 12, 18), (70, 22, 14), (6, 34, 12)):
        c.rect(x, y, w, 4, WHITE, None)
        c.rect(x + 3, y - 2, w - 6, 2, WHITE, None)
        c.rect(x - 2, y + 1, 2, 3, WHITE, None); c.rect(x + w, y + 1, 2, 3, WHITE, None)
    # collines lointaines
    for x, w, h in ((-4, 40, 10), (28, 50, 14), (66, 40, 9)):
        for i in range(h):
            ww = int(w * (1 - (i / h) ** 2 * 0.25)) // 2
            c.hline(x + w // 2 - ww, x + w // 2 + ww, GROUND - h + i + 1, HILL)
    # sol
    c.a[GROUND + 1:, :] = (*SAND, 255)
    c.hline(0, S - 1, GROUND + 1, SAND_D)
    for x in range(3, S, 9):
        c.px(x, GROUND + 4 + (x // 9) % 3, SAND_D); c.px(x + 1, GROUND + 4 + (x // 9) % 3, SAND_D)


def villa(c):
    x, y, w, h = 58, GROUND - 34, 36, 35
    # corps
    c.rect(x, y, w, h, VILLA, OUT)
    # étage en retrait
    c.rect(x + 6, y - 10, w - 12, 11, VILLA, OUT)
    c.hline(x + 7, x + w - 8, y, VILLA)
    # toits terrasse
    c.rect(x + 4, y - 12, w - 8, 3, ROOF, OUT)
    c.rect(x - 2, y - 2, w + 4, 3, ROOF, OUT)
    c.hline(x - 1, x + w, y - 1, ROOF_D)
    c.hline(x + 5, x + w - 6, y - 11, ROOF_D)
    # baie vitrée
    c.rect(x + 3, y + 5, 18, 12, GLASS, OUT)
    c.vline(x + 12, y + 6, y + 15, OUT)
    c.hline(x + 4, x + 20, y + 8, WHITE)
    # fenêtre étage
    c.rect(x + 10, y - 8, 7, 6, GLASS, OUT)
    c.rect(x + 19, y - 8, 7, 6, GLASS, OUT)
    # porte
    c.rect(x + 25, y + 20, 7, 15, (120, 80, 50), OUT)
    c.px(x + 30, y + 28, GOLD)
    # ombre du mur
    c.vline(x + w - 2, y + 1, y + h - 2, VILLA_S)
    # piscine
    c.rect(48, GROUND + 3, 48, 7, POOL, OUT)
    c.hline(49, 94, GROUND + 4, POOL_D)
    for px in range(52, 92, 8):
        c.px(px, GROUND + 7, WHITE); c.px(px + 1, GROUND + 7, WHITE)
    c.vline(50, GROUND + 1, GROUND + 5, GREY); c.vline(53, GROUND + 1, GROUND + 5, GREY)
    c.hline(50, 53, GROUND + 1, GREY); c.hline(50, 53, GROUND + 3, GREY)


def palm(c, x=4, top=GROUND - 46):
    for i in range(GROUND - top):
        xx = x + (i * 3) // (GROUND - top)
        c.px(xx, top + i, PALM_T); c.px(xx + 1, top + i, PALM_T)
        if i % 4 == 0:
            c.px(xx, top + i, OUT)
    for dx, dy, ln in ((-1, -1, 9), (1, -1, 9), (-1, 0, 11), (1, 0, 11), (-1, 1, 8), (1, 1, 8)):
        for i in range(ln):
            px = x + 1 + dx * i
            py = top + dy * (i // 2) + (i // 3 if dy == 0 else 0)
            c.px(px, py, PALM_L); c.px(px, py + 1, PALM_LD)
    c.px(x, top + 1, (160, 100, 40)); c.px(x + 2, top + 2, (160, 100, 40))


def supercar(c):
    y = GROUND
    x = 0
    # châssis bas
    c.rect(x, y - 9, 38, 7, CAR, OUT)
    # habitacle profilé
    for i, (l, r) in enumerate(((11, 30), (10, 32), (9, 34))):
        c.hline(x + l, x + r, y - 13 + i, CAR)
        c.px(x + l - 1, y - 13 + i, OUT); c.px(x + r + 1, y - 13 + i, OUT)
    c.hline(x + 12, x + 29, y - 14, OUT)
    # vitres
    c.rect(x + 13, y - 13, 8, 3, GLASS, None)
    c.rect(x + 23, y - 13, 7, 3, GLASS, None)
    c.vline(x + 21, y - 13, y - 11, OUT); c.vline(x + 22, y - 13, y - 11, CAR_D)
    # aileron
    c.rect(x + 33, y - 12, 5, 2, CAR_D, OUT)
    # reflets
    c.hline(x + 2, x + 9, y - 8, CAR_L)
    c.hline(x + 1, x + 36, y - 3, CAR_D)
    # roues
    for wx in (x + 7, x + 30):
        c.circle(wx, y - 3, 4, DARK, OUT)
        c.circle(wx, y - 3, 1, GREY, None)
    # phares
    c.px(x + 1, y - 7, (255, 240, 180)); c.px(x + 37, y - 7, RED)


# ---------------- items palier 4, version soignée
def couronne(c):
    x, y = CX + 8, CY + 4
    c.rect(x, y + 3, 16, 5, GOLD, OUT)
    c.hline(x + 1, x + 14, y + 4, (255, 236, 130))
    for i, px in enumerate((x + 1, x + 7, x + 13)):
        c.px(px, y + 2, OUT); c.px(px + 1, y + 2, OUT)
        c.px(px, y + 1, OUT); c.px(px + 1, y + 1, GOLD)
        c.px(px, y, OUT); c.px(px + 1, y, OUT)
    c.px(x + 4, y + 2, OUT); c.px(x + 10, y + 2, OUT)
    c.px(x + 7, y + 5, RED); c.px(x + 8, y + 5, RED)
    c.px(x + 3, y + 5, DIAM); c.px(x + 12, y + 5, DIAM)


def lunettes_gold(c):
    # montures gold, verres teintés légers, bien alignées sur les yeux
    for ex in (CX + 3, CX + 19):
        c.rect(ex, CY + 17, 10, 7, None, GOLD)
        c.rect(ex + 1, CY + 18, 8, 5, None, GOLD_D)
        c.px(ex, CY + 17, GOLD_D); c.px(ex + 9, CY + 17, GOLD_D)
    c.hline(CX + 13, CX + 18, CY + 19, GOLD); c.hline(CX + 13, CX + 18, CY + 20, GOLD_D)
    c.hline(CX + 1, CX + 2, CY + 19, GOLD); c.hline(CX + 29, CX + 30, CY + 19, GOLD)


def montre_diamant(c):
    x, y = CX + 3, CY + 33
    c.rect(x - 1, y, 8, 7, GOLD, OUT)
    c.rect(x, y + 1, 6, 5, DIAM, None)
    c.px(x + 2, y + 3, OUT); c.px(x + 3, y + 3, OUT)
    c.px(x + 1, y + 2, WHITE)
    c.px(x - 2, y - 1, WHITE); c.px(x + 7, y + 7, WHITE)


def visor_none(c):
    pass


def collar_and_neck(im, ticker):
    """collier + chaîne à pendentif diamant, en pixels fins"""
    im = sc.draw_collar_hires(im, ticker)
    c = Canvas((0, 0, 0)); c.a = np.array(im)
    S0 = sc.S; sc.S = im.size[0]
    cx = (CX + 16) * 2
    yb = (CY + 31) * 2 + 10
    # chaîne épaisse en maillons gold qui remplace la ficelle du collier
    neck_y = (CY + 31) * 2
    pw = 4 * len(ticker) + 5
    px0 = cx - pw // 2
    for i in range(5):
        for (xx, yy) in ((px0 - 2 - i, neck_y + 4 - i), (px0 + pw + 1 + i, neck_y + 4 - i)):
            c.px(xx, yy, GOLD); c.px(xx, yy - 1, GOLD_D); c.px(xx - 1, yy, OUT if i % 2 else GOLD_D)
    for xx in range(px0 - 2, px0 + pw + 2):
        c.px(xx, neck_y + 4, GOLD if xx % 2 else GOLD_D)
        c.px(xx, neck_y + 5, GOLD_D if xx % 2 else GOLD)
    # pendentif diamant accroché sous la plaque
    dx, dy = cx, neck_y + 14
    c.px(dx, dy - 1, GOLD_D)
    for i, w in enumerate((2, 3, 2, 1, 0)):
        col = WHITE if i == 0 else (DIAM if i < 3 else DIAM_D)
        c.hline(dx - w, dx + w, dy + i, col)
        c.px(dx - w - 1, dy + i, OUT); c.px(dx + w + 1, dy + i, OUT)
    c.hline(dx - 3, dx + 3, dy - 1, OUT)
    c.px(dx, dy + 5, OUT)
    sc.S = S0
    return Image.fromarray(c.a, "RGBA")


def build_complete(body=PALETTES["mint"], eyes="red", tip="ball", ticker="TSLA"):
    c = Canvas((0, 0, 0))
    sky(c)
    palm(c)
    palm(c, 84, GROUND - 52)
    villa(c)
    supercar(c)
    c.blit(render(body, eyes, tip), CX, CY)
    couronne(c)
    lunettes_gold(c)
    montre_diamant(c)
    sc.collar(c, None)
    im = Image.fromarray(c.a, "RGBA").resize((S * 2, S * 2), Image.NEAREST)
    im = collar_and_neck(im, ticker)
    return im


def build_mint(body=PALETTES["mint"], eyes="red", tip="ball"):
    c = Canvas((0, 0, 0))
    sky(c)
    c.blit(render(body, eyes, tip), CX, CY)
    return Image.fromarray(c.a, "RGBA").resize((S * 2, S * 2), Image.NEAREST)


if __name__ == "__main__":
    full = build_complete()
    full.resize((768, 768), Image.NEAREST).save("/mnt/user-data/outputs/hoodochi_complet.png")
    base = build_mint()
    pair = Image.new("RGB", (768 * 2 + 24, 768), (30, 30, 30))
    pair.paste(base.resize((768, 768), Image.NEAREST), (0, 0))
    pair.paste(full.resize((768, 768), Image.NEAREST), (768 + 24, 0))
    pair.save("/mnt/user-data/outputs/hoodochi_avant_apres.png")
    print("ok")
