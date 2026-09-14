"""Hoodochi — fonds rares (48x48), flat pixel art."""
from PIL import Image
import random
import items2 as it
from items2 import build, S, PALETTES
from scenes import OUT, GOLD, GOLD_D, WHITE

CX, CY, GROUND = it.CX, it.CY, it.GROUND


def bands(c, cols):
    n = len(cols); h = S / n
    for i, col in enumerate(cols):
        c.a[int(i * h):int((i + 1) * h), :] = (*col, 255)


def sunset(c):
    bands(c, [(255, 170, 90), (255, 190, 110), (255, 210, 140), (255, 226, 170), (250, 236, 200)])
    c.circle(36, 14, 6, (255, 240, 170), (255, 210, 110))
    for x, y, w in ((4, 8, 10), (24, 22, 8), (38, 30, 9)):
        c.rect(x, y, w, 2, WHITE, None); c.rect(x + 2, y - 1, w - 4, 1, WHITE, None)


def night(c):
    c.a[:, :] = (*(26, 31, 58), 255)
    random.seed(11)
    for _ in range(26):
        x, y = random.randrange(S), random.randrange(S)
        c.px(x, y, (230, 235, 255) if random.random() < .7 else (150, 160, 220))
    for x, y in ((8, 10), (38, 6), (42, 30)):
        c.px(x, y, WHITE); c.px(x - 1, y, (150, 160, 220)); c.px(x + 1, y, (150, 160, 220)); c.px(x, y - 1, (150, 160, 220)); c.px(x, y + 1, (150, 160, 220))
    c.circle(38, 12, 5, (250, 244, 210), (230, 220, 170)); c.circle(41, 10, 5, (26, 31, 58), (26, 31, 58))


def pump(c):
    """chandeliers verts qui montent"""
    c.a[:, :] = (*(18, 40, 32), 255)
    g, gd = (60, 200, 110), (34, 140, 78)
    lows = [40, 38, 36, 37, 33, 30, 31, 27, 24, 20, 18, 14]
    for i, lo in enumerate(lows):
        x = 1 + i * 4
        hi = lo - 5 - (i % 3)
        c.vline(x + 1, hi - 2, lo + 2, gd)
        c.rect(x, hi, 3, lo - hi + 1, g, gd)
    for y in range(4, S, 8):
        c.hline(0, S - 1, y, (24, 52, 42))


def gold_rain(c):
    c.a[:, :] = (*(40, 32, 60), 255)
    random.seed(5)
    for _ in range(18):
        x, y = random.randrange(S - 3), random.randrange(S - 3)
        c.rect(x, y, 3, 3, GOLD, GOLD_D); c.px(x + 1, y + 1, (255, 240, 150))
    for _ in range(10):
        x, y = random.randrange(S), random.randrange(S)
        c.px(x, y, (255, 236, 130))


def sunburst(c):
    c.a[:, :] = (*(255, 220, 90), 255)
    cx, cy = 24, 26
    import math
    for y in range(S):
        for x in range(S):
            a = math.atan2(y - cy, x - cx)
            if int((a + math.pi) / (2 * math.pi) * 16) % 2:
                c.px(x, y, (255, 200, 60))


def synthwave(c):
    bands(c, [(60, 20, 90), (110, 30, 120), (190, 50, 130), (250, 100, 120)])
    c.circle(24, 18, 9, (255, 150, 90), (255, 120, 90))
    for y in range(12, 27, 3):
        c.hline(15, 33, y, (60, 20, 90))
    c.a[30:, :] = (*(30, 10, 50), 255)
    for x in range(0, S, 6):
        c.vline(x, 30, S - 1, (200, 80, 220))
    for y in (30, 33, 37, 42, 47):
        c.hline(0, S - 1, y, (200, 80, 220))


def holo(c):
    cols = [(255, 150, 170), (255, 200, 140), (250, 245, 150), (160, 240, 180), (150, 210, 255), (200, 170, 255)]
    for y in range(S):
        for x in range(S):
            c.px(x, y, cols[((x + y) // 6) % len(cols)])
    for x, y in ((6, 8), (40, 6), (10, 40), (42, 38), (24, 4)):
        c.px(x, y, WHITE); c.px(x - 1, y, WHITE); c.px(x + 1, y, WHITE); c.px(x, y - 1, WHITE); c.px(x, y + 1, WHITE)


def wallstreet(c):
    bands(c, [(255, 150, 80), (255, 180, 100), (255, 205, 130)])
    sil = (90, 60, 80)
    for x, w, h in ((0, 6, 20), (7, 5, 30), (13, 8, 24), (22, 6, 36), (29, 7, 28), (37, 5, 40), (43, 5, 22)):
        c.rect(x, S - h, w, h, sil, None)
        for yy in range(S - h + 2, S - 2, 3):
            for xx in range(x + 1, x + w - 1, 2):
                c.px(xx, yy, (255, 220, 120))


def matrix(c):
    c.a[:, :] = (*(8, 20, 12), 255)
    random.seed(9)
    for x in range(1, S, 4):
        ln = random.randrange(6, 20); y0 = random.randrange(S)
        for i in range(ln):
            y = (y0 + i) % S
            c.px(x, y, (90, 255, 140) if i == ln - 1 else (30, 150, 70) if i % 2 else (20, 100, 50))


def vault(c):
    """coffre : mur de lingots d'or"""
    c.a[:, :] = (*(48, 40, 44), 255)
    for row in range(0, S, 7):
        off = 5 if (row // 7) % 2 else 0
        for x in range(-5 + off, S, 11):
            c.rect(x, row + 1, 10, 5, GOLD, GOLD_D)
            c.hline(x + 1, x + 8, row + 2, (255, 236, 130))
            c.px(x + 4, row + 4, GOLD_D); c.px(x + 5, row + 4, GOLD_D)


RARE = [
    ("sunset", sunset), ("starry", night), ("pump", pump), ("gold rain", gold_rain),
    ("sunburst", sunburst), ("synthwave", synthwave), ("holo", holo), ("wall street", wallstreet),
    ("matrix", matrix), ("vault", vault),
]

if __name__ == "__main__":
    random.seed(2)
    bodies = list(PALETTES.values())
    cells, labels = [], []
    for name, fn in RARE:
        cells.append(build(random.choice(bodies), random.choice(["red", "black", "gold", "happy"]), random.choice(["ball", "coin", "dark"]), random.choice(["TSLA", "NVDA", "GME"]), {}, bg=fn))
        labels.append(name)
    it.label_sheet(cells, labels, 5, scale=3).save("/mnt/user-data/outputs/hoodochi_fonds_rares.png")
    print("ok")
