# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Le code, les commentaires et l'interface sont en français. Garde cette langue pour tout ce que tu ajoutes.

## Lancer le projet

Il n'y a **ni `package.json`, ni build, ni dépendances, ni tests**. React et Babel sont chargés depuis un CDN et le JSX est transpilé **dans le navigateur** au chargement de la page.

```bash
node -e "const h=require('http'),f=require('fs'),p=require('path'),r=process.cwd();h.createServer((q,s)=>{let u=q.url.split('?')[0];if(u==='/')u='/index.html';const fp=p.join(r,u);f.readFile(fp,(e,d)=>{if(e){s.writeHead(404);return s.end('404')}const t={'.html':'text/html','.jsx':'text/babel','.js':'text/javascript','.css':'text/css'}[p.extname(fp)]||'text/plain';s.writeHead(200,{'Content-Type':t});s.end(d)})}).listen(4173)"
```

Puis ouvrir http://localhost:4173. `.claude/launch.json` contient la même commande (port 4173) pour `preview_start` — **son chemin racine est en dur**, à vérifier quand on travaille depuis un worktree.

Ouvrir `index.html` en `file://` ne marche pas : les `<script src>` sont bloqués.

Vérifier une modification = la piloter dans le navigateur (aucun test automatisé n'existe). L'app persiste tout dans `localStorage` ; `localStorage.clear()` puis rechargement remet à zéro.

## Contraintes structurantes

### Il n'y a pas de bundler : tout passe par `window`
Chaque `.jsx` se termine par un `Object.assign(window, {...})` et les autres fichiers consomment `window.X`. Aucun `import`/`export`. Pour partager une fonction entre écrans, il faut l'exporter sur `window` depuis `AppShell.jsx` (c'est là que vivent les utilitaires communs).

### Le cache-buster `?v=N` est manuel — le piège n°1
`index.html` charge les écrans en `<script type="text/babel" src="PoolsScreen.jsx?v=5">`. **Après toute modification d'un `.jsx`, incrémenter son `?v=N` dans `index.html`**, sinon le navigateur sert l'ancienne version et le changement semble sans effet.

### `Date.now()` comme générateur d'id
Les ids de joueurs et de poules sont des timestamps. Il n'y a pas d'utilitaire d'id. Dans une boucle synchrone, `Date.now()` renvoie la même valeur pour tous : appeler `Date.now()` **une fois** puis faire `base + i` (cf. `randomPlayers` dans `AppShell.jsx`, et la répartition auto dans `PoolsScreen.jsx`). Des ids dupliqués cassent silencieusement `playerIds`, les clés de match et les `players.find(...)`.

## Architecture

### État
Tout l'état vit dans `App` (`index.html`, vers la ligne 438) en `React.useState`, et descend en props vers l'écran actif. Pas de context, pas de store. Chaque morceau est miroité dans `localStorage` par un `useEffect` :

| Clé | Contenu |
|---|---|
| `ertt-players` | `[{ id, name, ranking }]` — `ranking` = points FFTT ou `null` (non classé) |
| `ertt-pools` | `[{ id, name, playerIds }]` — une poule ne référence que des ids |
| `ertt-results` | résultats de poule, `{ [poolMatchKey]: { sets: [[s1, s2], …] } }` |
| `ertt-bracket-results` | tableau principal + consolante |
| `ertt-barrage-results` | barrages |
| `ertt-sets-to-win` | `2` ou `3` (défaut `3`) |
| `ertt-screen` | écran actif |
| `consolante-seeds` | placement manuel de la consolante — écrit **directement** par `ConsolanteScreen.jsx`, pas par `App` (et non purgé par « Réinitialiser ») |

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
- `poolShortLabel(pool)` → `'Poule A'` → `'A'` (dérivé du vrai nom, pas de l'index).
- `randomPlayers(count)` → joueurs de test (bouton « Joueurs de test » de la sidebar).

### Les écrans
`AppShell.jsx` fournit la sidebar, la topbar et les deux modales globales (réinitialisation, joueurs de test). Les écrans se succèdent dans l'ordre du parcours :

1. **`PoolsScreen.jsx`** — saisie des joueurs, choix du format (2 ou 3 sets gagnants), constitution des poules. La **répartition auto** applique la méthode du serpent (`snakeDistribute`) sur les joueurs triés du meilleur au moins bon, et **remplace intégralement** les poules existantes. Le choix du format se **verrouille** dès qu'une clé `pool-*` existe dans `results`.
2. **`ResultsScreen.jsx`** — round robin par poule (`poolMatches`, local au fichier), saisie set par set validée au blur (`isSetValid` : 11 contre 0-9, ou prolongation à +2, max 30). Saisir un seul score complète l'autre en traitant la valeur saisie comme celle du perdant. Bouton « Générer les scores » pour remplir tous les matchs restants (données de test).
3. **`BracketsScreen.jsx`** — classements, lecture seule.
4. **`BarrageScreen.jsx`** — matchs de barrage entre 3es, id `barrage-{poolIdA}-{poolIdB}` (reconstruit à l'identique dans `index.html` et `ConsolanteScreen.jsx` : toute modification de cette règle doit être répercutée aux trois endroits).
5. **`KnockoutScreen`** (défini **inline dans `index.html`**, pas dans un fichier à part) — tableau principal, ids `{prefix}-r{round}-{n}` et `{prefix}-3rd` avec `prefix = 'principal'`.
6. **`ConsolanteScreen.jsx`** — même construction de tableau avec `prefix = 'consolante'`, plus un placement manuel par drag & drop (`buildSeedingPattern` pour le seeding).

La colonne finale du tableau principal et celle de la consolante partagent une même astuce de mise en page : un duplicata **invisible** du bloc « 3e place » au-dessus de la finale, pour que la finale reste centrée sur le point médian des demi-finales. Garder les deux écrans synchronisés.

### Nettoyages automatiques
- Un `useEffect` de `App` purge les résultats de poule orphelins dès que la composition des poules change — ce qui libère aussi le verrou de format. Si des résultats disparaissent après une génération de données, c'est que les clés ou les ids sont incohérents.
- `resetAll` (bouton « Réinitialiser ») vide joueurs, poules et résultats, mais **pas** `ertt-sets-to-win` ni `consolante-seeds`.

## Points connus

- `SETS_TO_WIN` est **codé en dur à 3** dans `KnockoutScreen` (`index.html`) et `ConsolanteScreen.jsx`, alors que `BarrageScreen` suit le réglage `setsToWin`. En mode « 2 sets gagnants », les tableaux exigent donc quand même 3 sets.
- `DEFAULT_SCREEN` (`index.html`) est entouré de marqueurs `/*EDITMODE-BEGIN*/…/*EDITMODE-END*/` manipulés par un outil externe ; sa valeur peut ne pas être `"poules"`.
- Le style est entièrement en **objets inline**, alimentés par `THEMES` (`AppShell.jsx`). Un seul thème (`classique`) ; la bascule de thème a été retirée. Icônes Font Awesome 6.5, police Roboto, les deux via CDN.
- Pas d'import/export de données : le seul transport, c'est `localStorage`.
