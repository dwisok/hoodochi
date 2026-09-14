"""Hoodochi — 20 niveaux (décor + tenue + accessoire) sur un canvas 64x64."""
from PIL import Image
import numpy as np
from creature import render, PALETTES, W as CW, H as CH

S = 64
CX, CY = 16, 18            # position de la créature sur le canvas
GROUND = CY + CH - 1       # ligne des pieds (y=60)

OUT = (30, 30, 30)
GOLD = (255, 215, 60)
GOLD_D = (200, 150, 20)
WHITE = (255, 255, 255)
RED = (220, 40, 40)
DARK = (60, 60, 70)
GREY = (150, 150, 160)
BROWN = (150, 105, 60)
BROWN_D = (110, 75, 40)
GREEN = (110, 180, 90)
GREEN_D = (70, 130, 60)
BLUE = (70, 130, 220)
SKY = (150, 205, 245)
NIGHT = (26, 31, 58)
PINKC = (255, 140, 170)
CREAM = (246, 239, 228)

# police 3x5 pour le ticker
FONT = {
    "A": ["010", "101", "111", "101", "101"], "B": ["110", "101", "110", "101", "110"],
    "C": ["011", "100", "100", "100", "011"], "D": ["110", "101", "101", "101", "110"],
    "E": ["111", "100", "110", "100", "111"], "F": ["111", "100", "110", "100", "100"],
    "G": ["011", "100", "101", "101", "011"], "H": ["101", "101", "111", "101", "101"],
    "I": ["111", "010", "010", "010", "111"], "J": ["001", "001", "001", "101", "010"],
    "K": ["101", "110", "100", "110", "101"], "L": ["100", "100", "100", "100", "111"],
    "M": ["101", "111", "111", "101", "101"], "N": ["110", "101", "101", "101", "101"],
    "O": ["010", "101", "101", "101", "010"], "P": ["110", "101", "110", "100", "100"],
    "Q": ["010", "101", "101", "011", "001"], "R": ["110", "101", "110", "101", "101"],
    "S": ["011", "100", "010", "001", "110"], "T": ["111", "010", "010", "010", "010"],
    "U": ["101", "101", "101", "101", "111"], "V": ["101", "101", "101", "101", "010"],
    "W": ["101", "101", "111", "111", "101"], "X": ["101", "101", "010", "101", "101"],
    "Y": ["101", "101", "010", "010", "010"], "Z": ["111", "001", "010", "100", "111"],
}


class Canvas:
    def __init__(self, bg):
        self.a = np.zeros((S, S, 4), np.uint8)
        self.a[:, :] = (*bg, 255)
        self.ticker = None

    def px(self, x, y, c):
        if 0 <= x < S and 0 <= y < S and c is not None:
            self.a[y, x] = (*c, 255)

    def rect(self, x, y, w, h, fill, outline=OUT):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                edge = yy in (y, y + h - 1) or xx in (x, x + w - 1)
                self.px(xx, yy, outline if (edge and outline) else fill)

    def circle(self, cx, cy, r, fill, outline=OUT):
        for yy in range(cy - r - 1, cy + r + 2):
            for xx in range(cx - r - 1, cx + r + 2):
                d = ((xx - cx) ** 2 + (yy - cy) ** 2) ** 0.5
                if d <= r + 0.5:
                    self.px(xx, yy, outline if d > r - 0.6 else fill)

    def hline(self, x0, x1, y, c):
        for x in range(x0, x1 + 1):
            self.px(x, y, c)

    def vline(self, x, y0, y1, c):
        for y in range(y0, y1 + 1):
            self.px(x, y, c)

    def text(self, x, y, s, c):
        for ch in s:
            g = FONT.get(ch)
            if g:
                for dy, row in enumerate(g):
                    for dx, v in enumerate(row):
                        if v == "1":
                            self.px(x + dx, y + dy, c)
            x += 4

    def blit(self, im, x, y):
        arr = np.array(im)
        h, w = arr.shape[:2]
        for yy in range(h):
            for xx in range(w):
                if arr[yy, xx, 3]:
                    self.px(x + xx, y + yy, tuple(arr[yy, xx, :3]))

    def image(self):
        im = Image.fromarray(self.a, "RGBA").resize((S * 2, S * 2), Image.NEAREST)
        if self.ticker:
            im = draw_collar_hires(im, self.ticker)
        return im


# --------------------------------------------------------------- créature
def creature(c, body, eyes, tip):
    c.blit(render(body, eyes, tip), CX, CY)


def collar(c, ticker):
    c.ticker = ticker


def draw_collar_hires(im, ticker):
    """dessine le collier en pixels fins (x2) : chaîne courte + plaque gold arrondie"""
    c = Canvas(CREAM); c.a = np.array(im)
    global S
    S0 = S; S = im.size[0]
    neck_y = (CY + 31) * 2
    cx = (CX + 16) * 2
    pw = 4 * len(ticker) + 5
    px0 = cx - pw // 2
    py0 = neck_y + 4
    # chaîne : deux brins courts depuis le bas de la tête
    for i in range(4):
        c.px(px0 - 1 - i, neck_y + 3 - i, GOLD); c.px(px0 + pw + i, neck_y + 3 - i, GOLD)
    c.hline(px0 - 1, px0 + pw, neck_y + 4, GOLD)
    c.rect(px0, py0, pw, 9, GOLD, OUT)
    for (xx, yy) in ((px0, py0), (px0 + pw - 1, py0), (px0, py0 + 8), (px0 + pw - 1, py0 + 8)):
        c.a[yy, xx] = np.array(im)[yy, xx]
    c.text(px0 + 3, py0 + 2, ticker, OUT)
    S = S0
    return Image.fromarray(c.a, "RGBA")


# ------------------------------------------------------------ tenues (sur le corps)
def outfit_fill(c, color, rows=range(33, 40)):
    """recolore l'intérieur du corps (pas les bras) -> t-shirt / sweat / costume"""
    for dy in rows:
        y = CY + dy
        for x in range(CX + 9, CX + 23):
            if tuple(c.a[y, x, :3]) not in (OUT, GOLD, GOLD_D):
                c.px(x, y, color)


def hoodie(c, color):
    outfit_fill(c, color, range(32, 40))
    # capuche : bord autour de la tête en bas
    for x in range(CX + 8, CX + 24):
        c.px(x, CY + 31, color)
    c.hline(CX + 8, CX + 23, CY + 30, OUT)


def suit(c, color=DARK):
    outfit_fill(c, color, range(32, 40))
    # chemise en V + cravate
    for i in range(3):
        c.px(CX + 15 - i, CY + 32 + i, WHITE); c.px(CX + 16 + i, CY + 32 + i, WHITE)
    c.vline(CX + 15, CY + 33, CY + 37, RED); c.vline(CX + 16, CY + 33, CY + 37, RED)


def uniform(c):
    outfit_fill(c, RED, range(32, 40))
    c.rect(CX + 13, CY + 35, 6, 3, GOLD, OUT)


# ------------------------------------------------------------ tête
def beanie(c, color=(90, 90, 110)):
    for dy in range(9, 14):
        for x in range(CX + 4, CX + 28):
            if tuple(c.a[CY + dy, x, :3]) != OUT:
                c.px(x, CY + dy, color)
    c.rect(CX + 4, CY + 12, 24, 3, color, OUT)
    c.rect(CX + 6, CY + 7, 20, 4, color, OUT)
    c.rect(CX + 13, CY + 4, 6, 4, color, OUT)


def cap(c, color=RED):
    c.rect(CX + 5, CY + 8, 22, 5, color, OUT)
    c.rect(CX + 20, CY + 11, 12, 3, color, OUT)


def sunglasses(c):
    for ex in (CX + 4, CX + 20):
        c.rect(ex, CY + 18, 8, 5, OUT, OUT)
    c.hline(CX + 12, CX + 19, CY + 19, OUT)


def crown(c):
    c.rect(CX + 10, CY + 5, 12, 5, GOLD, OUT)
    for x in (CX + 11, CX + 15, CX + 19):
        c.px(x, CY + 4, OUT); c.px(x + 1, CY + 4, OUT)
        c.px(x, CY + 3, OUT); c.px(x + 1, CY + 3, GOLD)
    c.px(CX + 15, CY + 6, RED); c.px(CX + 16, CY + 6, RED)


def headphones(c):
    c.hline(CX + 6, CX + 25, CY + 8, OUT)
    for x in (CX + 1, CX + 27):
        c.rect(x, CY + 15, 4, 7, BLUE, OUT)


def watch(c):
    c.rect(CX + 4, CY + 34, 4, 4, GOLD, OUT)


# ------------------------------------------------------------ objets en main / au sol
def coffee(c):
    c.rect(CX + 26, CY + 33, 5, 6, WHITE, OUT)
    c.hline(CX + 27, CX + 29, CY + 34, BROWN)


def phone(c):
    c.rect(CX + 26, CY + 32, 4, 7, DARK, OUT)
    c.rect(CX + 27, CY + 33, 2, 4, SKY, None)


def cocktail(c):
    c.rect(CX + 26, CY + 30, 6, 4, PINKC, OUT)
    c.vline(CX + 28, CY + 34, CY + 37, OUT)
    c.hline(CX + 27, CX + 29, CY + 38, OUT)
    c.px(CX + 31, CY + 29, GREEN)


def cigar(c):
    c.hline(CX + 19, CX + 25, CY + 25, BROWN)
    c.hline(CX + 19, CX + 25, CY + 26, BROWN_D)
    c.px(CX + 26, CY + 25, RED); c.px(CX + 27, CY + 23, GREY)


def money_bag(c):
    c.rect(CX - 8, GROUND - 9, 9, 10, (200, 170, 90), OUT)
    c.hline(CX - 6, CX - 2, GROUND - 10, OUT)
    c.text(CX - 6, GROUND - 7, "S", GREEN_D)


def burger(c):
    c.rect(CX + 25, CY + 33, 7, 2, (230, 180, 90), OUT)
    c.hline(CX + 25, CX + 31, CY + 35, GREEN)
    c.hline(CX + 25, CX + 31, CY + 36, BROWN_D)
    c.rect(CX + 25, CY + 37, 7, 2, (230, 180, 90), OUT)


# ------------------------------------------------------------ décors
def sky_ground(c, sky, ground, gy=GROUND + 1):
    c.a[:, :] = (*sky, 255)
    c.a[gy:, :] = (*ground, 255)
    c.hline(0, S - 1, gy, OUT)


def rain(c):
    for i in range(0, S, 6):
        for j in range(0, GROUND, 9):
            c.px(i + (j // 9) % 3, j + (i // 6) % 5, (120, 160, 220))


def city_far(c, color=(120, 130, 160), base=GROUND + 1):
    for x, w, h in ((2, 6, 18), (10, 5, 26), (17, 8, 14), (48, 6, 22), (56, 7, 30)):
        c.rect(x, base - h, w, h, color, None)


def cardboard(c):
    c.rect(CX - 4, GROUND - 26, 40, 8, BROWN, OUT)  # rabat derrière
    c.rect(CX - 6, GROUND - 18, 44, 19, BROWN, OUT)
    c.a[GROUND - 17:GROUND, CX - 5:CX + 37] = (*BROWN, 255)


def bench(c):
    c.rect(4, GROUND - 14, 56, 4, BROWN, OUT)
    for x in (8, 52):
        c.rect(x, GROUND - 10, 4, 11, GREY, OUT)
    c.rect(4, GROUND - 22, 56, 4, BROWN, OUT)


def bus_stop(c):
    c.vline(6, GROUND - 40, GROUND, OUT)
    c.rect(2, GROUND - 46, 12, 8, BLUE, OUT)
    c.text(4, GROUND - 44, "BUS", WHITE)


def mattress(c):
    c.rect(8, GROUND - 6, 48, 7, (180, 190, 200), OUT)
    c.rect(10, GROUND - 10, 14, 5, WHITE, OUT)


def wall_room(c, wall, floor):
    sky_ground(c, wall, floor, GROUND - 6)
    c.a[GROUND - 5:, :] = (*floor, 255)


def window(c, x=40, y=8, w=18, h=16, view=SKY):
    c.rect(x, y, w, h, view, OUT)
    c.vline(x + w // 2, y, y + h - 1, OUT); c.hline(x, x + w - 1, y + h // 2, OUT)


def poster(c, x=4, y=8):
    c.rect(x, y, 14, 18, (240, 200, 90), OUT)
    c.text(x + 2, y + 3, "GM", OUT); c.text(x + 2, y + 10, "UP", RED)


def desk(c):
    c.rect(38, GROUND - 22, 24, 3, BROWN, OUT)
    c.vline(40, GROUND - 19, GROUND, OUT); c.vline(59, GROUND - 19, GROUND, OUT)
    c.rect(44, GROUND - 34, 14, 12, DARK, OUT)
    c.rect(46, GROUND - 32, 10, 8, (90, 200, 120), None)
    c.vline(51, GROUND - 22, GROUND - 23, OUT)


def laptop(c):
    c.rect(CX + 24, CY + 30, 12, 8, DARK, OUT)
    c.rect(CX + 26, CY + 32, 8, 4, (90, 200, 120), None)
    c.rect(CX + 22, CY + 38, 16, 2, GREY, OUT)


def bike(c):
    for x in (7, 25):
        c.circle(x, GROUND - 6, 6, None, OUT)
    c.hline(7, 25, GROUND - 12, OUT); c.hline(7, 25, GROUND - 6, OUT)
    c.vline(16, GROUND - 14, GROUND - 6, OUT)
    c.rect(13, GROUND - 16, 6, 3, (220, 120, 40), OUT)
    c.rect(3, GROUND - 26, 10, 8, GOLD, OUT)
    c.hline(24, 28, GROUND - 14, OUT)


def scooter(c, color=(60, 170, 200)):
    c.rect(6, GROUND - 12, 24, 6, color, OUT)
    c.rect(24, GROUND - 22, 8, 10, color, OUT)
    c.hline(22, 34, GROUND - 23, OUT)
    for x in (9, 29):
        c.circle(x, GROUND - 4, 4, DARK, OUT)


def car(c, color, x=2, w=30):
    c.rect(x, GROUND - 12, w, 8, color, OUT)
    c.rect(x + 6, GROUND - 19, w - 12, 8, color, OUT)
    c.rect(x + 8, GROUND - 17, (w - 16) // 2, 4, SKY, None)
    c.rect(x + w - 8 - (w - 16) // 2, GROUND - 17, (w - 16) // 2, 4, SKY, None)
    for wx in (x + 5, x + w - 8):
        c.rect(wx, GROUND - 6, 6, 6, DARK, OUT)
        c.px(wx + 2, GROUND - 3, GREY); c.px(wx + 3, GROUND - 3, GREY)
    c.px(x + 1, GROUND - 10, GOLD); c.px(x + w - 2, GROUND - 10, RED)


def supercar(c, color=RED):
    c.rect(1, GROUND - 10, 36, 7, color, OUT)
    c.rect(8, GROUND - 16, 20, 7, color, OUT)
    c.rect(12, GROUND - 14, 12, 4, DARK, None)
    c.rect(28, GROUND - 14, 8, 5, color, OUT)
    for wx in (5, 27):
        c.rect(wx, GROUND - 6, 7, 7, DARK, OUT)
        c.rect(wx + 2, GROUND - 4, 3, 3, GREY, None)
    c.px(2, GROUND - 8, GOLD); c.px(36, GROUND - 8, GOLD)


def house(c, x, y, w, h, wall, roof, door=True):
    c.rect(x, y, w, h, wall, OUT)
    for i in range(6):
        c.hline(x - 2 + i, x + w + 1 - i, y - 1 - i, roof if i else OUT)
    c.hline(x - 2, x + w + 1, y - 1, OUT)
    if door:
        c.rect(x + w // 2 - 2, y + h - 7, 5, 7, BROWN, OUT)
    for wx in (x + 3, x + w - 8):
        c.rect(wx, y + 3, 5, 5, SKY, OUT)


def pool(c):
    c.rect(34, GROUND - 4, 28, 6, (90, 200, 240), OUT)
    for x in range(36, 60, 5):
        c.px(x, GROUND - 2, WHITE)


def palm(c, x):
    c.vline(x, GROUND - 26, GROUND, BROWN_D); c.vline(x + 1, GROUND - 26, GROUND, BROWN)
    for dx in (-6, -3, 3, 6):
        c.hline(min(x, x + dx), max(x, x + dx), GROUND - 27 - (abs(dx) // 3), GREEN)
    c.hline(x - 5, x + 6, GROUND - 26, GREEN_D)


def yacht(c):
    c.a[GROUND - 8:, :] = (*(70, 150, 220), 255)
    c.hline(0, S - 1, GROUND - 8, OUT)
    c.rect(2, GROUND - 14, 60, 7, WHITE, OUT)
    c.rect(20, GROUND - 22, 30, 8, WHITE, OUT)
    c.rect(24, GROUND - 20, 22, 3, SKY, None)
    c.vline(46, GROUND - 32, GROUND - 22, OUT)
    c.rect(47, GROUND - 31, 6, 4, RED, OUT)


def jet(c, x=36, y=10):
    c.rect(x, y + 3, 24, 5, WHITE, OUT)
    c.rect(x + 20, y - 4, 3, 8, WHITE, OUT)
    c.rect(x + 6, y + 6, 10, 3, GREY, OUT)
    for i in range(4):
        c.px(x - 1 - i * 2, y + 5, GREY)


def sun(c, x=52, y=8, color=GOLD):
    c.rect(x, y, 6, 6, color, None)
    c.px(x - 1, y + 2, color); c.px(x + 6, y + 3, color); c.px(x + 2, y - 1, color); c.px(x + 3, y + 6, color)


def moon(c, x=50, y=8):
    c.rect(x, y, 5, 5, CREAM, None); c.rect(x + 2, y - 1, 5, 5, NIGHT, None)


def stars(c):
    for x, y in ((6, 6), (20, 3), (30, 10), (44, 5), (58, 14), (12, 16)):
        c.px(x, y, CREAM)


def grass(c):
    for x in range(2, S, 7):
        c.px(x, GROUND, GREEN_D); c.px(x + 1, GROUND - 1, GREEN_D)


def coins(c):
    for x, y in ((4, GROUND - 3), (10, GROUND - 2), (44, GROUND - 3), (52, GROUND - 2), (58, GROUND - 4)):
        c.rect(x, y, 3, 3, GOLD, OUT)


def gravestone(c):
    c.rect(20, GROUND - 24, 24, 25, GREY, OUT)
    c.hline(22, 41, GROUND - 25, OUT)
    c.text(22, GROUND - 20, "RIP", OUT)


# ------------------------------------------------------------ les 20 niveaux
def level(n, body, eyes, tip, ticker):
    c = Canvas(CREAM)
    name = LEVELS[n - 1][0]
    LEVELS[n - 1][1](c, body, eyes, tip, ticker)
    return c, name


def l1(c, b, e, t, k):   # carton sous la pluie
    sky_ground(c, (95, 105, 135), (70, 75, 95)); city_far(c, (75, 82, 110)); rain(c)
    cardboard(c); creature(c, b, "sleepy", t); beanie(c); collar(c, k)

def l2(c, b, e, t, k):   # banc de parc, nuit
    sky_ground(c, NIGHT, (50, 70, 50)); stars(c); moon(c); bench(c)
    creature(c, b, e, t); beanie(c, (120, 80, 60)); collar(c, k)

def l3(c, b, e, t, k):   # arrêt de bus, gobelet
    sky_ground(c, (170, 180, 195), (120, 120, 130)); city_far(c); bus_stop(c)
    creature(c, b, e, t); hoodie(c, (90, 90, 110)); collar(c, k); coffee(c)

def l4(c, b, e, t, k):   # squat, matelas
    wall_room(c, (120, 110, 105), (95, 85, 80)); poster(c)
    creature(c, b, e, t); hoodie(c, (90, 90, 110)); collar(c, k); mattress(c)

def l5(c, b, e, t, k):   # chambre de bonne
    wall_room(c, (200, 190, 170), (150, 120, 90)); window(c, 40, 8, 16, 14, NIGHT)
    creature(c, b, e, t); hoodie(c, (70, 110, 90)); collar(c, k)

def l6(c, b, e, t, k):   # fast-food
    wall_room(c, (250, 230, 150), (200, 60, 60)); c.rect(4, 6, 28, 12, RED, OUT); c.text(7, 9, "BURGER", WHITE)
    creature(c, b, e, t); uniform(c); cap(c); collar(c, k); burger(c)

def l7(c, b, e, t, k):   # livreur à vélo
    sky_ground(c, SKY, (120, 120, 130)); city_far(c); sun(c)
    creature(c, b, e, t); hoodie(c, (220, 120, 40)); collar(c, k); bike(c)

def l8(c, b, e, t, k):   # studio, PC portable
    wall_room(c, (225, 225, 235), (170, 140, 110)); window(c, 42, 6, 18, 14); poster(c, 4, 6)
    creature(c, b, e, t); outfit_fill(c, (90, 90, 110)); collar(c, k); laptop(c)

def l9(c, b, e, t, k):   # appart propre
    wall_room(c, (235, 240, 245), (200, 180, 150)); window(c, 40, 6, 20, 16)
    c.rect(4, GROUND - 20, 12, 21, GREEN, OUT)
    creature(c, b, e, t); outfit_fill(c, WHITE); collar(c, k)

def l10(c, b, e, t, k):  # open space
    wall_room(c, (230, 235, 240), (180, 185, 195)); desk(c)
    creature(c, b, e, t); outfit_fill(c, (100, 150, 220)); collar(c, k); phone(c)

def l11(c, b, e, t, k):  # scooter
    sky_ground(c, SKY, (120, 120, 130)); city_far(c, (150, 160, 190)); sun(c)
    creature(c, b, e, t); outfit_fill(c, (100, 150, 220)); collar(c, k); scooter(c)

def l12(c, b, e, t, k):  # premier costume
    wall_room(c, (215, 220, 230), (150, 150, 160)); city_far(c, (170, 175, 195), GROUND - 6)
    creature(c, b, e, t); suit(c, (70, 80, 110)); collar(c, k)

def l13(c, b, e, t, k):  # loft, montre
    wall_room(c, (240, 235, 225), (140, 110, 90)); window(c, 36, 4, 24, 20, NIGHT); stars(c)
    creature(c, b, e, t); suit(c, (70, 80, 110)); collar(c, k); watch(c)

def l14(c, b, e, t, k):  # première voiture
    sky_ground(c, SKY, (120, 120, 130)); city_far(c, (150, 160, 190)); sun(c)
    creature(c, b, e, t); suit(c); collar(c, k); car(c, (240, 240, 240)); watch(c)

def l15(c, b, e, t, k):  # terrasse, cocktail
    sky_ground(c, (255, 190, 120), (200, 170, 130)); sun(c, 30, 16, (255, 120, 80)); city_far(c, (200, 140, 120))
    creature(c, b, e, t); outfit_fill(c, (250, 250, 250)); sunglasses(c); collar(c, k); cocktail(c)

def l16(c, b, e, t, k):  # golf
    sky_ground(c, SKY, GREEN); sun(c); grass(c); c.vline(50, GROUND - 24, GROUND, OUT); c.rect(51, GROUND - 24, 6, 4, RED, OUT)
    creature(c, b, e, t); outfit_fill(c, PINKC); cap(c, WHITE); collar(c, k); watch(c)

def l17(c, b, e, t, k):  # supercar rouge
    sky_ground(c, NIGHT, (60, 60, 75)); stars(c); city_far(c, (45, 50, 85))
    creature(c, b, e, t); suit(c); sunglasses(c); collar(c, k); supercar(c); watch(c)

def l18(c, b, e, t, k):  # villa piscine
    sky_ground(c, SKY, (240, 225, 190)); sun(c); house(c, 4, GROUND - 30, 26, 31, WHITE, (220, 100, 80)); palm(c, 40); pool(c)
    creature(c, b, e, t); outfit_fill(c, (250, 250, 250)); sunglasses(c); collar(c, k); cocktail(c)

def l19(c, b, e, t, k):  # yacht
    sky_ground(c, SKY, (70, 150, 220)); sun(c); yacht(c)
    creature(c, b, e, t); suit(c, WHITE); sunglasses(c); collar(c, k); cigar(c); watch(c)

def l20(c, b, e, t, k):  # manoir, jet, couronne
    sky_ground(c, (255, 225, 150), (200, 170, 100)); jet(c); house(c, 2, GROUND - 36, 60, 37, (250, 245, 235), GOLD_D, False)
    c.rect(26, GROUND - 14, 12, 15, BROWN, OUT)
    creature(c, b, e, t); suit(c); crown(c); sunglasses(c); collar(c, k); cigar(c); money_bag(c); coins(c)

def ldead(c, b, e, t, k):
    sky_ground(c, NIGHT, (60, 70, 60)); stars(c); moon(c); gravestone(c)
    creature(c, (140, 140, 150), "dizzy", t); collar(c, k)


LEVELS = [
    ("1 Carton", l1), ("2 Banc", l2), ("3 Arret de bus", l3), ("4 Squat", l4),
    ("5 Chambre", l5), ("6 Fast-food", l6), ("7 Livreur", l7), ("8 Studio", l8),
    ("9 Appart", l9), ("10 Open space", l10), ("11 Scooter", l11), ("12 Costume", l12),
    ("13 Loft", l13), ("14 Voiture", l14), ("15 Terrasse", l15), ("16 Golf", l16),
    ("17 Supercar", l17), ("18 Villa", l18), ("19 Yacht", l19), ("20 Whale", l20),
]


def sheet(imgs, cols, scale=2, pad=6, bg=(30, 30, 30)):
    cw = S * 2 * scale + pad
    rows = (len(imgs) + cols - 1) // cols
    out = Image.new("RGB", (cols * cw + pad, rows * cw + pad), bg)
    for i, im in enumerate(imgs):
        out.paste(im.resize((S * 2 * scale, S * 2 * scale), Image.NEAREST), (pad + (i % cols) * cw, pad + (i // cols) * cw))
    return out


if __name__ == "__main__":
    body, eyes, tip, ticker = PALETTES["mint"], "red", "ball", "TSLA"
    imgs = []
    for n in range(1, 21):
        c, name = level(n, body, eyes, tip, ticker)
        im = c.image()
        im.save(f"lvl_{n:02d}.png")
        imgs.append(im)
    c = Canvas(CREAM); ldead(c, body, eyes, tip, ticker); c.image().save("lvl_dead.png")
    sheet(imgs, 5).save("hoodochi_levels.png")
    print("ok")
