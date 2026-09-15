# Hoodochi — instructions projet

Lire `BRIEF.md` en entier avant toute action : c'est la source de vérité (concept, règles décidées, questions OUVERTES, identité visuelle, contraintes UI). Brief v2 (système hebdo, objets NFT) depuis le 13/09/2026 ; `BRIEF-NFT.md` = détail de la collection ; `BRIEF-v1.md` = ancien système, mémoire seulement.

Règles rapides :
- Français par défaut, réponses courtes, pas de récap.
- Ne jamais trancher seul une question marquée OUVERTE dans le brief : 2-3 options max + recommandation.
- Jamais de chiffre financier (%, courbe, vert/rouge) dans l'UI par défaut.
- Un seul modèle de corps (plus de gabarit). Pixel art plat 32×44 sur canvas 48×48, contour 1 px sombre, zéro shading, zéro anti-aliasing. Palette : bleu nuit #1a1f3a, crème #f6efe4.
- Pas de logos de sociétés ; les lettres d'un ticker passent.
- Gain en action : coder abstrait (« yield » générique), rien de branché sur un vrai actif avant le point juridique.
- Les contrats v2 sont déployés sur mainnet (14/09) : tout changement de contrat = redéploiement + nouvelles adresses dans `.env.local`.
- Tout doit se lancer avec npm (`npm run dev`, `npm run build`).

Stack : Vite + React + TypeScript. Le personnage, les 20 objets, le collier et les fonds sont dessinés par le générateur Python (`generator/`, source de vérité visuelle) et exportés en calques PNG (data URIs) dans `src/sprites-v2.ts` via `generator/export_site.py` — ne jamais redessiner à la main côté TS. Rendu : `src/components/Hoodochi.tsx` (empile les calques, dessine le collier avec la même géométrie que `scenes.draw_collar_hires`). Noms anglais des objets : `src/items.ts`. Tokens de la collection : `TOKENS` dans `sprites-v2.ts` (index 0 = #1).

Règles hebdo : `src/week.ts` (rendements hebdo, z-score, paliers, mort, replay). Les seuils `THRESHOLDS` sont PROVISOIRES (question ouverte §9.3), à calibrer avant le lancement.

Données réelles : `src/market.ts` (Polygon.io, clé `VITE_POLYGON_KEY` dans `.env.local`, cache localStorage 1 h, mode simulé sans clé), `src/components/Live.tsx` (section « Put a collar on one », rejoue 12 semaines).

Sections de la landing (`src/App.tsx`) : barre de progression, `HeroScene` (hero plein écran au scroll : mint + 5 évolutions, une couleur par palier, loot qui pop, titre « Stake it. Earn the stock. »), double bandeau incliné, règles en 3 cartes illustrées + Game Boy (`Device`), `ItemRail` (les 20 objets en défilement horizontal piloté par le scroll vertical, sticky ; simple overflow en mobile), `OnChain`, `Parade` (ciel pixel) en fin de page. Raccords entre sections en damier (`Seam`). Palette d'accent = fonds de la collection (sky, mint, peach, lavender, sand, gold). Composants gardés mais non branchés : `HeroPet`, `WeekScroller`, `Live`, `Wardrobe`, `Traits`, `Graveyard`.

Pages (routeur maison `src/router.tsx`, réécriture `public/.htaccess` côté Hostinger) : `/pets` (collection live), `/pet/:id` (fiche live : objets portés, collier, statut, import wallet), `/graveyard`. Couche de lecture partagée `src/pets.ts` (multicall `ownerOf`/`petOf`, jamais `eth_getLogs` sur une grande plage : le RPC public expire). Métadonnées NFT statiques : `public/token/<id>` (JSON, traits de naissance) + `public/token/img/<id>.png` ; `BASE_URI` on-chain = `https://www.hoodochi.io/token/`.

Keeper du vendredi : `keeper/settle.mjs` (z-score hebdo, Yahoo/Stooq ou Polygon, idempotent via les événements `Settled`), automatisé par `.github/workflows/friday.yml` (samedi 01:30 UTC, secret `KEEPER_PRIVATE_KEY` déjà posé sur le dépôt). Hébergement : Hostinger reconstruit `main` à chaque push ; config publique dans `.env.production`.

On-chain v2 : `contracts/` (Foundry, OpenZeppelin v5) — `Collar` (ERC-721 ticker, minté en escrow par Hoodochi) et `Hoodochi` (ERC-721, mint public 1 000 à prix fixe 0,001 ETH (décidé le 14/09, modifiable via `setMintPrice`), `setCollar` → `stake` (soft escrow : transfert bloqué) → `settleWeek` par le keeper le vendredi : item / rien / mort décidés on-chain par `tierZ10`/`deathZ10` (provisoires), yield en unités du ticker → `claim` vers un ledger par owner/ticker ; `tokenURI = baseURI + id`). **v2 déployée sur mainnet 4663 le 14/09/2026** : Collar `0xCCc7C1EA864E99CBe43788c203Af9c1BDfaba7c0`, Hoodochi `0x23409CaD886380f066329eF237a37d55950AF9Ad`, owner/keeper = wallet déployeur `0xC22A…5E0f` (clé dans `contracts/.env`, jamais l'afficher). Adresses dans `.env.local`. Les adresses v1 du 13/09 sont obsolètes. Foundry est installé dans `~/.foundry/bin` (ajouter au PATH) ; voir `contracts/README.md`.

Game Boy = l'app (`src/components/Device.tsx`) : écrans au D-pad/A/B (clic ou clavier), `src/wallet.ts` (`useBackend`) bascule entre viem + window.ethereum (adresses dans `.env.local`) et un mode démo en mémoire ; ABI dans `src/abi.ts`, chaînes dans `src/chain.ts`. Le mini-jeu de saut de bougies est décoratif. `npm install` requis pour `viem` (je ne peux pas l'installer d'ici).
