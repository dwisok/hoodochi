# Brief — collection NFT Hoodochi

Document de passation. Tout ce qui a été décidé sur la collection, pour adapter le site (hoodochi.io, Vite \+ React) sans réinventer quoi que ce soit. Les décisions ci\-dessous sont fermes sauf mention « ouvert ».

## 1\. Concept en une phrase

Un Hoodochi est un tamagotchi pixel art adossé à une action cotée. Chaque semaine le joueur choisit une action (le collier). Si l'action monte, le Hoodochi gagne un accessoire permanent. Si elle chute trop, il meurt et tout brûle. Pas de résurrection.

## 2\. Ce qui existe déjà

- Contrats déployés sur Robinhood Chain mainnet (chain ID 4663) : Collar `0xD862ac5d46F867245db7Adc91726c99a74f267A6`, Hoodochi (ERC\-721) `0x1d9Ecfdf4FfbFc9e4657df5e301ee7b218438fBC`, Staking `0x6D48C39b2De0499Eaf7BE760f163C68a93b0a0Bd`. Wallet owner/keeper `0x2cDCcD541F353dA16c45CEaf1780720753c0d016`.
- Données de marché : Polygon.io (gratuit, fin de journée).
- Compte X : @hoodochidotio. Identité visuelle : pixel art plat, contour sombre 1 px, fond crème `#f6efe4`, bleu nuit `#1a1f3a`.
- Une collection de 1 000 images de base générée (dossier `collection/` : `images/1..1000.png` en 768×768, `metadata/1..1000` au format OpenSea, `collection.json` avec stats et hash de provenance) et le générateur Python (dossier `generator/`).

## 3\. Le NFT de base (au mint)

1 000 tokens. Chacun a des traits de naissance tirés au hasard, fixes pour toujours :

| Trait | Valeurs | Rareté |
| --- | --- | --- |
| Body (couleur du corps) | mint, pink, sky, lemon, peach, snow, lime, lilac, ocean, coral, sand, sage, slate, berry, **gold**, **void** | gold et void ≈ 1,5 % chacun |
| Eyes | red, black, blue, green, gold, happy, sleepy, dizzy | red et black les plus courants, dizzy le plus rare |
| Antenna | ball, redball, blueball, coin, dark, heart, bulb | ball le plus courant |
| Background | 10 unis (peach, cream, sky, mint, lavender, rose, sand, night, olive, grey) \+ 6 rares (sunset, starry, pump, gold rain, wall street, matrix) \+ 4 ultra (sunburst, synthwave, holo, vault) | unis ≈ 85 %, rares ≈ 12 %, ultra ≈ 3 % |

Au mint le Hoodochi n'a **ni collier ni accessoire**. Le cadrage est resserré sur le personnage, fond uni ou rare derrière lui, pas de décor.

Métadonnées de départ :

```json
{
  "name": "Hoodochi #42",
  "description": "Stake it, earn the stock on the collar. Dump = dead. No respawns.",
  "image": "ipfs://<CID>/42.png",
  "attributes": [
    {"trait_type": "Body", "value": "mint"},
    {"trait_type": "Eyes", "value": "red"},
    {"trait_type": "Antenna", "value": "ball"},
    {"trait_type": "Background", "value": "peach"},
    {"trait_type": "Background Tier", "value": "common"},
    {"trait_type": "Collar", "value": "none"},
    {"trait_type": "Level", "value": 0, "display_type": "number"}
  ]
}
```

## 4\. Le collier

Un seul modèle, identique sur le site et sur X : chaîne courte en or, grosse plaque dorée à coins arrondis, le ticker en lettres sombres au centre (police 3×5 en pixels fins, plus fins que le reste du personnage pour rester lisible). Le collier apparaît dès que le joueur choisit une action. Sans collier, le Hoodochi dort.

## 5\. La boucle hebdomadaire

1. **Lundi** : le joueur choisit une action (ticker). Le collier s'affiche avec ce ticker. Il peut aussi ne rien choisir : le Hoodochi dort, aucun risque, aucun gain.
2. **Vendredi clôture** : la perf de la semaine est mesurée en **écarts\-types** (rendement hebdo divisé par la volatilité historique de l'action), pour qu'une action calme et une action nerveuse soient jugées pareil.
3. Résultat :
   - Bonne semaine → **un seul** accessoire (voir §6). Le slot est tiré au hasard parmi les slots éligibles.
   - Mauvaise semaine non mortelle → rien ne se passe.
   - Chute au\-delà du seuil de mort (normalisé par la volatilité, seuils assez bas car la bourse bouge moins que la crypto) → le Hoodochi **meurt**. Tous ses accessoires brûlent avec lui. Il part au cimetière (image de tombe, historique conservé). Le joueur doit en racheter un.
4. Les accessoires sont **permanents** : on ne redescend jamais, seule la mort remet à zéro.

Paliers selon la perf :

- petite hausse → palier 1 dans un slot vide ;
- grosse hausse → \+1 palier sur un slot déjà occupé, ou palier 2\-3 direct ;
- **palier 4 uniquement sur une semaine exceptionnelle (≥ \+2 σ)**.

Une créature complète (5 slots au palier 4) demande environ 10 bonnes semaines sans mourir : c'est ça la rareté, pas le tirage de départ.

## 6\. Les accessoires : 5 slots × 4 paliers \= 20 items

| Slot | Palier 1 | Palier 2 | Palier 3 | Palier 4 |
| --- | --- | --- | --- | --- |
| Tête | casquette rouge | bob | béret | couronne à joyaux |
| Yeux | lunettes de soleil | monocle | lunettes gold | visière laser |
| Cou (sur le collier) | cravate | foulard | chaîne d'or à maillons | chaîne \+ pendentif diamant |
| Poignet (bras gauche) | bracelet tissu | montre | grosse montre gold | montre à diamants |
| Main (bras droit) | gobelet de café | téléphone | cigare | liasse de billets |

Les slots Véhicule et Logement ont été **abandonnés** : on se concentre sur le personnage et ce qu'il porte.

Métadonnées vivantes : un attribut par slot (`Head`, `Eyewear`, `Neck`, `Wrist`, `Hand`, valeur \= nom de l'item ou `none`), plus `Collar` (ticker en cours ou `none`), `Level` (nombre total de paliers acquis, 0 à 20) et `Status` (`alive`, `sleeping`, `dead`).

## 7\. Rendu dynamique (important pour le site)

Le NFT est **dynamique**. Le token ne change pas, mais son image et ses métadonnées reflètent son état courant. On ne pré\-génère rien au\-delà des 1 000 images de base : l'image est assemblée par calques à la demande.

Ordre des calques : fond → corps (couleur) → yeux → antennes → item tête → item yeux → item poignet → item main → collier (plaque \+ ticker) → item cou.

Fonction de rendu (Python, dans `generator/items2.py`) :

```python
from items2 import build, neutral_bg
from creature import PALETTES, BACKGROUNDS
import rare_bg

im = build(
    PALETTES["mint"],          # body
    "red",                     # eyes
    "ball",                    # antenna
    "TSLA",                    # ticker ou None
    {"tete": 2, "yeux": 1, "cou": 3, "poignet": 0, "main": 4},   # paliers 0-4
    bg=lambda c: neutral_bg(c, BACKGROUNDS["peach"])            # ou dict(rare_bg.RARE)["pump"]
)
im.resize((768, 768), Image.NEAREST).save("42.png")
```

Architecture cible : `tokenURI(id)` du contrat pointe vers `https://api.hoodochi.io/token/{id}`. Le serveur lit l'état du token (on\-chain ou base), appelle `build(...)`, renvoie le JSON de métadonnées et sert l'image sur `/token/{id}.png`. Cache invalidé à chaque changement d'état (lundi : collier ; vendredi : item ou mort).

Ouvert : les accessoires comme NFT séparés (ERC\-1155 attachés au Hoodochi) ou simple état dans le contrat principal. Pour le site, prévoir l'affichage à partir de l'état, quelle que soit l'implémentation.

## 8\. Ce que le site doit faire

1. **Mint** : appeler le contrat Hoodochi, afficher le Hoodochi obtenu (image de base \+ ses 4 traits), 1 000 max.
2. **Mon Hoodochi** : afficher l'image rendue à la demande, l'état des 5 slots (item \+ palier), le collier en cours, le statut.
3. **Choix du lundi** : sélection d'une action parmi une liste (tickers supportés par Polygon.io), écriture on\-chain via le contrat Collar. Bouton « ne pas jouer cette semaine » (dort).
4. **Résultat du vendredi** : afficher la perf en σ, l'item gagné (ou rien, ou la mort), historique des semaines.
5. **Cimetière** : galerie des Hoodochi morts avec ticker, durée de vie, cause.
6. **Galerie / explorer** : les 1 000 Hoodochi filtrables par traits et par niveau.

Règle UI héritée du brief : jamais de chiffre, pourcentage, courbe ni vert/rouge par défaut. La perf se lit sur le personnage (ce qu'il porte, s'il dort, s'il est mort).

## 9\. Fichiers livrés

- `hoodochi_collection_1000.zip` → `collection/` (images, metadata, collection.json) et `generator/` (`creature.py`, `scenes.py`, `polished.py`, `items2.py`, `rare_bg.py`, `gen_collection.py`, README).
- Avant l'upload IPFS : mettre les images sur Pinata, récupérer le CID, remplacer `CID_A_REMPLACER` dans les métadonnées, uploader le dossier metadata, appeler `setBaseURI` sur le contrat (à vérifier que la fonction existe, sinon ajouter et redéployer).

## 10\. Point juridique

Le « earn the stock » n'est pas validé juridiquement. Sur le site, rester sur « earn items / drip » et un yield abstrait tant qu'un avocat n'a pas tranché.
