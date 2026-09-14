# Hoodochi — générateur

Prérequis : `pip install pillow numpy`

- `creature.py`   : créature de base + traits de naissance (corps, yeux, antennes, fonds unis)
- `items2.py`     : les 20 items (5 slots × 4 paliers) + `build(body, eyes, tip, ticker, equip, bg)` = fonction de rendu
- `rare_bg.py`    : les 10 fonds rares
- `gen_collection.py` : génère `collection/` (1 000 images + metadata + collection.json avec provenance)

Rendu à la demande (serveur) : appeler `items2.build(...)` avec l'état du token, puis `.resize((768,768), NEAREST)`.

Après upload des images sur IPFS : remplacer `IMAGE_BASE` dans gen_collection.py et relancer,
ou faire un sed sur `collection/metadata/*`.

## Export vers le site

`python3 export_site.py ../src/sprites-v2.ts` (depuis `generator/`, avec `../collection/collection.json` présent)
régénère les calques en data URIs pour le site (`src/sprites-v2.ts`). À relancer après tout changement
de créature, d'item, de fond ou de police. Le site empile ces calques dans le même ordre que `items2.build`,
et dessine le collier lui-même avec la même géométrie que `scenes.draw_collar_hires` (vérifié pixel-identique).
