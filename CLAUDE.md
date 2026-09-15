# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Le code, les commentaires et l'interface sont en français. Garde cette langue pour tout ce que tu ajoutes.

## Lancer le projet

Il n'y a **ni `package.json`, ni build, ni dépendances, ni tests**. React et Babel sont chargés depuis un CDN et le JSX est transpilé **dans le navigateur** au chargement de la page.

```bash
node -e "const h=require('http'),f=require('fs'),p=require('path'),r=process.cwd();h.createServer((q,s)=>{let u=q.url.split('?')[0];if(u==='/')u='/index.html';const fp=p.join(r,u);f.readFile(fp,(e,d)=>{if(e){s.writeHead(404);return s.end('404')}const t={'.html':'text/html','.jsx':'text/babel','.js':'text/javascript','.css':'text/css'}[p.extname(fp)]||'text/plain';s.writeHead(200,{'Content-Type':t});s.end(d)})}).listen(4173)"
```

Puis ouvrir http://localhost:4173. `.claude/launch.json` (non versionné, `.claude/` est dans `.gitignore`) contient la même commande (port 4173) pour `preview_start` — **sa racine peut être un chemin en dur** vers le dépôt principal : depuis un worktree, la remplacer par `process.cwd()` sinon on teste l'ancien code sans s'en rendre compte.

Ouvrir `index.html` en `file://` ne marche pas : les `<script src>` sont bloqués.

L'app persiste tout dans `localStorage` ; `localStorage.clear()` puis rechargement remet à zéro.

## Vérifier une modification

Aucun test automatisé n'existe : vérifier une modification, c'est la piloter dans le navigateur.

### Prérequis : le mode test
« Joueurs de test » et les trois « Générer les scores » (Résultats, Tableau principal, Consolante) sont **masqués par défaut**, et le bouton qui les rallume est lui-même caché. Deux gestes, dans l'ordre :

1. **5 clics rapprochés sur le logo « TENNIS DE TABLE »** (en haut de la sidebar, moins de 1,5 s entre deux clics) → le bouton vert **« Mode test »** apparaît au-dessus de « Réinitialiser ». Refaire les 5 clics le recache et éteint le mode au passage.
2. **Cliquer « Mode test »** → le bouton se coche et les boutons de données factices apparaissent (« Joueurs de test » juste en dessous, « Générer les scores » sur les trois écrans).

Rien n'est persisté (aucune clé `ertt-*`) : **chaque chargement de page repart bouton caché et mode éteint**, c'est donc le premier réflexe à avoir quand un bouton de test semble avoir disparu.

### Monter un tournoi de test complet — 4 clics
(mode test actif, cf. ci-dessus) « Joueurs de test » **32** → Poules / « Répartition auto » (propose 8 poules de 4) → « Répartir » → Résultats / « Générer les scores ». On obtient un tableau principal de 16 (classement intégral : 4 colonnes de 8 matchs, 32 matchs, places 1 à 16) **et** une consolante de 16 (8 troisièmes + 8 quatrièmes, même classement intégral une fois placée via « Auto »), sans exempté ni élimination de 2es. Pour voir des byes en consolante : 28 joueurs (7 poules de 4 → 2 meilleurs 3es dans le principal, 12 éligibles dans une consolante de 16) ou tout effectif dont le nombre d'éligibles n'est pas une puissance de 2. Les deux tableaux ont un bouton « Générer les scores » (matchs restants, tour par tour, résultats existants conservés).

Le mode dépend du **nombre de poules**, pas du nombre de joueurs (`computeBracketStructure(2n, n)`). Le tableau fait toujours la puissance de 2 **supérieure** à 2n ; tous les 1ers et 2es sont qualifiés. **Il n'y a jamais de barrage.** Le régime normal est l'**exemption de 1er tour** : les places manquantes restent vides, le 1er tour ramène l'effectif à une puissance de 2 pour le tour suivant, et tous les 3es vont en consolante. Le repêchage de 3es est l'**exception**, réservée au trou de 2 places :

| Poules | Tableau | Mode | Remarque |
|---|---|---|---|
| 2, 4, 8, 16 | 4, 8, 16, 32 | `direct` | 2n est déjà une puissance de 2 |
| 3, 7, 15 | 8, 16, 32 | `thirds` | `B − 2n` **vaut exactement 2** : les **2 meilleurs 3es** (`crossPoolCompare`, quotients inter-poules) complètent le tableau, TS `2n+1` et `2n+2` dans l'ordre des poules ; les autres 3es et les 4es en consolante |
| 5, 6, 9, 10, 11, 12, 13, 14 | 16, 32 | `byes` | il manque autre chose que 2 places : les `B − 2n` **meilleures TS** (TS1 à TS`B−2n`, donc les premières de Classements / Tab principal) sont **exemptées de 1er tour**, les suivantes s'affrontent pour compléter le tour 2 ; **tous** les 3es et 4es en consolante |

Il n'y a **plus de mode `eliminate`** (aucun 2e n'est écarté) **ni de mode `barrage`**. Le seuil est `missing === 2`, **pas** `missing <= nombre de 3es` : avec 6 poules (12 qualifiés, tableau de 16, 4 places à combler) il y aurait assez de 3es pour les remplir, mais on donne 4 exemptions — repêcher 4 troisièmes serait une erreur. Pour voir des meilleurs 3es : **28 joueurs** (7 poules → 2 meilleurs 3es) ou **12 joueurs** (3 poules → tableau de 8, 2 meilleurs 3es) ; pour voir des exemptés dans le principal : **24 joueurs** (6 poules → tableau de 16, 4 exemptés = TS1 à TS4) ou **20 joueurs** (5 poules → 6 exemptés).

Après « Répartir », les poules sont **verrouillées** : pour les retoucher, cliquer sur « Déverrouiller » (en tête de la colonne Poules) et confirmer, puis « Verrouiller » une fois la retouche faite. Pour relancer une répartition auto, il faut repartir de zéro (« Réinitialiser » ou « Joueurs de test »).

**Attention** : « Joueurs de test » (mode test) et « Réinitialiser » écrasent le `localStorage` du navigateur. Prévenir avant de lancer ça sur un navigateur qui peut contenir un vrai tournoi.

### Vérifier sans navigateur
Pas de tests, mais le pipeline de la page est reproductible en Node — utile pour attraper une erreur de syntaxe (qui ici ne casse pas un build, elle casse la page en silence) et pour exercer les utilitaires purs :

```bash
curl -sL -o /tmp/babel.js https://unpkg.com/@babel/standalone@7.29.0/babel.min.js   # même version que la page
```

Puis, dans un script Node : `Babel.transform(src, { presets: ['react'] })` sur chaque `.jsx` **et** sur les blocs `<script type="text/babel">` extraits d'`index.html`, puis `vm.runInContext(code, sandbox)` avec un sandbox minimal — `window: {}`, un `localStorage` sur `Map`, et `React` en `new Proxy({}, { get: () => () => {} })`. Le JSX ne s'exécute pas au chargement du module (il est dans des corps de fonctions), donc ce stub suffit pour peupler `window` et appeler les utilitaires partagés. Ce que ça ne couvre pas : rendu, effets, drag & drop.

**Envelopper chaque source dans une IIFE** (`(function(){...})()`) avant de la passer à `vm.runInContext` : dans le navigateur, Babel standalone exécute chaque `<script type="text/babel">` dans un `eval` qui lui donne sa **propre portée lexicale** — les `const` de haut niveau ne sont pas partagés, seul `window` l'est (c'est toute la raison d'être des `Object.assign(window, {...})`). Un sandbox qui enchaîne les sources dans une portée unique signale de faux conflits, typiquement « Identifier 'loadState' has already been declared » entre `AppShell.jsx` et le bloc `App` d'`index.html`. Prévoir aussi `document.getElementById` et un `ReactDOM` chaînable, sinon le `createRoot(...).render(...)` final échoue pour rien.

## Contraintes structurantes

### Il n'y a pas de bundler : tout passe par `window`
Chaque `.jsx` se termine par un `Object.assign(window, {...})` et les autres fichiers consomment `window.X`. Aucun `import`/`export`. Pour partager une fonction entre écrans, il faut l'exporter sur `window` depuis `AppShell.jsx` (c'est là que vivent les utilitaires communs).

### Le cache-buster `?v=N` est manuel — le piège n°1
`index.html` charge les écrans en `<script type="text/babel" src="PoolsScreen.jsx?v=5">`. **Après toute modification d'un `.jsx`, incrémenter son `?v=N` dans `index.html`**, sinon le navigateur sert l'ancienne version et le changement semble sans effet.

### `Date.now()` comme générateur d'id
Les ids de joueurs et de poules sont des timestamps. Il n'y a pas d'utilitaire d'id. Dans une boucle synchrone, `Date.now()` renvoie la même valeur pour tous : appeler `Date.now()` **une fois** puis faire `base + i` (cf. `randomPlayers` dans `AppShell.jsx`, et la répartition auto dans `PoolsScreen.jsx`). Des ids dupliqués cassent silencieusement `playerIds`, les clés de match et les `players.find(...)`.

### Le placement consolante est figé dans `localStorage` — le piège n°3
`ConsolanteScreen` ne place personne automatiquement : le bracket est celui qu'on a construit à la main (drag & drop) ou via le bouton « Auto », et il est rechargé tel quel depuis `consolante-seeds-v9` à chaque montage. **Changer `buildSeedingPattern` ou la numérotation des TS n'a donc aucun effet visible** tant qu'on n'a pas recliqué sur « Auto » : l'ancien placement survit et donne l'impression que la correction n'est pas passée. Le `useEffect` de resynchronisation ne remet à zéro que si la **taille** du bracket change, pas si le pattern change.

D'où le suffixe de version dans la clé : **toute modification du placement (`buildSeedingPattern` ou l'attribution des numéros de TS) doit s'accompagner d'un incrément de `CONSOLANTE_SEEDS_KEY`** (`AppShell.jsx`), pour que les placements construits avec l'ancien pattern soient jetés au lieu d'être rechargés. Les anciennes clés se déclarent dans `CONSOLANTE_SEEDS_LEGACY_KEYS` et sont supprimées au montage suivant.

## Architecture

### État
Tout l'état vit dans `App` (`index.html`, vers la ligne 438) en `React.useState`, et descend en props vers l'écran actif. Pas de context, pas de store. Chaque morceau est miroité dans `localStorage` par un `useEffect` :

| Clé | Contenu |
|---|---|
| `ertt-players` | `[{ id, name, ranking }]` — `ranking` = points FFTT ou `null` (non classé) |
| `ertt-pools` | `[{ id, name, playerIds }]` — une poule ne référence que des ids |
| `ertt-results` | résultats de poule, `{ [poolMatchKey]: { sets: [[s1, s2], …] } }` |
| `ertt-bracket-results` | tableau principal (épine + sous-tableaux de classement) + consolante |
| `ertt-bracket-schema` | version du schéma des résultats de tableau (`2` = mode `byes` à la place d'`eliminate`, `3` = nouvelles tables 8/16/32 et 2es placés en moitié opposée de leur 1er, `4` = plus de barrages, mode `thirds`, suppression de `ertt-barrage-results`, `5` = repêchage restreint au trou de 2 places, `6` = exemptions aux meilleures TS). Avant 3, purge inconditionnelle (les tables de placement elles-mêmes ont changé). À partir de 3, `App` compare le **régime de remplissage** (`direct` / `barrage` / `thirds` / `byes`) que le tournoi courant aurait sous son schéma enregistré et sous le schéma actuel, et ne purge **une fois** que s'il diffère — au passage 4→5, cela vise 6 et 11 à 14 poules, et laisse 3, 7, 15 intacts. Au passage 5→6, purge en plus **tout** tournoi en régime `byes` : le régime ne change pas mais le placement si |
| `ertt-sets-to-win` | `2` ou `3` (défaut `3`) |
| `ertt-pools-locked` | `true` dès que « Répartir » (répartition auto) a été appliqué : l'écran Poules masque toute action de modification (création/suppression de poule, ajout/retrait de joueur, nouvelle répartition, suppression d'un joueur placé, ajout de joueur). Levé seulement par « Déverrouiller » (modale de confirmation), « Réinitialiser » ou « Joueurs de test ». Une fois déverrouillé avec des poules existantes, l'en-tête propose « Verrouiller » (pas de nouvelle répartition auto) ; « Répartition auto » n'apparaît que sans aucune poule. |
| `ertt-screen` | écran actif |
| `ertt-results-tab` | sous-onglet de Résultats (`pending` / `done`) — écrit par `ResultsScreen.jsx`, remis à `pending` à chaque chargement de page |
| `ertt-brackets-tab` | sous-onglet de Classements (`poules` / `principal` / `final`) — écrit par `BracketsScreen.jsx`, remis à `poules` à chaque chargement de page |
| `consolante-seeds-v9` | placement manuel de la consolante — écrit **directement** par `ConsolanteScreen.jsx`, pas par `App`. Le suffixe de version est incrémenté dès que le placement change — `buildSeedingPattern` **ou** la numérotation des têtes de série de `ConsolanteScreen` — pour jeter les placements construits avec l'ancienne règle. Clé, clés héritées et purge : `CONSOLANTE_SEEDS_KEY` / `CONSOLANTE_SEEDS_LEGACY_KEYS` / `clearConsolanteSeeds()` dans `AppShell.jsx` |

Il n'existe **pas d'entité Tournoi** : un seul tournoi implicite, dont le nom est codé en dur dans `index.html`.

### Deux formats de résultat, à ne pas confondre
- **Poules** : `{ sets: [[s1, s2], …] }` — des **points** (11, 13…), pas de champ vainqueur : il est recalculé en comptant les sets.
- **Tableaux** : `{ p1, p2, winner: 1|2, score1, score2 }` où `score1`/`score2` sont des **nombres de sets**, et où `p1`/`p2` sont des **copies** des objets joueurs, pas des ids.

### La clé canonique de match de poule — le piège n°2
`poolMatchKey(poolId, idA, idB)` (`AppShell.jsx`) renvoie `pool-{poolId}-{lo}-{hi}` avec **toujours le plus petit id en premier**. Les sets stockés sont orientés `(lo, hi)` : `s1` appartient au joueur de plus petit id, **jamais** au « premier joueur de la poule ». Inverser cette orientation ne provoque aucune erreur — ça inverse silencieusement tous les classements. Une migration des anciennes clés non canoniques tourne au démarrage dans `App`.

### Utilitaires partagés (`AppShell.jsx`, exportés sur `window`)
- `resetTabPreferences()` → remet `ertt-results-tab` et `ertt-brackets-tab` à `pending` / `poules`. Appelé **une fois au chargement** par `index.html`, avant le premier rendu : le sous-onglet consulté survit donc à un aller-retour entre écrans (c'est tout l'intérêt de la clé, les écrans se démontent) mais jamais à un rechargement de page, où Résultats et Classements repartent sur « À jouer » et « Poules ».
- `loadState(key, def)` / `saveState(key, val)` → `localStorage` en JSON, tolérants aux erreurs. `App` les récupère depuis `window` ; un écran qui veut mémoriser une préférence d'affichage (sous-onglet) les utilise avec sa propre clé `ertt-*`.
- `poolStandings(pool, players, results)` → `[{ id, name, v, d, sf, sa, pf, pa }]` triés par `poolCompare`. **Source unique** du classement de poule, utilisée par tous les écrans.
- `poolCompare(a, b)` → comparateur **intra-poule** : quotient points-rencontre (comme `crossPoolCompare`), puis **différence** de manches (`sf − sa`), puis **différence** de points-jeu (`pf − pa`). Pas de quotients ici : ils sont réservés à l'inter-poules. `BracketsScreen` s'en sert aussi pour signaler les ex æquo.
- `crossPoolCompare(a, b)` → comparateur inter-poules, **Art. II.109 FFTT** : par quotients (points-rencontre / rencontres jouées, puis manches, puis points-jeu) et non par totaux bruts, pour rester juste entre poules de 3 et de 4.
- `computeBracketStructure(autoQualifiers, thirdsCount)` → `{ bracketSize, mode: 'direct' | 'thirds' | 'byes', thirdsQualified, byeCount }`. `bracketSize` est toujours la puissance de 2 supérieure ; décide si les places manquantes sont comblées par les 2 meilleurs 3es (**uniquement** quand il en manque exactement 2, et qu'il existe au moins 2 troisièmes) ou laissées vides comme exemptions de 1er tour.
- `buildSeedingPattern(size)` → ordre des têtes de série dans le tableau (tables pour 2/4/8/16/32, construction récursive au-delà). **Source unique** du placement, partagée par le tableau principal et la consolante : les deux doivent répartir à l'identique. Les tables sont la référence, pas une formule : sur 16 les paires du 1er tour font 17, mais sur 8 elles font 7 ou 11 et sur 32, 29 ou 37 (TS1–TS28, TS5–TS32). Ne jamais déduire l'adversaire par `taille + 1 − seed` : utiliser `firstRoundOpponent(size, seed)`. Propriété des tables 8, 16 et 32 : TS i et TS i + taille/2 sont en moitiés opposées. Utilitaires associés : `patternIndex(size, seed)` (position 0-indexée), `meetingRound(posA, posB)` (tour où deux positions se croisent, `log2(taille)` = finale), `assignPartnerSlots(size, anchors, block, slots)` — `slots` est la **liste explicite** des slots à pourvoir, pas forcément contiguë (affectation **exacte** par programmation dynamique sur les sous-ensembles de slots, ≤ 16 entrées : chaque entrée du bloc reçoit un seed de `from..to` de façon à minimiser d'abord le nombre de retrouvailles au 1er tour avec les ancres de même `poolId` (plusieurs ancres par poule possibles, les coûts s'additionnent : 1er **et** 2e quand on place un 3e), puis au 2e, etc. ; à coût égal le plus petit slot ; sans ancre, coût nul. Pas un glouton : l'ordre de passage ferait perdre à une poule le dernier slot de la bonne moitié. Mémo à une entrée, les écrans l'appellent à chaque rendu).
- `assignBracketSlots(bracketSize, byeCount, numbered)` → `{ [seed]: slot }`. **Source unique du placement quand le tableau n'est pas plein**, partagée par le tableau principal (`buildPrincipalSeeds`) et la consolante (bouton « Auto ») — les deux doivent répartir à l'identique. `numbered` = `[{ poolId, poolRank, seed }]`, `seed` = numéro de TS (1 = meilleur). Les **`byeCount` meilleures TS** sont exemptées de 1er tour ; les suivantes s'affrontent pour ramener le tour 2 à une puissance de 2. Le point délicat : on vide les **partenaires** des slots `1..byeCount`, jamais les derniers slots du pattern — sur 16 les deux coïncident (les paires font 17), mais sur 32 les paires sont 1-28, 2-27, 3-26, 4-25, 5-32, 6-31…, donc vider 29..32 exempterait TS5 à TS8 en laissant jouer TS1 à TS4. L'affectation procède par blocs (rang faible exempté, rang fort exempté, puis les joueurs par rang), chaque bloc ne puisant que dans les slots de son groupe — ce qui garantit *qui* est exempté — et `assignPartnerSlots` éloignant à l'intérieur du bloc chacun de ses camarades de poule déjà placés. Le bloc des rangs faibles exemptés passe en premier : il n'a qu'une poignée de slots possibles. `byeCount = 0` redonne exactement le placement canonique.
- `buildPrincipalSeeds({ pools, players, results })` → `{ struct, bracketSize, seeds, seedList, firsts, seconds, thirds }`. **Source unique** de la composition **et de la numérotation** du tableau principal. `seeds` = joueurs dans l'ordre des positions via `buildSeedingPattern` (`null` = slot vide) ; `seedList` = une entrée par numéro de TS `{ seed, slot, player, poolId, poolRank: 1 | 2 | 3 (meilleur 3e), bye }`, consommée par `BracketsScreen` (onglet « Tab principal ») et `QualificationScreen` ; `thirds` = les 3es retenus `[{ player, poolId }]` dans l'ordre des poules (mode `thirds`, vide sinon), consommé par `ConsolanteScreen` pour les exclure. Le mérite inter-poules (`crossPoolCompare`) ne sert qu'à **choisir** les 3es retenus. Numérotation, **dans tous les modes** : **ordre des poules** et jamais le mérite (les statistiques ne classent qu'à l'intérieur d'une poule) — 1er de A = TS1, 1er de B = TS2, …, puis les 2es dans le même ordre (2e de A = TS n+1), puis les 3es retenus dans le même ordre (TS `2n+1..B`). Placement : chaque entrée porte aussi `slot` (numéro de seed du pattern). Les 1ers sont placés à leur numéro ; les 2es occupent les seeds `n+1..2n` via `assignPartnerSlots`, chacun en **moitié opposée** du 1er de sa poule (ils ne peuvent se rejouer qu'en finale, jamais au 1er tour) ; les 2 meilleurs 3es occupent de même les seeds `2n+1` et `2n+2`, le plus loin possible du 1er **et** du 2e de leur poule (ancres cumulées). Tableau plein (4, 8 ou 16 poules) : `slot = seed`. En mode `byes`, tout le placement passe par `assignBracketSlots` : les slots ne sont plus `1..2n` et les exemptions vont aux meilleures TS. `bye` = le voisin de position (`firstRoundOpponent`) est vide, en mode `byes` seulement — et ce sont exactement les TS 1 à `byeCount`, cf. `assignBracketSlots`. Utilisé par `KnockoutScreen`, `BracketsScreen`, `QualificationScreen` et `ConsolanteScreen`.
- `buildIntegralBracket(seeds, prefix, bracketResults)` → `{ groups, places, totalRounds, descendants }`. **Classement intégral** (feuilles FFTT « KO Clt Int ») : règle récursive unique — à chaque tour les vainqueurs continuent, les perdants tombent dans un sous-tableau parallèle qui joue la moitié basse des places. Sur 16 : 32 matchs, 4 par joueur, places 1 à 16. `groups` = un tour d'un sous-tableau (`{ startPlace, endPlace, size, round, matches }`), `places` = `{ place: joueur }`, `descendants` = ids en aval de chaque match (purge en cascade). Option `{ byes: true }` : slots vides = byes structurels — consolante **et** tableau principal en mode `byes` (exemptés) ; les appels du principal dérivent l'option de `struct.mode` (dans les autres modes le tableau est plein, un slot vide n'avance pas). Invariant : chaque tour contient exactement `taille / 2` matchs (byes compris).
- `placementLabel(group)` → `'Places 9 à 16'`, `'Places 5e/6e'`, `'Places 3e/4e'`, `'Finale'`.
- `poolShortLabel(pool)` → `'Poule A'` → `'A'` (dérivé du vrai nom, pas de l'index).
- `randomPlayers(count)` → joueurs de test (bouton « Joueurs de test » de la sidebar, visible en mode test seulement).

### Les écrans
`AppShell.jsx` fournit la sidebar, la topbar et les deux modales globales (réinitialisation, joueurs de test). Les écrans se succèdent dans l'ordre du parcours :

1. **`PoolsScreen.jsx`** — saisie des joueurs, choix du format (2 ou 3 sets gagnants), constitution des poules. Il n'y a **plus de création manuelle de poule** : les poules ne naissent que de la répartition auto (le retrait/ajout d'un joueur dans une poule existante reste possible une fois déverrouillé). La **répartition auto** applique la méthode du serpent (`snakeDistribute`) sur les joueurs triés du meilleur au moins bon, **remplace intégralement** les poules existantes et **pose le verrou** `poolsLocked` (état d'App, clé `ertt-pools-locked`) : toutes les actions de modification disparaissent de l'écran jusqu'à « Déverrouiller ». Le choix du format se **verrouille** dès qu'une clé `pool-*` existe dans `results` — c'est un verrou distinct.
2. **`ResultsScreen.jsx`** — round robin par poule (`poolMatches`, local au fichier), saisie set par set validée au blur (`isSetValid` : 11 contre 0-9, ou prolongation à +2, max 30). Saisir un seul score complète l'autre en traitant la valeur saisie comme celle du perdant. Bouton « Générer les scores » pour remplir tous les matchs restants (données de test, visible en mode test seulement).
3. **`BracketsScreen.jsx`** — classements, lecture seule. L'onglet « Tab principal » liste les TS depuis `seedList` (badge « Exempt 1er tour » en mode `byes`) ; l'onglet « Classement final » plafonne les places à 2n en mode `byes` (un exempté ne « bat » personne, les places du bas ne sont jamais attribuées).
4. **`QualificationScreen.jsx`** (onglet « Qualification », ex-« Barrages », id d'écran `qualification` — un `ertt-screen` valant encore `barrage` y est redirigé par `App`) — lecture seule, explique comment le tableau principal se remplit. Mode `direct` : message « tableau complet ». Mode `thirds` : classement de **tous** les 3es au mérite inter-poules (V-D, quotients de manches et de points) avec, pour chacun, « TSn · Principal » ou « Consolante ». Mode `byes` : liste des exemptés de 1er tour (depuis `seedList`). Les listes n'apparaissent qu'une fois toutes les poules terminées. Aucune saisie, aucun état : tout vient de `buildPrincipalSeeds`.
5. **`KnockoutScreen`** (défini **inline dans `index.html`**, pas dans un fichier à part) — tableau principal en **classement intégral** : structure fournie par `buildIntegralBracket`, une colonne par tour, l'épine principale en haut de chaque colonne puis les sous-tableaux (« Places 9 à 16 », « Places 5 à 8 »…) par place croissante. En mode `byes`, `buildIntegralBracket` reçoit `{ byes: true }` : un slot vide s'affiche « — Exempt — », la carte est estompée et non cliquable, et l'en-tête compte les matchs réellement jouables (sans « par joueur »). Ids : `principal-r{round}-{n}` (épine) et `principal-3rd` (3e place) sont **inchangés** depuis l'élimination directe ; les sous-tableaux utilisent `principal-p{place}-r{round}-{n}`, `round` étant l'index global du tour. Effacer un résultat efface aussi ses `descendants` (les deux branches, vainqueur et perdant).
6. **`ConsolanteScreen.jsx`** — même classement intégral que le principal (`buildIntegralBracket(seeds, 'consolante', …, { byes: true })`), mêmes colonnes et encadrés, plus un placement manuel par drag & drop. La différence : la consolante n'est pas forcément pleine (taille = puissance de 2 supérieure au nombre d'éligibles), donc un slot vide du 1er tour est un **bye structurel** qui se propage — l'adversaire passe d'office, bye contre bye reste un bye, et les places du bas restent vides. En mode `byes`, le principal utilise la même option que la consolante. Éligibles : les 3es **non retenus** dans le principal (`buildPrincipalSeeds().thirds` les exclut en mode `thirds`) et tous les 4es. Numérotation : même règle que le principal — tous les 3es dans l'ordre des poules, puis tous les 4es dans le même ordre. Le bouton « Auto » délègue à `window.assignBracketSlots` — la **même** fonction que le tableau principal, donc le même placement : 3es puis 4es dans l'ordre des poules, 4e en moitié opposée de son 3e, et exemptions de 1er tour aux meilleures TS.

### Nettoyages automatiques
- Un `useEffect` de `App` purge les résultats de poule orphelins dès que la composition des poules change — ce qui libère aussi le verrou de format. Si des résultats disparaissent après une génération de données, c'est que les clés ou les ids sont incohérents.
- Au chargement, `App` migre `ertt-bracket-results` vers le schéma 4 (clé `ertt-bracket-schema`) : purge one-shot, cf. table des clés.
- Le **mode test** vit dans `App` (`testMode`, `index.html`) : **jamais persisté**, il descend en prop vers `AppShell` (bouton « Mode test » et « Joueurs de test »), `ResultsScreen`, `KnockoutScreen` et `ConsolanteScreen`, qui s'en servent pour masquer leur « Générer les scores ». La visibilité du bouton « Mode test » lui-même est un état local d'`AppShell` (`testUnlocked`), déverrouillé par `UNLOCK_CLICKS` clics sur le logo espacés de moins de `UNLOCK_MAX_GAP` ms — le compteur vit dans un `useRef`, pas dans l'état, pour ne pas re-rendre la sidebar à chaque clic.
- `resetAll` (bouton « Réinitialiser ») et `seedPlayers` (« Joueurs de test ») vident joueurs, poules et résultats, lèvent le verrou des poules et purgent le placement consolante via `window.clearConsolanteSeeds()`. `ertt-sets-to-win` n'est **pas** réinitialisé.

## Points connus

- `SETS_TO_WIN` est **codé en dur à 3** dans `KnockoutScreen` (`index.html`) et `ConsolanteScreen.jsx`. En mode « 2 sets gagnants », les tableaux exigent donc quand même 3 sets.
- `DEFAULT_SCREEN` (`index.html`) est entouré de marqueurs `/*EDITMODE-BEGIN*/…/*EDITMODE-END*/` manipulés par un outil externe ; sa valeur peut ne pas être `"poules"`.
- Le style est entièrement en **objets inline**, alimentés par `THEMES` (`AppShell.jsx`). Un seul thème (`classique`) ; la bascule de thème a été retirée. Icônes Font Awesome 6.5, police Roboto, les deux via CDN.
- Pas d'import/export de données : le seul transport, c'est `localStorage`.
- Après un « Réinitialiser », la clé `consolante-seeds-v9` **réapparaît avec la valeur `[null]`** dès qu'on visite l'écran Consolante : le `useEffect` de persistance réécrit l'état vide (bracket de taille 1). Sans conséquence, mais ne pas y voir un échec de `clearConsolanteSeeds()` — regarder le contenu, pas l'existence de la clé.
- Le placement du tableau principal et celui de la consolante doivent rester **identiques** (même `buildSeedingPattern`, même `assignPartnerSlots` : 3es à leur numéro, 4es en moitié opposée de leur 3e). Sur un tableau de 16, chaque paire du 1er tour fait 17 (témoin : **TS8–TS9**) ; sur 32 ce n'est plus vrai (TS1–TS28, TS5–TS32), c'est la table qui fait foi. Le témoin universel : dans un tableau plein, le 1er et le 2e d'une même poule sont dans des moitiés opposées.
