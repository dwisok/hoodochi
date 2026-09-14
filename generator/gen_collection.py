"""Hoodochi — génération des 1 000 NFT de base (traits de naissance, sans collier)."""
import json, random, hashlib, os, shutil
from collections import Counter
from PIL import Image
import items2 as it
from items2 import build, neutral_bg
from creature import PALETTES, EYES, TIPS, BACKGROUNDS
import rare_bg

N = 1000
SEED = 20260913
OUT_DIR = "../collection"
IMG_SIZE = 768
IMAGE_BASE = "ipfs://CID_A_REMPLACER"   # à remplacer après l'upload du dossier images

# ---------------------------------------------------------------- poids de rareté
BODY_W = {k: (15 if k in ("gold", "void") else 70) for k in PALETTES}          # or/noir ≈ 1.5 % chacun
EYES_W = {"red": 25, "black": 25, "blue": 12, "green": 12, "happy": 10, "sleepy": 7, "gold": 6, "dizzy": 3}
TIPS_W = {"ball": 30, "redball": 15, "blueball": 15, "coin": 12, "dark": 10, "heart": 10, "bulb": 8}
BG_COMMON = list(BACKGROUNDS)                                                   # 85 %
BG_RARE = ["sunset", "starry", "pump", "gold rain", "wall street", "matrix"]      # 12 %
BG_ULTRA = ["sunburst", "synthwave", "holo", "vault"]                           # 3 %
BG_W = {**{k: 850 / len(BG_COMMON) for k in BG_COMMON},
        **{k: 120 / len(BG_RARE) for k in BG_RARE},
        **{k: 30 / len(BG_ULTRA) for k in BG_ULTRA}}
RARE_FN = dict(rare_bg.RARE)


def pick(w):
    ks, ws = zip(*w.items())
    return random.choices(ks, ws)[0]


def bg_tier(name):
    return "ultra" if name in BG_ULTRA else "rare" if name in BG_RARE else "common"


def render_token(t):
    if t["background"] in BACKGROUNDS:
        col = BACKGROUNDS[t["background"]]
        bg = lambda c, col=col: neutral_bg(c, col)
    else:
        bg = RARE_FN[t["background"]]
    im = build(PALETTES[t["body"]], t["eyes"], t["antenna"], None, {}, bg=bg)
    return im.resize((IMG_SIZE, IMG_SIZE), Image.NEAREST).convert("RGB")


def main():
    random.seed(SEED)
    if os.path.exists(OUT_DIR):
        shutil.rmtree(OUT_DIR)
    os.makedirs(f"{OUT_DIR}/images"); os.makedirs(f"{OUT_DIR}/metadata")

    seen, tokens = set(), []
    while len(tokens) < N:
        t = {"body": pick(BODY_W), "eyes": pick(EYES_W), "antenna": pick(TIPS_W), "background": pick(BG_W)}
        key = tuple(t.values())
        if key in seen:
            continue
        seen.add(key); tokens.append(t)

    hashes = []
    for i, t in enumerate(tokens, 1):
        im = render_token(t)
        path = f"{OUT_DIR}/images/{i}.png"
        im.save(path, optimize=True)
        h = hashlib.sha256(open(path, "rb").read()).hexdigest()
        hashes.append(h)
        meta = {
            "name": f"Hoodochi #{i}",
            "description": "Stake it, earn the stock on the collar. Dump = dead. No respawns.",
            "image": f"{IMAGE_BASE}/{i}.png",
            "attributes": [
                {"trait_type": "Body", "value": t["body"]},
                {"trait_type": "Eyes", "value": t["eyes"]},
                {"trait_type": "Antenna", "value": t["antenna"]},
                {"trait_type": "Background", "value": t["background"]},
                {"trait_type": "Background Tier", "value": bg_tier(t["background"])},
                {"trait_type": "Collar", "value": "none"},
                {"trait_type": "Level", "value": 0, "display_type": "number"},
            ],
        }
        json.dump(meta, open(f"{OUT_DIR}/metadata/{i}", "w"), indent=2)
        if i % 100 == 0:
            print(i)

    # provenance + stats
    prov = hashlib.sha256("".join(hashes).encode()).hexdigest()
    stats = {k: dict(Counter(t[k] for t in tokens)) for k in ("body", "eyes", "antenna", "background")}
    stats["background_tier"] = dict(Counter(bg_tier(t["background"]) for t in tokens))
    json.dump({"count": N, "seed": SEED, "provenance": prov, "stats": stats, "tokens": tokens},
              open(f"{OUT_DIR}/collection.json", "w"), indent=1)

    # planche d'aperçu : 40 premiers
    cw = 96
    sheet = Image.new("RGB", (10 * (cw + 4) + 4, 4 * (cw + 4) + 4), (30, 30, 30))
    for i in range(40):
        im = Image.open(f"{OUT_DIR}/images/{i + 1}.png").resize((cw, cw), Image.NEAREST)
        sheet.paste(im, (4 + (i % 10) * (cw + 4), 4 + (i // 10) * (cw + 4)))
    sheet.save("../hoodochi_apercu_40.png")
    print("provenance", prov)
    print(json.dumps(stats, indent=1))


if __name__ == "__main__":
    main()
