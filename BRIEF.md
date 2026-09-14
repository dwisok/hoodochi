# HOODOCHI — Brief projet (v2, 13–14 sept. 2026)

Tu travailles sur Hoodochi, un pet pixel art on-chain qui s'enrichit ou meurt selon une action cotée choisie chaque semaine. Ce document est la source de vérité. Lis-le en entier avant toute action. Quand une question est marquée OUVERTE, ne tranche pas seul : propose des options et demande. L'ancien brief (v1, système quotidien avec gabarit) est conservé dans `BRIEF-v1.md` pour mémoire ; il ne fait plus foi. Le détail de la collection NFT (traits, rareté, rendu dynamique, ce que le site doit faire) est dans `BRIEF-NFT.md`.

---

## 1. Le concept en une phrase

Tu achètes un Hoodochi basique. Chaque lundi tu lui mets un collier avec l'action de ton choix. Le vendredi, si l'action a monté, il gagne un objet (montre, couronne, voiture, maison…). Si elle a trop chuté, il meurt, avec tout ce qu'il portait. Semaine après semaine, tu construis un Hoodochi de plus en plus riche — ou tu recommences à zéro.

Ce qui rend l'idée forte : les objets rares ne s'achètent pas et ne se farment pas, c'est le marché qui les distribue. Un Hoodochi complet a survécu à une douzaine de bonnes semaines d'affilée sans mourir.

---

## 2. Objets de la collection

### 2.1 Le Hoodochi (NFT créature, 1 000 au mint)
- Un seul modèle de corps. Pas de gabarit, pas de variante morphologique.
- Traits de naissance, aléatoires au mint, fixes pour toujours : Body (16 couleurs, gold et void rares), Eyes (8), Antenna (7), Background (10 unis + 6 rares + 4 ultra). Collection générée : `collection/collection.json` (1 000 tokens, hash de provenance), images 768×768 dans le zip livré (à mettre sur IPFS).
- Au mint : aucun accessoire, aucun collier. Tout le monde part « fauché ».
- Prix volontairement très bas : mourir doit faire mal au cœur, pas au portefeuille.
- Mort permanente : un Hoodochi mort ne revit pas. Il va au cimetière (§5).

### 2.2 Le collier (NFT item séparé)
- Un collier = un ticker (lettres seulement, pas de logo). C'est le choix de la semaine.
- Visuel : chaîne courte, grosse plaque gold à coins arrondis, ticker gravé. Identique entre le site et le compte X.
- Interchangeable. Sans collier le Hoodochi dort : aucun risque, aucun gain.
- OUVERTE : sort du collier à la mort (brûlé avec la créature, ou libéré dans le wallet). Contrat actuel : `deathPolicy`, défaut Frozen.

### 2.3 Les objets (NFT items, grille fermée)
- Chaque objet est un NFT séparé possédé par le Hoodochi (ou un simple état dans le contrat principal — OUVERTE, voir `BRIEF-NFT.md` §7). L'image du Hoodochi est recomposée à partir des calques équipés.
- Grille fermée : 5 slots × 4 paliers = 20 objets. Véhicule et logement ABANDONNÉS : on se concentre sur le personnage et ce qu'il porte.

| Slot | Palier 1 | Palier 2 | Palier 3 | Palier 4 |
|---|---|---|---|---|
| Tête | casquette rouge | bob | béret | couronne à joyaux |
| Yeux | lunettes de soleil | monocle | lunettes gold | visière laser |
| Cou (sur le collier) | cravate | foulard | chaîne d'or | chaîne + pendentif diamant |
| Poignet (bras gauche) | bracelet tissu | montre | grosse montre gold | montre à diamants |
| Main (bras droit) | gobelet de café | téléphone | cigare | liasse de billets |

- Les objets sont permanents : seule la mort les enlève.
- À la mort, les objets sont brûlés avec la créature.
- Dessins canoniques : `generator/items2.py`. Le site les affiche via `src/sprites-v2.ts` (export pixel-identique).

### 2.4 Le gain en action
- Une bonne semaine rapporte aussi « un peu de l'action » choisie.
- ⚠️ NON VALIDÉ JURIDIQUEMENT. Distribuer une exposition à une action réelle = produit financier (licences, KYC, restrictions par pays). À traiter avec un avocat AVANT tout code de distribution. En attendant : le gain est codé comme un « yield » abstrait (unités génériques), rien de branché sur un vrai actif.

---

## 3. Règles de la semaine (décidées)

### 3.1 Rythme
- Lundi (ouverture) : le joueur pose un collier. Il peut aussi ne rien poser → le Hoodochi dort, semaine blanche.
- Vendredi (clôture) : le keeper lit la perf hebdo du ticker et applique le résultat. Un seul événement par semaine, le même moment pour tout le monde.
- Le collier ne se change pas en cours de semaine.

### 3.2 Résultat
- La perf est mesurée en écarts-types de la volatilité habituelle du titre, pas en pourcentage brut. Une semaine +2 % sur Coca et +15 % sur une meme stock peuvent valoir la même chose. Les seuils restent assez bas : la bourse bouge moins que la crypto.
- Bonne semaine : un seul objet, jamais plus. Le palier dépend de la perf (petite hausse → palier 1, grosse hausse → palier supérieur, palier 4 uniquement sur une semaine exceptionnelle, ≥ +2 σ). Le slot est tiré au hasard parmi les slots éligibles (vide, ou déjà occupé par un palier inférieur).
- Semaine plate ou mauvaise mais pas mortelle : rien ne se passe.
- Chute au-delà du seuil de mort (normalisé par la volatilité) : le Hoodochi meurt, objets brûlés.
- OUVERTE : valeur exacte des seuils (paliers 1-4 et seuil de mort) en σ. À calibrer sur l'historique avant le lancement.

### 3.3 Humeur (cosmétique)
- Les yeux reflètent le move du jour en écarts-types. Marché fermé = il dort. Purement visuel, aucun effet sur le jeu.

---

## 4. Slots de joueur
- Un joueur peut posséder plusieurs Hoodochi.
- OUVERTE : nombre max joués en parallèle.

---

## 5. Le cimetière
- À la mort, on garde le cadavre : ticker fatal, semaine de la mort, objets qu'il portait, nombre de semaines vécues.
- Le cadavre reste un NFT, consultable et partageable.

---

## 6. Direction UI : ne jamais afficher le chiffre
- Zéro pourcentage, zéro courbe, zéro vert-et-rouge par défaut.
- Le chiffre reste accessible en appuyant quelque part ; par défaut on lit son action sur la gueule d'un animal et sur ce qu'il porte.
- Site : style « motion site », beaucoup d'animations, pas de rendu générique.

---

## 7. Identité visuelle (décidée)
- Pixel art plat, contour sombre 1 px, zéro shading, zéro anti-aliasing. Style « OG NFT collectible ».
- Créature : base 32×44 (`generator/creature.py`) recalquée sur la référence du compte X. Grosse tête ronde, petit corps, deux antennes à point, deux gros yeux ronds, petit bec triangulaire. Espèce inventée.
- Corps de base neutre : collier, objets, yeux, antennes = calques séparés aux mêmes coordonnées.
- Cadrage : créature 32×44 posée en (8,3) sur un canvas 48×48, fond uni ou rare, pas de décor. Rendu final ×2 (96×96) pour le collier et les objets de cou, puis ×8 → 768×768.
- Palette : bleu nuit #1a1f3a, crème #f6efe4. Pas de logos de sociétés ; les lettres d'un ticker passent.

---

## 8. Technique
- Données : API de cours publics, lecture seule (Polygon.io). Pas de compte courtier.
- Stack : Vite + React + TypeScript. Tout se lance avec npm.
- Fréquence : un tick hebdomadaire (vendredi clôture) pour le jeu ; quotidien uniquement pour l'humeur.
- On-chain : Robinhood Chain (mainnet 4663). Contrats v1 déployés (`contracts/README.md`) — ils implémentent l'ancien système (tick quotidien, size, staking en escrow) et devront être redéployés pour la v2 : `Hoodochi` (créature, traits de naissance, slots d'objets, mort), `Collar`, `Item` (ERC-721 des 24 objets, possédés par le Hoodochi, façon ERC-6220 / nested NFT), `Yield` abstrait.
- Rendu des NFT : assemblage de calques 32×43 (corps + traits + objets) via script, pas à la main. Métadonnées recomposées à chaque changement d'objet.

---

## 9. Questions ouvertes (ne pas trancher seul)
1. Sort du collier à la mort.
2. Nombre de Hoodochi joués en parallèle par joueur.
3. Seuils en σ (paliers 1-4, mort).
4. Objets : NFT séparés (ERC-1155 attachés) ou état dans le contrat principal.
5. Web ou mobile en premier.
6. Cadre réglementaire du gain en action → avocat.

---

## 10. Comment travailler avec moi
- Français par défaut.
- Réponses courtes et directes. Pas de récapitulatif de ce que je viens de dire.
- Avant de coder une mécanique, vérifie qu'elle est dans « décidé » et pas dans « ouverte ».
- Quand tu proposes des options, deux ou trois max, avec ta recommandation.
- Ne présente jamais un chiffre financier dans l'UI par défaut (voir §6).
- Si quelque chose contredit ce brief, signale-le avant de continuer.
