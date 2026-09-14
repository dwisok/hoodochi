# HOODOCHI — Brief projet

Tu travailles sur Hoodochi, un tamagotchi on-chain adossé à des actions cotées. Ce document est la source de vérité. Lis-le en entier avant toute action. Quand une question est marquée OUVERTE, ne tranche pas seul : propose des options et demande.

---

## 1. Le concept en une phrase

Tu adoptes une créature pixel art. Tu lui mets un collier lié à une action (NVDA, TSLA, GME…). Elle vit, grossit, maigrit et meurt selon ce que fait le cours. Si tu stakes ton Hoodochi, tu gagnes l'action de son collier tant qu'elle vit. Si le cours chute trop, elle meurt. Mort permanente.

Ce qui rend l'idée forte : la rareté n'est pas décidée par un game designer, c'est le marché qui décide. On ne peut pas la farmer, l'acheter ni la prévoir. Les créatures qui survivent 6 mois sont légendaires.

---

## 2. Objets de la collection

### 2.1 Le Hoodochi (NFT créature)
- La créature elle-même. Corps de base neutre + traits.
- Un Hoodochi porte un collier à la fois. Sans collier, il n'est lié à rien et ne vit pas (état dormant).
- Mort permanente : un Hoodochi mort ne revit pas. Il va au cimetière (voir §5).

### 2.2 Le collier (NFT item séparé)
- Un collier = un ticker. Exemple : collier NVDA, collier TSLA.
- Le collier est un NFT indépendant, échangeable, transférable.
- On peut retirer un collier et en mettre un autre : changer d'action sans changer de créature.
- Le collier porte le ticker en petites lettres pixel, comme une médaille de chien.
- OUVERTE : que se passe-t-il pour le collier quand le Hoodochi meurt ? (brûlé, libéré, marqué « a tué un Hoodochi » ?)

### 2.3 Le staking
- On stake le Hoodochi (avec son collier) pour gagner l'action du collier.
- Gain proportionnel à la performance du ticker pendant le staking.
- Si le cours baisse au-delà du seuil de survie (voir §3), le Hoodochi meurt et le staking s'arrête.
- ⚠️ NON VALIDÉ JURIDIQUEMENT. Distribuer de l'exposition à une action réelle = produit financier (KYC, licences, restrictions par pays). La note de concept initiale avait choisi « ticker, pas position détenue » précisément pour éviter ça. Cette mécanique inverse ce choix. À traiter avec un avocat AVANT tout code de distribution. En attendant : coder la mécanique de manière abstraite (un « yield » générique), sans brancher de vrai actif.

---

## 3. Règles de vie (décidées)

### 3.1 Mort par famine, pas par seuil fixe
- La créature consomme de l'énergie chaque jour. Le rendement de l'action la nourrit.
- Une action qui stagne ne tue pas d'un coup : elle fait maigrir lentement jusqu'à la mort.
- Le coût de la vie est calé sur le taux sans risque (bons du Trésor). La créature doit littéralement battre le taux sans risque pour survivre. Une action à +2 %/an, la bestiole agonise.
- Ça règle le problème du marché haussier : un seuil du type « meurt à -30 % » ne tuerait presque personne et rendrait la rareté factice.

### 3.2 Santé et apparence sont découplées

| Attribut | Calculé sur | Effet |
|---|---|---|
| Santé (= survie) | Perf normalisée par la volatilité | Chances de survie comparables entre tickers calmes et agités |
| Apparence (= gabarit) | Perf brute | Une meme stock est spectaculaire, une valeur calme est petite et stable |

Sans normalisation, seules les actions volatiles seraient jouables et Coca serait injouable. Avec le découplage, deux créatures ont des chances de survie proches mais des vies complètement différentes à regarder.

### 3.3 L'humeur
- Deux échelles de temps : taille et santé s'accumulent sur des semaines ; l'humeur, c'est la journée en cours.
- Ça produit des états contradictoires et vivants : énorme et déprimée (gagnante long terme qui prend une claque aujourd'hui), squelettique et euphorique (action morte qui rebondit).
- L'humeur se calcule en écarts-types, pas en pourcentages : le move du jour rapporté à la volatilité habituelle du titre. +1 % sur Coca = aux anges. +1 % sur une meme stock = journée molle, elle s'ennuie.
- Les tempéraments ne sont pas assignés, ils sortent du ticker. Une créature Coca est placide. Une créature volatile est maniaco-dépressive de naissance.
- Trois mécaniques dérivées :
  - Gap d'ouverture : elle se réveille déjà de bonne ou mauvaise humeur. On ouvre l'app le matin et on voit dans quel état elle a passé la nuit.
  - Marché fermé = elle dort. Week-end, elle ronfle. Crée un rythme réel.
  - Séries : cinq jours verts d'affilée ≠ un gros jour vert. Débloque des états maniaques, quelque chose qui se voit venir.
- Du bruit dans l'humeur : parfois un mauvais jour sans raison. Sinon c'est un cadran avec un visage.

### 3.4 Slots
- On peut avoir plusieurs Hoodochi en même temps.
- OUVERTE : combien de slots par joueur ?
- OUVERTE : un slot occupé l'est-il jusqu'à la mort, ou peut-on abandonner ? Abandon possible = on jette les perdantes et la rareté s'effondre. Pas d'abandon = on subit ses choix, plus dur et probablement meilleur. Tendance : pas d'abandon.

---

## 4. Traits (système NFT)

Principe : les traits ne sont pas aléatoires, ils sortent du marché. C'est l'avantage sur toute collection PFP classique.

| Trait | Source | Fixe ou dynamique |
|---|---|---|
| Couleur du corps | Secteur du ticker (tech, énergie, conso…) | Fixe au premier collier, OUVERTE si change avec le collier |
| Gabarit (maigre / normal / gros) | Perf brute cumulée | Dynamique |
| Yeux | Humeur du jour | Dynamique, quotidien |
| Accessoire (casquette, couronne, halo, cornes…) | Paliers de survie : 30 j, 90 j, 180 j | Gagné, permanent |
| Collier | NFT séparé, ticker | Échangeable |
| Fond | État : vivant / endormi / cimetière | Dynamique |

Les traits rares ne sont pas mintés, ils sont gagnés en survivant.

---

## 5. Le cimetière
- À la mort, on garde le cadavre : graphique final, durée de vie, cause de mort, collier porté.
- Le cadavre reste un NFT (le Hoodochi mort), consultable et partageable.
- Les gens partageront leurs morts autant que leurs survivantes. « Mort de faim au bout de 47 jours » est un meilleur post que « toujours vivante ».

---

## 6. Direction UI : ne jamais afficher le chiffre

- Zéro pourcentage, zéro courbe, zéro vert-et-rouge par défaut.
- Le vert/rouge est le marqueur d'app financière. Dès qu'il est là, le projet ressemble à tous les autres.
- L'humeur passe par la posture, la vitesse, la température de couleur, le son.
- Le chiffre reste accessible en appuyant quelque part, mais par défaut on lit son action sur la gueule d'un animal.
- Le graphique caché : la créature marche sur son propre historique. Le terrain est la courbe. Derrière elle, le passé. Devant, du brouillard. Quand ça grimpe elle souffre, quand ça descend elle dévale. Le chart est là, personne ne le voit comme un chart.

---

## 7. Identité visuelle (décidée)

- Style : pixel art plat, grille 24×24, couleurs plates, contour sombre 1 px, zéro shading, zéro anti-aliasing. Style « OG NFT collectible ».
- La créature : grosse tête ronde sur un petit corps, deux volumes distincts. Deux antennes avec un point au bout. Deux gros yeux ronds. Petit bec triangulaire. Petits bras et pieds. Pas d'oreilles, pas de fourrure, pas de museau. Ce n'est ni un chat, ni un chien, ni un alien : une espèce inventée.
- Corps de base neutre : tout le reste (accessoires, collier, joues, etc.) est un calque séparé aux mêmes coordonnées.
- PP du compte X : la créature avec traits rares (couronne, yeux rouges, chaîne dorée), fond bleu nuit plat (#1a1f3a).
- Bannière X : fond crème (#f6efe4), une dizaine de Hoodochi de couleurs pastel qui s'amusent, chacun avec un item et un collier ticker, décor pixel discret (sol, ligne de cours en dents de scie, nuages).
- Pas de logos de sociétés sur les créatures. Les lettres d'un ticker passent, les logos non.

---

## 8. Technique

- Données : API de cours publics, lecture seule (Polygon, Finnhub ou Alpaca). Pas de compte courtier, pas de données de compte.
- Pas de Robinhood : pas d'API publique actions, seulement crypto, et leurs CGU interdisent l'accès automatisé.
- Stack pressenti : Vite + React + react-three-fiber (même base qu'ETHER4, projet précédent).
- Fréquence : un tick par jour de bourse suffit pour la santé. L'humeur a besoin d'intraday si on veut qu'elle bouge dans la journée.
- On-chain : OUVERTE (chaîne, standard NFT, contrat de staking). Ne rien déployer avant le point juridique du §2.3.
- Rendu des NFT : générer les images par assemblage de calques PNG 24×24 (corps + traits) via script, pas à la main.

---

## 9. Questions ouvertes (ne pas trancher seul)

1. Abandon possible ou slot jusqu'à la mort ?
2. Nombre de slots par joueur.
3. Web ou mobile en premier ? Le rituel du matin pousse vers le mobile.
4. Sort du collier à la mort du Hoodochi.
5. La couleur du corps change-t-elle avec le collier ou reste-t-elle fixée au premier ?
6. Chaîne et standards.
7. Cadre réglementaire du staking → avocat.

---

## 10. Comment travailler avec moi

- Français par défaut.
- Réponses courtes et directes. Pas de récapitulatif de ce que je viens de dire.
- Avant de coder une mécanique de jeu, vérifie qu'elle est dans « décidé » et pas dans « ouverte ».
- Quand tu proposes des options, deux ou trois max, avec ta recommandation.
- Ne présente jamais un chiffre financier dans l'UI par défaut (voir §6).
- Si quelque chose contredit ce brief, signale-le avant de continuer.
