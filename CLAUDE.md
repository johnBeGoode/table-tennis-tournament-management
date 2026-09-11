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

### Monter un tournoi de test complet — 4 clics
« Joueurs de test » **32** → Poules / « Répartition auto » (propose 8 poules de 4) → « Répartir » → Résultats / « Générer les scores ». On obtient un tableau principal de 16 (classement intégral : 4 colonnes de 8 matchs, 32 matchs, places 1 à 16) **et** une consolante de 16 (8 troisièmes + 8 quatrièmes), sans barrage ni élimination de 2es. Il n'y a pas de « Générer les scores » pour le tableau : le remplir, c'est cliquer les matchs un à un.

Le mode dépend du **nombre de poules**, pas du nombre de joueurs (`computeBracketStructure(2n, n)`). Le mode `barrage` est bien plus rare qu'il n'y paraît — sur 2 à 12 poules, **seul 7 le déclenche** :

| Poules | Tableau | Mode | Remarque |
|---|---|---|---|
| 2, 4, 8 | 4, 8, 16 | `direct` | 2n est déjà une puissance de 2 |
| 7 | 16 | `barrage` | 2 barrages — **le seul cas de barrage** entre 2 et 12 poules |
| 3, 5, 6, 9, 10, 11, 12 | — | `eliminate` | 2 à 8 seconds renvoyés en consolante |

Pour tester les barrages il faut donc **7 poules** (28 joueurs en poules de 4).

**Attention** : « Joueurs de test » et « Réinitialiser » écrasent le `localStorage` du navigateur. Prévenir avant de lancer ça sur un navigateur qui peut contenir un vrai tournoi.

### Vérifier sans navigateur
Pas de tests, mais le pipeline de la page est reproductible en Node — utile pour attraper une erreur de syntaxe (qui ici ne casse pas un build, elle casse la page en silence) et pour exercer les utilitaires purs :

```bash
curl -sL -o /tmp/babel.js https://unpkg.com/@babel/standalone@7.29.0/babel.min.js   # même version que la page
```

Puis, dans un script Node : `Babel.transform(src, { presets: ['react'] })` sur chaque `.jsx` **et** sur les blocs `<script type="text/babel">` extraits d'`index.html`, puis `vm.runInContext(code, sandbox)` avec un sandbox minimal — `window: {}`, un `localStorage` sur `Map`, et `React` en `new Proxy({}, { get: () => () => {} })`. Le JSX ne s'exécute pas au chargement du module (il est dans des corps de fonctions), donc ce stub suffit pour peupler `window` et appeler les utilitaires partagés. Ce que ça ne couvre pas : rendu, effets, drag & drop.

## Contraintes structurantes

### Il n'y a pas de bundler : tout passe par `window`
Chaque `.jsx` se termine par un `Object.assign(window, {...})` et les autres fichiers consomment `window.X`. Aucun `import`/`export`. Pour partager une fonction entre écrans, il faut l'exporter sur `window` depuis `AppShell.jsx` (c'est là que vivent les utilitaires communs).

### Le cache-buster `?v=N` est manuel — le piège n°1
`index.html` charge les écrans en `<script type="text/babel" src="PoolsScreen.jsx?v=5">`. **Après toute modification d'un `.jsx`, incrémenter son `?v=N` dans `index.html`**, sinon le navigateur sert l'ancienne version et le changement semble sans effet.

### `Date.now()` comme générateur d'id
Les ids de joueurs et de poules sont des timestamps. Il n'y a pas d'utilitaire d'id. Dans une boucle synchrone, `Date.now()` renvoie la même valeur pour tous : appeler `Date.now()` **une fois** puis faire `base + i` (cf. `randomPlayers` dans `AppShell.jsx`, et la répartition auto dans `PoolsScreen.jsx`). Des ids dupliqués cassent silencieusement `playerIds`, les clés de match et les `players.find(...)`.

### Le placement consolante est figé dans `localStorage` — le piège n°3
`ConsolanteScreen` ne place personne automatiquement : le bracket est celui qu'on a construit à la main (drag & drop) ou via le bouton « Auto », et il est rechargé tel quel depuis `consolante-seeds-v3` à chaque montage. **Changer `buildSeedingPattern` ou la numérotation des TS n'a donc aucun effet visible** tant qu'on n'a pas recliqué sur « Auto » : l'ancien placement survit et donne l'impression que la correction n'est pas passée. Le `useEffect` de resynchronisation ne remet à zéro que si la **taille** du bracket change, pas si le pattern change.

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
| `ertt-barrage-results` | barrages |
| `ertt-sets-to-win` | `2` ou `3` (défaut `3`) |
| `ertt-screen` | écran actif |
| `consolante-seeds-v3` | placement manuel de la consolante — écrit **directement** par `ConsolanteScreen.jsx`, pas par `App`. Le suffixe de version est incrémenté dès que le placement change — `buildSeedingPattern` **ou** la numérotation des têtes de série de `ConsolanteScreen` — pour jeter les placements construits avec l'ancienne règle. Clé, clés héritées et purge : `CONSOLANTE_SEEDS_KEY` / `CONSOLANTE_SEEDS_LEGACY_KEYS` / `clearConsolanteSeeds()` dans `AppShell.jsx` |

Il n'existe **pas d'entité Tournoi** : un seul tournoi implicite, dont le nom est codé en dur dans `index.html`.

### Deux formats de résultat, à ne pas confondre
- **Poules** : `{ sets: [[s1, s2], …] }` — des **points** (11, 13…), pas de champ vainqueur : il est recalculé en comptant les sets.
- **Barrages / tableaux** : `{ p1, p2, winner: 1|2, score1, score2 }` où `score1`/`score2` sont des **nombres de sets**, et où `p1`/`p2` sont des **copies** des objets joueurs, pas des ids.

### La clé canonique de match de poule — le piège n°2
`poolMatchKey(poolId, idA, idB)` (`AppShell.jsx`) renvoie `pool-{poolId}-{lo}-{hi}` avec **toujours le plus petit id en premier**. Les sets stockés sont orientés `(lo, hi)` : `s1` appartient au joueur de plus petit id, **jamais** au « premier joueur de la poule ». Inverser cette orientation ne provoque aucune erreur — ça inverse silencieusement tous les classements. Une migration des anciennes clés non canoniques tourne au démarrage dans `App`.

### Utilitaires partagés (`AppShell.jsx`, exportés sur `window`)
- `poolStandings(pool, players, results)` → `[{ id, name, v, d, sf, sa, pf, pa }]` triés. **Source unique** du classement de poule, utilisée par tous les écrans.
- `crossPoolCompare(a, b)` → comparateur inter-poules, **Art. II.109 FFTT** : par quotients (points-rencontre / rencontres jouées, puis manches, puis points-jeu) et non par totaux bruts, pour rester juste entre poules de 3 et de 4.
- `computeBracketStructure(autoQualifiers, thirdsCount)` → `{ bracketSize, mode: 'direct' | 'barrage' | 'eliminate', barrageCount, eliminateCount }`. Décide s'il faut des barrages ou éliminer des 2es.
- `buildSeedingPattern(size)` → ordre des têtes de série dans le tableau (tables FFTT pour 2/4/8/16/32, construction récursive au-delà). **Source unique** du placement, partagée par le tableau principal et la consolante : les deux doivent répartir à l'identique. Invariant : dans chaque paire d'un tour, la somme des seeds vaut `taille + 1`.
- `buildPrincipalSeeds({ pools, players, results, barrageResults })` → `{ struct, bracketSize, seeds, firsts, keptSeconds, barrageWinners }`. **Source unique** de la composition du tableau principal (1ers, 2es retenus, vainqueurs de barrage à slot fixe), `seeds` déjà dans l'ordre des positions via `buildSeedingPattern`. Utilisé par `KnockoutScreen` et l'onglet « Classement final » de `BracketsScreen`.
- `buildIntegralBracket(seeds, prefix, bracketResults)` → `{ groups, places, totalRounds, descendants }`. **Classement intégral** (feuilles FFTT « KO Clt Int ») : règle récursive unique — à chaque tour les vainqueurs continuent, les perdants tombent dans un sous-tableau parallèle qui joue la moitié basse des places. Sur 16 : 32 matchs, 4 par joueur, places 1 à 16. `groups` = un tour d'un sous-tableau (`{ startPlace, endPlace, size, round, matches }`), `places` = `{ place: joueur }`, `descendants` = ids en aval de chaque match (purge en cascade). Invariant : chaque tour contient exactement `taille / 2` matchs.
- `placementLabel(group)` → `'Places 9 à 16'`, `'Places 5e/6e'`, `'Places 3e/4e'`, `'Finale'`.
- `poolShortLabel(pool)` → `'Poule A'` → `'A'` (dérivé du vrai nom, pas de l'index).
- `randomPlayers(count)` → joueurs de test (bouton « Joueurs de test » de la sidebar).

### Les écrans
`AppShell.jsx` fournit la sidebar, la topbar et les deux modales globales (réinitialisation, joueurs de test). Les écrans se succèdent dans l'ordre du parcours :

1. **`PoolsScreen.jsx`** — saisie des joueurs, choix du format (2 ou 3 sets gagnants), constitution des poules. La **répartition auto** applique la méthode du serpent (`snakeDistribute`) sur les joueurs triés du meilleur au moins bon, et **remplace intégralement** les poules existantes. Le choix du format se **verrouille** dès qu'une clé `pool-*` existe dans `results`.
2. **`ResultsScreen.jsx`** — round robin par poule (`poolMatches`, local au fichier), saisie set par set validée au blur (`isSetValid` : 11 contre 0-9, ou prolongation à +2, max 30). Saisir un seul score complète l'autre en traitant la valeur saisie comme celle du perdant. Bouton « Générer les scores » pour remplir tous les matchs restants (données de test).
3. **`BracketsScreen.jsx`** — classements, lecture seule.
4. **`BarrageScreen.jsx`** — matchs de barrage entre 3es, id `barrage-{poolIdA}-{poolIdB}` (reconstruit à l'identique dans `index.html` et `ConsolanteScreen.jsx` : toute modification de cette règle doit être répercutée aux trois endroits).
5. **`KnockoutScreen`** (défini **inline dans `index.html`**, pas dans un fichier à part) — tableau principal en **classement intégral** : structure fournie par `buildIntegralBracket`, une colonne par tour, l'épine principale en haut de chaque colonne puis les sous-tableaux (« Places 9 à 16 », « Places 5 à 8 »…) par place croissante. Ids : `principal-r{round}-{n}` (épine) et `principal-3rd` (3e place) sont **inchangés** depuis l'élimination directe ; les sous-tableaux utilisent `principal-p{place}-r{round}-{n}`, `round` étant l'index global du tour. Effacer un résultat efface aussi ses `descendants` (les deux branches, vainqueur et perdant).
6. **`ConsolanteScreen.jsx`** — tableau à **élimination directe** (pas encore de classement intégral) avec `prefix = 'consolante'`, ids `{prefix}-r{round}-{n}` et `{prefix}-3rd`, plus un placement manuel par drag & drop. Le bouton « Auto » applique `window.buildSeedingPattern` — le **même** placement que le tableau principal.

La colonne finale de la consolante garde une astuce de mise en page : un duplicata **invisible** du bloc « 3e place » au-dessus de la finale, pour que la finale reste centrée sur le point médian des demi-finales. Le tableau principal n'en a plus besoin : avec le classement intégral, sa colonne finale contient `taille / 2` matchs comme les autres. Passer la consolante en classement intégral = brancher `buildIntegralBracket` avec `prefix = 'consolante'` sur ses `seeds` manuels (les ids de l'épine et du 3e place restent compatibles).

### Nettoyages automatiques
- Un `useEffect` de `App` purge les résultats de poule orphelins dès que la composition des poules change — ce qui libère aussi le verrou de format. Si des résultats disparaissent après une génération de données, c'est que les clés ou les ids sont incohérents.
- `resetAll` (bouton « Réinitialiser ») et `seedPlayers` (« Joueurs de test ») vident joueurs, poules et résultats, et purgent le placement consolante via `window.clearConsolanteSeeds()`. `ertt-sets-to-win` n'est **pas** réinitialisé.

## Points connus

- `SETS_TO_WIN` est **codé en dur à 3** dans `KnockoutScreen` (`index.html`) et `ConsolanteScreen.jsx`, alors que `BarrageScreen` suit le réglage `setsToWin`. En mode « 2 sets gagnants », les tableaux exigent donc quand même 3 sets.
- `DEFAULT_SCREEN` (`index.html`) est entouré de marqueurs `/*EDITMODE-BEGIN*/…/*EDITMODE-END*/` manipulés par un outil externe ; sa valeur peut ne pas être `"poules"`.
- Le style est entièrement en **objets inline**, alimentés par `THEMES` (`AppShell.jsx`). Un seul thème (`classique`) ; la bascule de thème a été retirée. Icônes Font Awesome 6.5, police Roboto, les deux via CDN.
- Pas d'import/export de données : le seul transport, c'est `localStorage`.
- Après un « Réinitialiser », la clé `consolante-seeds-v3` **réapparaît avec la valeur `[null]`** dès qu'on visite l'écran Consolante : le `useEffect` de persistance réécrit l'état vide (bracket de taille 1). Sans conséquence, mais ne pas y voir un échec de `clearConsolanteSeeds()` — regarder le contenu, pas l'existence de la clé.
- Le placement du tableau principal et celui de la consolante doivent rester **identiques** ; l'invariant qui le prouve : dans chaque paire d'un tour, la somme des numéros de têtes de série vaut `taille + 1`. Sur un tableau de 16, le témoin le plus parlant est la paire **TS8–TS9** au 1er tour.
