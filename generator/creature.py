from PIL import Image
import numpy as np

# Hoodochi — créature de base (32 x 44), calquée sur la référence du site,
# sans couronne ni chaîne (accessoires de stades supérieurs).
GRID = """\
..###......................###..
.#YYY#....................#YYY#.
.#YYY#....................#YYY#.
..###......................###..
....#......................#....
.....#....................#.....
......#..................#......
.......#................#.......
.......##################.......
.....##mmmmmmmmmmmmmmmmmm##.....
....#mmmmmmmmmmmmmmmmmmmmmm#....
...#mmmmmmmmmmmmmmmmmmmmmmmm#...
..#mmmmmmmmmmmmmmmmmmmmmmmmmm#..
..#mmmmmmmmmmmmmmmmmmmmmmmmmm#..
.#mmmmmmmmmmmmmmmmmmmmmmmmmmmm#.
.#mmmmmmmmmmmmmmmmmmmmmmmmmmmm#.
.#mmmm####mmmmmmmmmmmm####mmmm#.
#mmm##RRRR##mmmmmmmm##RRRR##mmm#
#mmm#RwwRRR#mmmmmmmm#RwwRRR#mmm#
#mmm#RwwRRR#mmmmmmmm#RwwRRR#mmm#
#mmm#RRRRRR#mmmmmmmm#RRRRRR#mmm#
#mmm##RRRR##mmmmmmmm##RRRR##mmm#
#mmmmm####mmm######mmm####mmmmm#
.#mmmmppppmmm#YYYY#mmmppppmmmm#.
.#mmmmmmmmmmmm#YY#mmmmmmmmmmmm#.
..#mmmmmmmmmmmm##mmmmmmmmmmmm#..
..#mmmmmmmmmmmmmmmmmmmmmmmmmm#..
...#mmmmmmmmmmmmmmmmmmmmmmmm#...
....##mmmmmmmmmmmmmmmmmmmm##....
......##mmmmmmmmmmmmmmmm##......
........###mmmmmmmmmm###........
......###..##########..###......
.....#mmm##mmmmmmmmmm##mmm#.....
....#mmmm#mmmmmmmmmmmm#mmmm#....
....#mmm#mmmmmmmmmmmmmm#mmm#....
....#mmm#mmmmmmmmmmmmmm#mmm#....
.....###mmmmmmmmmmmmmmmm###.....
.......#mmmmmmmmmmmmmmmm#.......
........#mmmmmmmmmmmmmm#........
.........#####mmmm#####.........
.........#YYY######YYY#.........
.........#YYY#....#YYY#.........
..........###......###..........
"""

COLORS = {
    ".": None,
    "#": (30, 30, 30),
    "m": "BODY",
    "R": (225, 20, 20),
    "w": (255, 255, 255),
    "Y": (255, 215, 60),
    "p": (240, 150, 170),
}

ROWS = GRID.strip("\n").split("\n")
H, W = len(ROWS), len(ROWS[0])
assert all(len(r) == W for r in ROWS), [len(r) for r in ROWS]

PALETTES = {
    "mint": (193, 244, 211), "pink": (255, 178, 204), "sky": (173, 220, 255),
    "lemon": (255, 232, 122), "peach": (255, 190, 130), "snow": (250, 248, 245),
    "lime": (196, 232, 140), "lilac": (214, 190, 255), "ocean": (140, 190, 255),
    "coral": (255, 150, 140), "sand": (240, 220, 170), "sage": (170, 205, 180),
    "slate": (160, 175, 200), "berry": (220, 150, 200),
    "gold": (255, 200, 60),   # rare
    "void": (70, 62, 88),     # rare
}


# --- yeux : bloc 8x6 (gauche, cols 4-11 / rows 17-22), miroir pour la droite
EYES = {
    "red":    ["..####..", "##RRRR##", "#RwwRRR#", "#RwwRRR#", "#RRRRRR#", "##RRRR##"],
    "black":  ["..####..", "########", "##ww####", "##ww####", "########", "########"],
    "blue":   ["..####..", "##BBBB##", "#BwwBBB#", "#BwwBBB#", "#BBBBBB#", "##BBBB##"],
    "green":  ["..####..", "##GGGG##", "#GwwGGG#", "#GwwGGG#", "#GGGGGG#", "##GGGG##"],
    "gold":   ["..####..", "##YYYY##", "#YwwYYY#", "#YwwYYY#", "#YYYYYY#", "##YYYY##"],
    "happy":  ["........", "........", "..####..", ".##..##.", "##....##", "........"],
    "sleepy": ["........", "........", "........", "########", ".######.", "........"],
    "dizzy":  ["........", "#.....#.", ".#...#..", "..#.#...", "...#....", "..#.#...".replace("..#.#...", "..#.#...")],
}
EYES["dizzy"] = ["#.....#.", ".#...#..", "..#.#...", "...#....", "..#.#...", ".#...#.."]

# --- bouts d'antennes : bloc 5x5 (gauche, cols 1-5 / rows 0-4)
TIPS = {
    "ball":     [".###.", "#YYY#", "#YYY#", "#YYY#", ".###."],
    "redball":  [".###.", "#RRR#", "#RRR#", "#RRR#", ".###."],
    "blueball": [".###.", "#BBB#", "#BBB#", "#BBB#", ".###."],
    "coin":     [".###.", "#YYY#", "#Y#Y#", "#YYY#", ".###."],
    "dark":     [".###.", "#####", "##w##", "#####", ".###."],
    "heart":    [".#.#.", "#P#P#", "#PPP#", ".#P#.", "..#.."],
    "bulb":     [".###.", "#www#", "#wGw#", "#www#", ".###."],
}

COLORS.update({"B": (40, 110, 230), "G": (60, 180, 90), "P": (255, 90, 120)})

BACKGROUNDS = {
    "peach": (248, 166, 114), "cream": (246, 239, 228), "sky": (150, 205, 245),
    "mint": (160, 225, 190), "lavender": (200, 180, 240), "rose": (250, 180, 200),
    "sand": (235, 210, 150), "night": (26, 31, 58), "olive": (170, 190, 120),
    "grey": (200, 200, 205),
}


def compose(eyes="red", tip="ball"):
    rows = [list(r) for r in ROWS]
    # antennes (efface la zone puis pose le bout)
    tl, tr = TIPS[tip], [r[::-1] for r in TIPS[tip]]
    for dy in range(5):
        for dx in range(5):
            rows[dy][1 + dx] = tl[dy][dx]
            rows[dy][26 + dx] = tr[dy][dx]
    # connecteur si le bout finit en pointe centrale (col 3 / 28)
    if tl[4][4] == "." and tl[4][3] != ".":
        rows[4][4] = "#"; rows[4][27] = "#"
    # yeux
    el = EYES[eyes]; er = [r[::-1] for r in el]
    for dy in range(6):
        for dx in range(8):
            ch = el[dy][dx]
            rows[17 + dy][4 + dx] = "m" if ch == "." else ch
            ch = er[dy][dx]
            rows[17 + dy][20 + dx] = "m" if ch == "." else ch
    return ["".join(r) for r in rows]


def render(body, eyes="red", tip="ball"):
    img = np.zeros((H, W, 4), np.uint8)
    for y, row in enumerate(compose(eyes, tip)):
        for x, ch in enumerate(row):
            c = COLORS[ch]
            if c is None:
                continue
            if c == "BODY":
                c = body
            img[y, x] = (*c, 255)
    return Image.fromarray(img, "RGBA")


def on_bg(im, bg=(248, 166, 114), size=64, scale=8):
    canvas = Image.new("RGBA", (size, size), (*bg, 255))
    canvas.paste(im, ((size - W) // 2, (size - H) // 2 + 2), im)
    return canvas.resize((size * scale, size * scale), Image.NEAREST)


def sheet(cells, cols, pad=6, bg=(246, 239, 228)):
    cw, ch = cells[0].size
    rows = (len(cells) + cols - 1) // cols
    out = Image.new("RGB", (cols * (cw + pad) + pad, rows * (ch + pad) + pad), bg)
    for i, im in enumerate(cells):
        out.paste(im, (pad + (i % cols) * (cw + pad), pad + (i // cols) * (ch + pad)))
    return out


if __name__ == "__main__":
    base = render(PALETTES["mint"])
    base.save("hoodochi_base_1x.png")
    on_bg(base).save("hoodochi_base.png")
    sheet([on_bg(render(c), scale=4) for c in PALETTES.values()], 8).save("hoodochi_colors.png")
    import random
    random.seed(7)
    bgs = list(BACKGROUNDS.values()); bodies = list(PALETTES.values())
    cells = []
    for e in EYES:
        cells.append(on_bg(render(random.choice(bodies), eyes=e), bg=random.choice(bgs), scale=4))
    sheet(cells, 8).save("hoodochi_eyes.png")
    cells = []
    for t in TIPS:
        cells.append(on_bg(render(random.choice(bodies), tip=t), bg=random.choice(bgs), scale=4))
    sheet(cells, 7).save("hoodochi_antennas.png")
    cells = []
    for i in range(12):
        cells.append(on_bg(render(random.choice(bodies), eyes=random.choice(list(EYES)), tip=random.choice(list(TIPS))), bg=random.choice(bgs), scale=6))
    sheet(cells, 4).save("hoodochi_mix.png")
    print("ok", W, H)
