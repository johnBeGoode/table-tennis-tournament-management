// AppShell — ERTT Tournament App
// Shared layout: sidebar + top bar + content area

// Palette de l'interface, lue par tous les écrans (styles inline).
const THEME = {
  sidebarBg: '#ffffff',
  sidebarBorder: '1px solid #e8eaed',
  sidebarText: '#444',
  sidebarActiveText: '#20bf6b',
  sidebarActiveBg: 'rgba(32,191,107,0.08)',
  topbarBg: '#ffffff',
  topbarBorder: '1px solid #e8eaed',
  pageBg: '#f4f5f7',
  cardBg: '#ffffff',
  cardShadow: '0 1px 4px rgba(0,0,0,0.08)',
  cardRadius: 12,
  primary: '#20bf6b',
  primaryText: '#ffffff',
  btnRadius: 8,
  tableBorder: '#e8eaed',
  tableHeaderBg: '#f8f9fa',
  inputBorder: '#dde1e7',
  inputBg: '#ffffff',
  tagRadius: 6,
  textPrimary: '#1a1d23',
  textSecondary: '#6b7280',
};

const NAV_ITEMS = [
  { id: 'poules',     label: 'Poules',             icon: 'fas fa-layer-group' },
  { id: 'resultats',  label: 'Résultats',           icon: 'fas fa-table-tennis-paddle-ball' },
  { id: 'brackets',   label: 'Classements',         icon: 'fas fa-sitemap' },
  { id: 'qualification', label: 'Informations',     icon: 'fas fa-user-check' },
  { id: 'principal',  label: 'Tableau principal',   icon: 'fas fa-trophy' },
  { id: 'consolante', label: 'Consolante',          icon: 'fas fa-shield-halved' },
];

// Déverrouillage du bouton « Mode test » : 5 clics rapprochés sur le logo de la
// sidebar. Geste introuvable par hasard, qui marche aussi bien au doigt qu'à la
// souris et ne demande ni URL particulière ni console. Refaire le geste recache le
// bouton (et éteint le mode test au passage) ; rien n'est persisté, un rechargement
// de page suffit donc à tout remettre hors de vue.
const UNLOCK_CLICKS = 5;
const UNLOCK_MAX_GAP = 1500;   // ms au-delà desquelles le compteur de clics repart de zéro

const AppShell = ({ screen, onNav, children, onResetAll, onSeedPlayers, testMode, onToggleTestMode }) => {
  const t = THEME;
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [showSeed, setShowSeed] = React.useState(false);   // modale « joueurs de test »
  const [seedCount, setSeedCount] = React.useState('');
  const [testUnlocked, setTestUnlocked] = React.useState(false);   // bouton « Mode test » visible
  const logoClicks = React.useRef({ count: 0, last: 0 });

  const handleLogoClick = () => {
    const now = Date.now();
    const c = logoClicks.current;
    c.count = (now - c.last > UNLOCK_MAX_GAP) ? 1 : c.count + 1;
    c.last = now;
    if (c.count < UNLOCK_CLICKS) return;
    c.count = 0;
    const next = !testUnlocked;
    setTestUnlocked(next);
    if (!next && testMode) onToggleTestMode();   // on recache : le mode test s'éteint avec le bouton
  };

  const submitSeed = () => {
    const n = parseInt(seedCount, 10);
    if (!Number.isFinite(n) || n < 2) return;
    onSeedPlayers(Math.min(n, MAX_TEST_PLAYERS));
    setShowSeed(false);
    setSeedCount('');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Roboto', sans-serif", background: t.pageBg }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: t.sidebarBg,
        borderRight: t.sidebarBorder,
        display: 'flex',
        flexDirection: 'column',
        padding: '0 0 24px',
      }}>
        {/* Logo */}
        <div onClick={handleLogoClick} style={{ padding: '20px 20px 16px', borderBottom: '1px solid #e8eaed', userSelect: 'none' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: t.primary, letterSpacing: '-0.3px' }}>TENNIS DE TABLE</div>
          <div style={{ fontSize: 11, color: t.sidebarText, marginTop: 2, opacity: 0.7, fontWeight: 500, letterSpacing: '.3px' }}>GESTION DE TOURNOI</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 10px' }}>
          {NAV_ITEMS.map(item => {
            const active = screen === item.id;
            return (
              <button key={item.id} onClick={() => onNav(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: active ? t.sidebarActiveBg : 'transparent',
                  color: active ? t.sidebarActiveText : t.sidebarText,
                  fontWeight: active ? 700 : 500,
                  fontSize: 14,
                  marginBottom: 2,
                  transition: 'all .15s ease',
                }}>
                <i className={item.icon} style={{ width: 18, textAlign: 'center', fontSize: 15 }}></i>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Bascule du mode test : allumée, elle fait apparaître les boutons de
            données factices (« Joueurs de test », « Générer les scores »). Le bouton
            lui-même reste caché tant que le logo n'a pas reçu ses 5 clics. */}
        {testUnlocked && (
        <div style={{ padding: '8px 10px 0', display: 'flex', justifyContent: 'center' }}>
          <button onClick={onToggleTestMode}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 20px', borderRadius: 8,
              cursor: 'pointer', textAlign: 'center',
              border: `1.5px solid ${t.primary}`,
              background: testMode ? t.primary : 'transparent',
              color: testMode ? t.primaryText : t.primary,
              fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
            }}>
            {testMode && <i className="fas fa-check" style={{ fontSize: 11 }}></i>}
            Mode test
          </button>
        </div>
        )}

        {/* Génération de joueurs de test — réservée au mode test */}
        {testMode && (
          <div style={{ padding: '8px 10px 0' }}>
            <button onClick={() => setShowSeed(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: 'none', cursor: 'pointer', textAlign: 'left',
                background: 'transparent', color: t.primary,
                fontWeight: 500, fontSize: 14,
              }}>
              <i className="fas fa-user-plus" style={{ width: 18, textAlign: 'center', fontSize: 15 }}></i>
              Joueurs de test
            </button>
          </div>
        )}

        {/* Réinitialisation complète du tournoi */}
        <div style={{ padding: '8px 10px' }}>
          <button onClick={() => setConfirmReset(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '10px 12px', borderRadius: 8,
              border: 'none', cursor: 'pointer', textAlign: 'left',
              background: 'transparent', color: '#f96b6b',
              fontWeight: 500, fontSize: 14,
            }}>
            <i className="fas fa-trash-alt" style={{ width: 18, textAlign: 'center', fontSize: 15 }}></i>
            Réinitialiser
          </button>
        </div>

      </aside>

      {/* Modale confirmation réinitialisation */}
      {confirmReset && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setConfirmReset(false)}>
          <div style={{ background: t.cardBg, borderRadius: 14, padding: '28px 28px 22px', width: 300, boxShadow: '0 16px 48px rgba(0,0,0,0.2)', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="fas fa-trash-alt" style={{ color: '#f96b6b', fontSize: 18 }}></i>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>
              Réinitialiser le tournoi ?
            </div>
            <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 24, lineHeight: 1.5 }}>
              Tous les joueurs et toutes les poules seront définitivement supprimés.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmReset(false)}
                style={{ flex: 1, padding: '10px', borderRadius: t.btnRadius, border: `1.5px solid ${t.tableBorder}`, background: 'transparent', color: t.textSecondary, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={() => { onResetAll(); setConfirmReset(false); }}
                style={{ flex: 1, padding: '10px', borderRadius: t.btnRadius, border: 'none', background: '#f96b6b', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale génération de joueurs de test */}
      {showSeed && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setShowSeed(false)}>
          <div style={{ background: t.cardBg, borderRadius: 14, padding: '28px 28px 22px', width: 300, boxShadow: '0 16px 48px rgba(0,0,0,0.2)', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${t.primary}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="fas fa-user-plus" style={{ color: t.primary, fontSize: 18 }}></i>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>
              Générer des joueurs de test
            </div>
            <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 18, lineHeight: 1.5 }}>
              Remplace les joueurs, les poules et les résultats existants.
            </div>
            <input
              type="number" min={2} max={MAX_TEST_PLAYERS} autoFocus placeholder="Nb de joueurs"
              value={seedCount}
              onChange={e => setSeedCount(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitSeed(); }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: t.btnRadius, border: `1.5px solid ${t.inputBorder}`, background: t.inputBg, color: t.textPrimary, fontSize: 15, fontWeight: 600, textAlign: 'center', marginBottom: 20, fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowSeed(false)}
                style={{ flex: 1, padding: '10px', borderRadius: t.btnRadius, border: `1.5px solid ${t.tableBorder}`, background: 'transparent', color: t.textSecondary, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={submitSeed}
                style={{ flex: 1, padding: '10px', borderRadius: t.btnRadius, border: 'none', background: t.primary, color: t.primaryText, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Générer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          height: 56,
          background: t.topbarBg,
          borderBottom: t.topbarBorder,
          display: 'flex',
          alignItems: 'center',
          padding: '0 28px',
          flexShrink: 0,
        }}>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
            {NAV_ITEMS.find(n => n.id === screen)?.label}
          </h1>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 28 }}>
          {children}
        </main>
      </div>
    </div>
  );
};

// Clé canonique d'un match de poule — toujours le plus petit id de joueur en premier.
// Les sets stockés [s1, s2] sont orientés (lo, hi). Utilisée par tous les écrans,
// pour que la clé ne dépende pas de la position des joueurs dans la poule.
const poolMatchKey = (poolId, idA, idB) => {
  const lo = Math.min(idA, idB);
  const hi = Math.max(idA, idB);
  return `pool-${poolId}-${lo}-${hi}`;
};

// Points-rencontres d'un joueur : 2 par victoire, 1 par défaite. Seul endroit qui les calcule :
// le forfait / l'abandon (0 point) s'y branchera quand les résultats sauront le porter.
const matchPoints = (s) => 2 * s.v + s.d;

// Statistiques des joueurs `ids` d'une poule, sur les seuls matchs dont LES DEUX joueurs sont
// dans `ids` : toute la poule (ids = pool.playerIds) ou le mini-classement d'un groupe d'ex æquo.
// Champs : v/d (victoires/défaites), sf/sa (sets pour/contre), pf/pa (points pour/contre),
// pts (points-rencontres).
const poolStats = (pool, players, results, ids) => {
  const stats = ids.map(id => {
    const name = players.find(p => p.id === id)?.name || '?';
    return { id, name, v: 0, d: 0, sf: 0, sa: 0, pf: 0, pa: 0 };
  });
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const lo = Math.min(ids[i], ids[j]);
      const hi = Math.max(ids[i], ids[j]);
      const r = results[poolMatchKey(pool.id, lo, hi)];
      if (!r) continue;
      let w1 = 0, w2 = 0;
      const si = stats.find(s => s.id === lo);
      const sj = stats.find(s => s.id === hi);
      (r.sets || []).forEach(([s1, s2]) => {
        s1 > s2 ? w1++ : w2++;
        si.pf += s1; si.pa += s2;
        sj.pf += s2; sj.pa += s1;
      });
      if (w1 > w2) { si.v++; sj.d++; } else { sj.v++; si.d++; }
      si.sf += w1; si.sa += w2; sj.sf += w2; sj.sa += w1;
    }
  }
  stats.forEach(s => { s.pts = matchPoints(s); });
  return stats;
};

// Vainqueur du match entre deux joueurs d'une poule, ou null s'il n'est pas encore joué.
const poolMatchWinner = (pool, results, idA, idB) => {
  const r = results[poolMatchKey(pool.id, idA, idB)];
  if (!r) return null;
  const lo = Math.min(idA, idB), hi = Math.max(idA, idB);
  let w1 = 0, w2 = 0;
  (r.sets || []).forEach(([s1, s2]) => { s1 > s2 ? w1++ : w2++; });
  return w1 > w2 ? lo : hi;
};

// Quotient tolérant : pas de perte → Infinity (s'il y a eu un gain), sinon 0.
const ratio = (num, den) => den > 0 ? num / den : (num > 0 ? Infinity : 0);
// Tri décroissant sûr avec Infinity (Infinity − Infinity donnerait NaN).
const descending = (x, y) => x === y ? 0 : (y > x ? 1 : -1);

// Classement d'une poule — source unique pour tous les écrans.
// (1) Total des points-rencontres, décroissant.
// (2) Deux joueurs à égalité : le vainqueur de leur match passe devant.
// (3) Trois joueurs ou plus à égalité : mini-classement sur les SEULS matchs qui les ont opposés
//     entre eux — points-rencontres, puis quotient de manches, puis quotient de points. Le tri
//     lexicographique fait le travail : un critère qui ne départage qu'une partie du groupe laisse
//     les autres au critère suivant, toujours calculé sur les matchs du groupe DE DÉPART — on ne
//     revient jamais à la confrontation directe, même quand il ne reste que deux ex æquo.
// Égalité persistante : tirage au sort, hors scope — l'ordre de la poule est gardé, `tied` le signale.
// Chaque entrée porte les statistiques GLOBALES de la poule (celles qu'on affiche) et `tied`.
const poolStandings = (pool, players, results) => {
  const stats = poolStats(pool, players, results, pool.playerIds);
  stats.forEach(s => { s.tied = false; });
  stats.sort((a, b) => b.pts - a.pts); // tri stable : l'ordre de la poule départage l'égalité complète

  const ranked = [];
  for (let i = 0; i < stats.length; ) {
    let j = i;
    while (j < stats.length && stats[j].pts === stats[i].pts) j++;
    const group = stats.slice(i, j);
    i = j;

    if (group.length === 2) {
      const winner = poolMatchWinner(pool, results, group[0].id, group[1].id);
      if (winner === null) group.forEach(s => { s.tied = true; });
      else if (winner === group[1].id) group.reverse();
    } else if (group.length > 2) {
      const mini = {};
      poolStats(pool, players, results, group.map(s => s.id)).forEach(m => { mini[m.id] = m; });
      const cmp = (a, b) => {
        const x = mini[a.id], y = mini[b.id];
        return descending(x.pts, y.pts)
          || descending(ratio(x.sf, x.sa), ratio(y.sf, y.sa))
          || descending(ratio(x.pf, x.pa), ratio(y.pf, y.pa));
      };
      group.sort(cmp);
      for (let k = 0; k < group.length - 1; k++) {
        if (cmp(group[k], group[k + 1]) === 0) { group[k].tied = true; group[k + 1].tied = true; }
      }
    }
    ranked.push(...group);
  }
  return ranked;
};

// Comparateur transversal inter-poules — Art. II.109 du règlement FFTT.
// Dès qu'on compare des joueurs de poules de tailles différentes (poules de 3 vs 4),
// on ne compare plus des totaux bruts mais des quotients par rencontre jouée : sinon
// un joueur ayant disputé plus de matchs est mécaniquement avantagé. Attendu : {v, d, sf, sa, pf, pa}.
// Ordre des critères : (1) quotient points-rencontre (2 pts/victoire, 1 pt/défaite jouée) / rencontres jouées,
// (2) quotient manches gagnées/perdues, (3) quotient points-jeu gagnés/perdus.
// Ne sert qu'à comparer des joueurs de poules différentes (choix des meilleurs 3es) — le classement
// À L'INTÉRIEUR d'une poule, c'est poolStandings.
const matchPointsCompare = (a, b) => {
  const prA = ratio(2 * a.v + a.d, a.v + a.d);
  const prB = ratio(2 * b.v + b.d, b.v + b.d);
  return prB - prA;
};

const crossPoolCompare = (a, b) => {
  const pr = matchPointsCompare(a, b);
  if (pr !== 0) return pr;
  const setsA = ratio(a.sf, a.sa), setsB = ratio(b.sf, b.sa);
  if (setsA !== setsB) return setsB - setsA;
  const ptsA = ratio(a.pf, a.pa), ptsB = ratio(b.pf, b.pa);
  if (ptsA !== ptsB) return ptsB - ptsA;
  return 0; // égalité persistante — départage par tirage au sort (hors scope du tri auto)
};

// Placement des joueurs dans le pattern quand le tableau n'est pas plein — SOURCE UNIQUE,
// partagée par le tableau principal et la consolante, qui doivent répartir à l'identique.
//
// Règle : ce sont les `byeCount` MEILLEURES TS (les premières de l'onglet Classements /
// Tab principal, donc l'ordre des poules appliqué aux rangs de sortie de poule) qui sont
// exemptées de 1er tour. Les suivantes s'affrontent pour compléter le tour 2, qui retombe
// ainsi sur une puissance de 2.
//
// D'où le point délicat : on vide les PARTENAIRES des slots 1..byeCount, jamais les
// derniers slots du pattern. Sur un tableau de 16 les deux coïncident (toutes les paires
// font 17), ce qui masque le problème ; sur 32 les paires sont 1-28, 2-27, 3-26, 4-25,
// 5-32, 6-31… donc vider 29..32 exempterait TS5 à TS8 en laissant jouer TS1 à TS4.
//
// `numbered` : `[{ poolId, poolRank, seed }]`, seed = numéro de TS (1 = meilleur).
// Renvoie `{ [seed]: slot }`.
const assignBracketSlots = (bracketSize, byeCount, numbered) => {
  const byeSlots = Array.from({ length: byeCount }, (_, i) => i + 1);
  const emptySlots = new Set(byeSlots.map(slot => firstRoundOpponent(bracketSize, slot)));
  const matchSlots = [];
  for (let slot = 1; slot <= bracketSize; slot++) {
    if (slot > byeCount && !emptySlots.has(slot)) matchSlots.push(slot);
  }

  // Affectation par blocs : un bloc ne puise que dans les slots de son groupe (exempté ou
  // joueur), ce qui garantit que les exemptés sont bien les `byeCount` premières TS ; à
  // l'intérieur d'un bloc, assignPartnerSlots éloigne chacun de ses camarades de poule
  // déjà placés. Les rangs faibles exemptés (un 2e de poule exempté, quand il y a plus
  // d'exemptions que de poules) passent EN PREMIER : ils n'ont qu'une poignée de slots
  // possibles, et choisir avant permet ensuite d'éloigner le 1er de leur poule.
  // Sans exemption, byeSlots est vide et l'ordre des blocs redonne exactement le
  // placement canonique (rang 1 → slots 1..n, rang 2 → n+1..2n, rang 3 → 2n+1..B).
  const ranks = [...new Set(numbered.map(e => e.poolRank))].sort((a, b) => a - b);
  const topRank = ranks[0];
  const exempt = (e) => e.seed <= byeCount;
  const blocks = [
    numbered.filter(e => exempt(e) && e.poolRank !== topRank),
    numbered.filter(e => exempt(e) && e.poolRank === topRank),
    ...ranks.map(r => numbered.filter(e => !exempt(e) && e.poolRank === r)),
  ];

  const bucket = { bye: [...byeSlots], match: [...matchSlots] };
  const slotOf = {};
  const anchors = [];
  blocks.forEach(block => {
    if (!block.length) return;
    const slots = (exempt(block[0]) ? bucket.bye : bucket.match).splice(0, block.length);
    const got = assignPartnerSlots(bracketSize, anchors, block, slots);
    block.forEach((e, i) => {
      slotOf[e.seed] = got[i];
      anchors.push({ poolId: e.poolId, slot: got[i] });
    });
  });
  return slotOf;
};

// Structure du tableau principal — source unique. Il n'y a jamais de barrage.
//   B = nextPow2(qualifiés), missing = B − qualifiés
//   missing == 0 → 'direct' : tableau exactement rempli (2, 4, 8, 16 poules)
//   missing == 2 → 'thirds' : il ne manque que 2 joueurs, les 2 MEILLEURS 3es (quotients
//                  inter-poules, crossPoolCompare) complètent le tableau (3, 7, 15 poules)
//   sinon        → 'byes'   : les `missing` places restent vides et les TS dont le voisin
//                  de position est vide sont exemptées de 1er tour (5, 6, 9 à 14 poules)
//
// Le régime NORMAL est 'byes' : les 3es vont en consolante et le 1er tour sert à ramener
// l'effectif à une puissance de 2 pour le tour suivant. Repêcher des 3es est l'EXCEPTION,
// réservée au trou de 2 places — c'est-à-dire aux effectifs en 2^k − 1 poules. Ne pas
// relâcher la condition en `missing <= thirdsCount` : 6 poules (12 qualifiés, tableau de
// 16, 4 places à combler) repêcherait 4 troisièmes au lieu de donner 4 exemptions.
// Le tableau n'est jamais réduit : plus aucun 2e n'est éliminé.
const computeBracketStructure = (autoQualifiers, thirdsCount) => {
  const nextPow2 = (n) => { let b = 1; while (b < n) b *= 2; return b; };
  const base = { thirdsQualified: 0, byeCount: 0 };
  if (!(autoQualifiers >= 2)) return { ...base, bracketSize: 2, mode: 'direct' };   // 0 poule
  const bracketSize = nextPow2(autoQualifiers);
  const missing = bracketSize - autoQualifiers;
  if (missing === 0) return { ...base, bracketSize, mode: 'direct' };
  // Faute de 2 troisièmes à repêcher (poules de 2), on retombe sur les exemptions.
  if (missing === 2 && thirdsCount >= 2) return { ...base, bracketSize, mode: 'thirds', thirdsQualified: 2 };
  return { ...base, bracketSize, mode: 'byes', byeCount: missing };
};

// Accès localStorage tolérant (navigation privée, quota…) : une lecture ratée
// renvoie la valeur par défaut, une écriture ratée est ignorée. Utilisés par App
// (index.html) pour tout l'état du tournoi, et par les écrans pour leurs
// préférences d'affichage (sous-onglet actif, cf. resetTabPreferences).
const loadState = (key, def) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
};
const saveState = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

// Sous-onglets de Résultats et de Classements. La préférence mémorisée sert à
// retrouver le dernier sous-onglet consulté quand on quitte puis revient sur
// l'écran, mais elle ne doit pas survivre au rechargement de la page : au
// démarrage de l'application on repart toujours de « À jouer » et « Poules ».
// D'où cette remise à zéro, appelée une fois au chargement par index.html,
// avant que le moindre écran ne lise sa préférence.
const TAB_PREFERENCE_DEFAULTS = {
  'ertt-results-tab': 'pending',
  'ertt-brackets-tab': 'poules',
};

const resetTabPreferences = () => {
  Object.entries(TAB_PREFERENCE_DEFAULTS).forEach(([key, def]) => saveState(key, def));
};

// Placement manuel de la consolante (drag & drop). Contrairement au reste, cette
// clé est écrite directement par ConsolanteScreen, pas par App : elle doit donc
// être purgée explicitement partout où le tournoi repart de zéro.
// Le suffixe de version est à incrémenter si la règle de placement change
// (buildSeedingPattern ou numérotation des têtes de série de la consolante) : un
// placement construit avec l'ancienne règle serait sinon rechargé tel quel.
const CONSOLANTE_SEEDS_KEY = 'consolante-seeds-v9';

const clearConsolanteSeeds = () => {
  try { localStorage.removeItem(CONSOLANTE_SEEDS_KEY); } catch {}
};

// Placement consolante enregistré, s'il correspond encore à un tableau de `size`
// places ; sinon un tableau vide. Lu par ConsolanteScreen (état initial) et par
// BracketsScreen (classement final), qui ne font que relire ce que le premier écrit.
const loadConsolanteSeeds = (size) => {
  try {
    const saved = localStorage.getItem(CONSOLANTE_SEEDS_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    if (Array.isArray(parsed) && parsed.length === size) return parsed;
  } catch {}
  return Array(size).fill(null);
};

// Placement des têtes de série : numéro de TS à chaque position du tableau, 1-indexé.
// Source unique pour le tableau principal (KnockoutScreen, index.html) et la
// consolante (ConsolanteScreen) — les deux DOIVENT répartir de la même façon.
// Les tables sont la référence, pas une formule : sur 16, chaque paire du 1er tour
// fait bien 17, mais sur 8 elles font 7 ou 11 et sur 32, 29 ou 37 (TS1–TS28, TS5–TS32…).
// Pour connaître l'adversaire d'une TS, lire le pattern (firstRoundOpponent), jamais
// calculer `taille + 1 − seed`. Propriété des tables 8, 16 et 32, exploitée par la
// numérotation en ordre des poules : TS i et TS i + taille/2 sont dans des moitiés
// opposées (le 1er et le 2e d'une même poule ne peuvent se retrouver qu'en finale).
const buildSeedingPattern = (size) => {
  const FFTT = {
    2:  [1,2],
    4:  [1,4,3,2],
    8:  [1,6,7,4,3,8,5,2],
    16: [1,16,11,6,7,10,13,4,3,14,9,8,5,12,15,2],
    32: [1,28,19,10,15,22,29,8,5,32,23,14,11,18,25,4,3,26,17,12,13,24,31,6,7,30,21,16,9,20,27,2],
  };
  if (FFTT[size]) return FFTT[size];
  // Tailles hors tables (64+) : construction récursive, on intercale (taille+1 - seed)
  let order = [1, 2];
  let s = 2;
  while (s < size) {
    const ns = s * 2;
    const next = [];
    order.forEach(v => { next.push(v); next.push(ns + 1 - v); });
    order = next;
    s = ns;
  }
  return order;
};

// Position (0-indexée) de la TS `seed` dans le tableau de taille `size`.
const patternIndex = (size, seed) => buildSeedingPattern(size).indexOf(seed);

// Tour où deux positions du tableau se rencontreraient (1 = 1er tour, log2(taille) =
// finale) : le rang du bit de poids fort de posA XOR posB. Deux positions ne
// diffèrent que par leur dernier bit → même match de 1er tour ; moitiés opposées
// → elles ne se croisent qu'en finale.
const meetingRound = (posA, posB) => Math.floor(Math.log2(posA ^ posB)) + 1;

// Numéro de TS de l'adversaire de 1er tour de `seed` (le voisin de position).
// Seule façon correcte de le connaître : la somme d'une paire ne vaut pas toujours
// taille + 1 (cf. buildSeedingPattern).
const firstRoundOpponent = (size, seed) => {
  const pattern = buildSeedingPattern(size);
  return pattern[pattern.indexOf(seed) ^ 1];
};

// Placement des « partenaires » de poule dans un bloc de seeds. `anchors` = joueurs
// déjà placés [{ poolId, slot }] (slot = numéro de seed dans le pattern), `block` =
// [{ poolId }] dans l'ordre de numérotation, `[from, to]` = seeds du pattern réservés
// au bloc (exactement un par entrée). Renvoie le slot de chaque entrée du bloc.
// Objectif : chaque entrée doit rencontrer les ancres de sa poule le plus tard possible
// (une poule peut avoir plusieurs ancres : son 1er et son 2e quand on place un 3e ; les
// coûts s'additionnent).
// Ce n'est pas un glouton (l'ordre de passage ferait perdre à une poule le dernier
// slot de la bonne moitié) mais une affectation exacte par programmation dynamique
// sur les sous-ensembles de slots (≤ 16 entrées → ≤ 65 536 états). Coût d'une entrée
// ancrée = taille^(finale − tour de rencontre) : une rencontre au 1er tour coûte plus
// que toutes les autres réunies, on minimise donc d'abord le nombre de retrouvailles
// au 1er tour, puis au 2e, etc. Une entrée sans ancre de même poule ne coûte rien.
// À coût égal, le plus petit slot (dans l'ordre des entrées) : quand le tableau est
// plein, les tables 8, 16 et 32 rendent l'identité (2e de la poule i → slot n + i).
// Vérifié pour 2 à 16 poules : toutes les paires 1er/2e ne se croisent qu'en finale.
// Mémo : buildPrincipalSeeds est appelé à chaque rendu par plusieurs écrans, et 16
// entrées ancrées coûtent ~10 ms — les mêmes arguments rendent le même résultat. Il
// faut PLUSIEURS entrées : un même rendu appelle la fonction deux fois (les 2es, puis
// les 3es retenus en mode 'thirds'), et la consolante l'appelle encore pour ses 4es —
// un mémo à une seule entrée manquerait à tous les coups.
const PARTNER_SLOTS_CACHE_MAX = 8;
const partnerSlotsCache = new Map();
const assignPartnerSlots = (size, anchors, block, slots) => {
  const key = JSON.stringify([size, anchors.map(a => [a.poolId, a.slot]), block.map(e => e.poolId), slots]);
  if (partnerSlotsCache.has(key)) return partnerSlotsCache.get(key);
  const value = computePartnerSlots(size, anchors, block, slots);
  // Éviction de la plus ancienne entrée : Map itère dans l'ordre d'insertion.
  if (partnerSlotsCache.size >= PARTNER_SLOTS_CACHE_MAX) partnerSlotsCache.delete(partnerSlotsCache.keys().next().value);
  partnerSlotsCache.set(key, value);
  return value;
};

const computePartnerSlots = (size, anchors, block, slots) => {
  const m = block.length;
  if (m === 0 || slots.length !== m) return block.map((_, i) => slots[i] ?? null);
  const finalRound = Math.round(Math.log2(size));
  const cost = block.map(entry => {
    const mine = anchors.filter(a => a.poolId === entry.poolId);
    if (mine.length === 0) return slots.map(() => 0);
    const anchorPos = mine.map(a => patternIndex(size, a.slot));
    return slots.map(s => anchorPos.reduce((acc, pos) => acc + Math.pow(size, finalRound - meetingRound(pos, patternIndex(size, s))), 0));
  });
  // best[mask] = coût minimal pour placer les entrées restantes (l'entrée courante est
  // popcount(mask)) sur les slots hors mask ; choice[mask] = slot retenu pour elle.
  const best = new Float64Array(1 << m).fill(-1);
  const choice = new Int8Array(1 << m);
  const solve = (mask) => {
    if (best[mask] >= 0) return best[mask];
    let i = 0;
    for (let x = mask; x; x &= x - 1) i++;
    if (i === m) return (best[mask] = 0);
    let bestCost = Infinity, bestSlot = -1;
    for (let j = 0; j < m; j++) {
      if (mask & (1 << j)) continue;
      const c = cost[i][j] + solve(mask | (1 << j));
      if (c < bestCost) { bestCost = c; bestSlot = j; }
    }
    choice[mask] = bestSlot;
    return (best[mask] = bestCost);
  };
  solve(0);
  const out = [];
  let mask = 0;
  for (let i = 0; i < m; i++) { const j = choice[mask]; out.push(slots[j]); mask |= 1 << j; }
  return out;
};

// --- Tableau principal : qualifiés et placement --------------------------------
// Source unique de la composition du tableau principal. Renvoie :
//   seeds    : joueurs dans l'ORDRE DES POSITIONS du tableau (via buildSeedingPattern) ;
//              null = slot vide (bye en mode 'byes')
//   seedList : une entrée par numéro de TS, dans l'ordre : { seed, slot, player, poolId,
//              poolRank (1 | 2 | 3 = meilleur 3e), bye } ; bye = exempté de 1er tour ;
//              slot = numéro de seed du pattern où la TS est placée (= seed sauf pour les
//              2es et 3es d'un tableau non plein, cf. ci-dessous)
//   thirds   : les 3es retenus (mode 'thirds'), dans l'ordre des poules, [{ player, poolId }]
// Numérotation des TS — ORDRE DES POULES dans tous les modes, jamais au mérite (les
// statistiques ne classent qu'à l'intérieur d'une poule) : 1er de A = TS1, 1er de B =
// TS2, …, puis les 2es dans le même ordre (2e de A = TS n+1), puis les meilleurs 3es
// retenus, eux aussi dans l'ordre des poules (TS 2n+1..B). Le mérite inter-poules
// (crossPoolCompare, Art. II.109 FFTT) ne sert qu'à CHOISIR quels 3es sont retenus.
// Placement : les 1ers sont placés à leur numéro. Les 2es occupent les seeds n+1..2n du
// pattern, mais pas forcément à leur numéro : le 1er et le 2e d'une même poule doivent
// se rejouer le plus tard possible (moitiés opposées), ce que assignPartnerSlots
// garantit. Les 3es retenus occupent de même les seeds 2n+1..B, le plus loin possible du
// 1er ET du 2e de leur poule. Tableau plein (4, 8, 16 poules) : slot = numéro.
// Mode 'byes' : les seeds 2n+1..B sont vides, une TS dont le voisin de position est
// vide est exemptée de 1er tour — ce n'est pas « les meilleurs », c'est le pattern.
// Les joueurs renvoyés sont les objets de classement de poule ({ id, name, v, d, sf… }).
const buildPrincipalSeeds = ({ pools, players, results }) => {
  const n = pools.length;
  const standings = pools.map(pool => ({ pool, st: poolStandings(pool, players, results) }));
  // poolStandings ne renvoie pas poolId : on le capture ici.
  const atRank = (rank) => standings
    .map(({ pool, st }) => (st[rank] ? { player: st[rank], poolId: pool.id } : null))
    .filter(Boolean);
  const firstEntries = atRank(0), secondEntries = atRank(1), thirdEntries = atRank(2);

  const struct = computeBracketStructure(n * 2, thirdEntries.length);
  const bracketSize = struct.bracketSize;

  // Meilleurs 3es (mode 'thirds') : choisis au mérite inter-poules, puis remis dans
  // l'ordre des poules pour la numérotation.
  const poolIndex = {};
  pools.forEach((pool, i) => { poolIndex[pool.id] = i; });
  const thirds = struct.mode === 'thirds'
    ? [...thirdEntries].sort((a, b) => crossPoolCompare(a.player, b.player)).slice(0, struct.thirdsQualified)
        .sort((a, b) => poolIndex[a.poolId] - poolIndex[b.poolId])
    : [];

  // Numérotation (ordre des poules) : numéro de TS → { player, poolId, poolRank, slot }
  // Les numéros de TS ne dépendent que du rang en poule et de l'ordre des poules ; le
  // placement (slot) est un second temps, contraint par les exemptions.
  const numbered = [
    ...firstEntries.map((e, i) => ({ ...e, poolRank: 1, seed: i + 1 })),
    ...secondEntries.map((e, i) => ({ ...e, poolRank: 2, seed: n + i + 1 })),
    ...thirds.map((e, i) => ({ ...e, poolRank: 3, seed: n + secondEntries.length + i + 1 })),
  ];

  const slotOf = assignBracketSlots(bracketSize, struct.byeCount, numbered);
  const seedMap = {};
  numbered.forEach(e => { seedMap[e.seed] = { ...e, slot: slotOf[e.seed] }; });

  // Placement : seed du pattern → entrée
  const slotMap = {};
  Object.values(seedMap).forEach(e => { slotMap[e.slot] = e; });

  const qualifiedCount = n + secondEntries.length + thirds.length;
  const seedList = Array.from({ length: qualifiedCount }, (_, i) => {
    const seed = i + 1, e = seedMap[seed];
    const slot = e?.slot ?? seed;
    return {
      seed,
      slot,
      player: e?.player || null,
      poolId: e?.poolId ?? null,
      poolRank: e?.poolRank ?? 3,
      // Exempté : en mode byes, le voisin de position dans le pattern est vide.
      bye: struct.mode === 'byes' && !slotMap[firstRoundOpponent(bracketSize, slot)],
    };
  });

  const seeds = buildSeedingPattern(bracketSize).map(seedNum => slotMap[seedNum]?.player || null);
  return { struct, bracketSize, seeds, seedList, thirds };
};

// --- Consolante : éligibles et numérotation -------------------------------------
// Source unique de la composition de la consolante, partagée par ConsolanteScreen et
// BracketsScreen (classement final). Éligibles : les 3es NON retenus dans le tableau
// principal (mode 'thirds', cf. buildPrincipalSeeds().thirds) et tous les 4es.
// Numérotation — même règle que le principal : le RANG dans la poule puis l'ORDRE DES
// POULES, jamais les statistiques. Tous les 3es d'abord (3e de A = TS 1, 3e de B = TS 2,
// …), puis tous les 4es dans ce même ordre (4e de A = TS a+1).
// Renvoie [{ player, poolId, poolRank: 3 | 4, label, seed }], vide tant qu'aucun match de
// poule n'est joué.
const buildConsolanteEntries = ({ pools, players, results }) => {
  if (!Object.keys(results || {}).some(k => k.startsWith('pool-'))) return [];
  const retained = new Set(buildPrincipalSeeds({ pools, players, results }).thirds.map(e => e.player.id));
  const standings = pools.map(pool => ({ pool, st: poolStandings(pool, players, results) }));
  const atRank = (rank) => standings
    .map(({ pool, st }) => {
      const p = st[rank];
      if (!p || retained.has(p.id)) return null;
      return { player: p, poolId: pool.id, poolRank: rank + 1, label: `${rank + 1}e (${poolShortLabel(pool)})` };
    })
    .filter(Boolean);
  return [...atRank(2), ...atRank(3)].map((e, i) => ({ ...e, seed: i + 1 }));
};

// --- Classement intégral (feuilles FFTT « KO Clt Int ») --------------------------
// Règle unique, appliquée récursivement : à chaque tour, les vainqueurs continuent dans
// leur sous-tableau, les perdants tombent dans un sous-tableau parallèle qui joue la
// moitié basse des places. Sur 16 : 32 matchs, 4 par joueur, places 1 à 16 attribuées.
// Chaque colonne (= tour) contient exactement N/2 matchs, tout le monde jouant à chaque tour.
//
// Ids de match — rétrocompatibles avec l'élimination directe d'avant :
//   `{prefix}-r{round}-{n}`               épine principale (places 1..), inchangé
//   `{prefix}-3rd`                        3e place (perdants des demies), inchangé
//   `{prefix}-p{place}-r{round}-{n}`      sous-tableaux de classement (nouveau)
// `round` est l'index GLOBAL du tour : même `r` = même colonne.
//
// Options : { byes: true } — un slot vide du 1er tour est un bye STRUCTUREL : il ne
// sera jamais rempli, l'adversaire passe d'office et le bye se propage dans la branche
// des perdants (bye contre bye = bye, les places du bas restent vides). Utilisé par la
// consolante (jamais pleine) et par le tableau principal en mode 'byes' (exemptés).
// Sans cette option, un slot vide n'avance pas (tableau incomplet : une poule sans
// assez de joueurs, par exemple).
//
// Renvoie { groups, places, totalRounds, descendants } :
//   groups      : [{ key, startPlace, endPlace, size, round, matches: [{ id, p1, p2, bye1, bye2 }] }]
//                 p1/p2 = joueur ou null ; bye1/bye2 = ce slot est un bye (jamais rempli)
//   places      : { [place]: joueur } — le classement final, rempli au fil des résultats
//   descendants : { [matchId]: [ids en aval] } — pour purger en cascade un résultat effacé
const integralMatchId = (prefix, startPlace, size, round, idx) => {
  if (startPlace === 1) return `${prefix}-r${round}-${idx}`;
  if (startPlace === 3 && size === 2) return `${prefix}-3rd`;
  return `${prefix}-p${startPlace}-r${round}-${idx}`;
};

const BYE = Object.freeze({ bye: true });

const buildIntegralBracket = (seeds, prefix, bracketResults, options = {}) => {
  const groups = [];
  const places = {};
  const descendants = {};
  const res = bracketResults || {};
  const isBye = (v) => v === BYE;

  const resolve = (m, role) => {
    const r = res[m.id];
    if (r) {
      const winner = r.winner === 1 ? r.p1 : r.p2;
      const loser  = r.winner === 1 ? r.p2 : r.p1;
      return role === 'winner' ? winner : loser;
    }
    const s1 = m.bye1 ? BYE : m.p1, s2 = m.bye2 ? BYE : m.p2;
    if (isBye(s1) && isBye(s2)) return BYE;
    // Face à un bye, le perdant est TOUJOURS un bye, même si l'adversaire n'est pas
    // encore connu : la branche des perdants est ainsi figée dès la construction et le
    // nombre de matchs jouables ne bouge pas au fil des résultats.
    if (isBye(s1)) return role === 'winner' ? (s2 || null) : BYE;
    if (isBye(s2)) return role === 'winner' ? (s1 || null) : BYE;
    return null;   // adversaire en attente (ou match non joué)
  };

  // Renvoie le nœud { matches, winners, losers } du sous-tableau (arbre des tours)
  const walk = (slots, startPlace, round) => {
    const size = slots.length;
    if (size === 1) { if (slots[0] && !isBye(slots[0])) places[startPlace] = slots[0]; return null; }
    const matches = [];
    for (let i = 0; i < size / 2; i++) {
      const a = slots[2 * i], b = slots[2 * i + 1];
      matches.push({
        id: integralMatchId(prefix, startPlace, size, round, i + 1),
        p1: isBye(a) ? null : a, p2: isBye(b) ? null : b,
        bye1: isBye(a), bye2: isBye(b),
      });
    }
    groups.push({ key: `p${startPlace}-r${round}`, startPlace, endPlace: startPlace + size - 1, size, round, matches });
    return {
      matches,
      winners: walk(matches.map(m => resolve(m, 'winner')), startPlace,            round + 1),
      losers:  walk(matches.map(m => resolve(m, 'loser')),  startPlace + size / 2, round + 1),
    };
  };

  const root = walk(options.byes ? seeds.map(p => p || BYE) : seeds, 1, 1);

  // Dépendance réelle, pas « tout le tour suivant » : le match i d'un tour n'alimente
  // que le match ⌊i/2⌋ de chacune des deux branches (vainqueurs et perdants).
  const collect = (node, i, out) => {
    [node.winners, node.losers].forEach(child => {
      if (!child) return;
      const j = Math.floor(i / 2);
      out.push(child.matches[j].id);
      collect(child, j, out);
    });
    return out;
  };
  const fill = (node) => {
    if (!node) return;
    node.matches.forEach((m, i) => { descendants[m.id] = collect(node, i, []); });
    fill(node.winners);
    fill(node.losers);
  };
  fill(root);
  return { groups, places, totalRounds: Math.round(Math.log2(seeds.length)), descendants };
};

// Intitulé d'un sous-tableau de classement. L'épine principale (startPlace 1) au-delà
// de la finale prend le nom du tour (« Quarts de finale »…), pas cet intitulé.
const placementLabel = ({ startPlace, endPlace, size }) => {
  if (size === 2) {
    if (startPlace === 1) return 'Finale';
    return `Places ${startPlace}e/${endPlace}e`;   // y compris la 3e place : « Places 3e/4e »
  }
  return `Places ${startPlace} à ${endPlace}`;
};

// Étiquette courte d'une poule, dérivée de son VRAI nom (« Poule A » → « A »).
// Remplace l'ancien étiquetage par index, qui divergeait après renommage/suppression.
const poolShortLabel = (pool) => ((pool.name || '').replace(/^poule\s*/i, '').trim() || pool.name || '?');

// --- Données de test ---------------------------------------------------------
// Prénoms piochés pour les joueurs générés depuis la sidebar.
const TEST_FIRST_NAMES = [
  'Antoine', 'Baptiste', 'Camille', 'Chloé', 'Clément', 'Damien', 'Élodie', 'Émilie',
  'Fabien', 'Florian', 'Gaëlle', 'Guillaume', 'Hugo', 'Inès', 'Jérôme', 'Julien',
  'Karim', 'Laura', 'Léa', 'Loïc', 'Lucas', 'Manon', 'Mathieu', 'Maxime',
  'Mehdi', 'Nathan', 'Nicolas', 'Noémie', 'Olivier', 'Pauline', 'Quentin', 'Romain',
  'Sarah', 'Sébastien', 'Sofiane', 'Thomas', 'Valentin', 'Vincent', 'Yanis', 'Zoé',
];

const MAX_TEST_PLAYERS = 128;

// Plancher de classement : un joueur loisir / non classé compte pour 500 points,
// le plus bas classement FFTT. Personne n'est donc « sans points » — ni à la saisie,
// ni à l'import CSV, ni dans les joueurs de test.
const MIN_RANKING = 500;
const normalizeRanking = (value) => {
  const n = typeof value === 'number' ? value : parseInt(value, 10);
  return Number.isFinite(n) ? Math.max(MIN_RANKING, n) : MIN_RANKING;
};

// Génère `count` joueurs de test : prénoms distincts (tirés sans remise, puis
// suffixés « Julien 2 » au-delà de la liste) et points FFTT plausibles, jamais
// en dessous du plancher de 500.
const randomPlayers = (count) => {
  const n = Math.max(1, Math.min(Math.floor(count) || 0, MAX_TEST_PLAYERS));
  const names = [...TEST_FIRST_NAMES];
  for (let i = names.length - 1; i > 0; i--) {          // mélange de Fisher-Yates
    const j = Math.floor(Math.random() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  // Un seul appel à Date.now() : dans la boucle, tous les joueurs partageraient le même id.
  const base = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const lap = Math.floor(i / names.length);
    const first = names[i % names.length];
    return {
      id: base + i,
      name: lap === 0 ? first : `${first} ${lap + 1}`,
      ranking: normalizeRanking(Math.round((MIN_RANKING + Math.random() * 1500) / 5) * 5),
    };
  });
};

// ─── Import CSV de joueurs ──────────────────────────────────────────────────
// **Deux données par ligne, et deux seulement : le nom (nom, prénom ou les deux)
// et le classement** — « Dupont Jean;1245 ». Rien d'autre n'est attendu : ni n°
// de licence, ni club, ni catégorie.
// La mise en forme, elle, reste tolérante (les fichiers sortent d'Excel) :
//   • séparateur deviné parmi `;`, `,` et la tabulation (le point-virgule des
//     Excel français en cas d'égalité) ;
//   • en-tête optionnel — une première ligne de libellés sans aucune valeur
//     numérique — reconnu et ignoré ;
//   • guillemets RFC 4180 : `""` pour un guillemet littéral, séparateur et
//     saut de ligne autorisés à l'intérieur ;
//   • BOM, CRLF, espaces parasites et séparateurs en trop en fin de ligne.
// Lecture d'une ligne, **par position** : la **dernière** cellule est le
// classement dès qu'elle en a l'air (nombre, marqueur « NC », ou rien qui
// ressemble à un mot) ; tout le reste forme le nom. Une dernière cellule qui est
// visiblement un mot est donc rattachée au nom plutôt que perdue — « Dupont;Jean »
// donne « Dupont Jean » à 500, pas « Dupont » tout court. Un classement absent,
// illisible ou hors de portée (> CSV_MAX_RANKING : faute de frappe, n° de licence)
// retombe sur le plancher via `normalizeRanking` — jamais d'erreur, la valeur
// retenue est montrée dans l'aperçu avant import. Les lignes sans nom sont
// rejetées dans `ignored` : à charge de l'écran de les montrer, jamais de les
// perdre en silence.
const CSV_MAX_RANKING = 9999;      // borne de plausibilité d'un classement FFTT
const CSV_DELIMITERS = [';', ',', '\t'];
const CSV_HEADER_WORDS = /^(nom|noms|name|names|joueur|joueuse|joueurs|player|players|prénom|prenom|prénoms|prenoms|classement|classements|points|pts|rang|rank|ranking|licence|license|club|catégorie|categorie)$/i;

// Un nombre entier ou décimal (virgule ou point), seul dans sa cellule.
const CSV_NUMBER = /^-?\d+(?:[.,]\d+)?$/;
const csvCellNumber = (cell) => {
  const s = String(cell).trim();
  if (!CSV_NUMBER.test(s)) return null;
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

// « Pas de classement », tel que les clubs l'écrivent dans la colonne points.
const CSV_NO_RANKING = /^(nc|n\.?c\.?|non[\s-]?class[ée]e?s?|loisir|d[ée]butant)$/i;

// La dernière cellule est-elle un classement ? Un nombre, un marqueur « NC », ou
// quelque chose sans la moindre lettre (« - », « ? », vide) : oui. Un mot : non,
// c'est une part du nom (« Dupont;Jean »), et le joueur sera compté à 500.
const csvIsRankingCell = (cell) => {
  const s = String(cell).trim();
  return csvCellNumber(s) !== null || CSV_NO_RANKING.test(s) || !/\p{L}/u.test(s);
};

// Séparateur le plus fréquent sur les premières lignes non vides. Un séparateur
// à l'intérieur de guillemets fausse un peu le compte : sans conséquence, il
// faudrait qu'il soit plus fréquent que le vrai séparateur pour l'emporter.
const detectCsvDelimiter = (text) => {
  const sample = text.split(/\r?\n/).filter(l => l.trim()).slice(0, 5).join('\n');
  let best = ';', bestCount = 0;
  CSV_DELIMITERS.forEach(d => {
    const count = sample.split(d).length - 1;
    if (count > bestCount) { best = d; bestCount = count; }
  });
  return best;
};

// Découpe le texte en lignes de cellules. Automate à deux états (dans / hors
// guillemets) : c'est le seul moyen de gérer un séparateur ou un saut de ligne
// à l'intérieur d'un champ cité, qu'un `split` manquerait.
const parseCsvRows = (text, delimiter) => {
  const src = String(text).replace(/^﻿/, '');   // BOM des exports Excel
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c !== '"') { cell += c; continue; }
      if (src[i + 1] === '"') { cell += '"'; i++; continue; } // `""` littéral
      quoted = false;
      continue;
    }
    if (c === '"' && cell.trim() === '') { quoted = true; cell = ''; continue; }
    if (c === delimiter) { row.push(cell); cell = ''; continue; }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
      continue;
    }
    cell += c;
  }
  row.push(cell);
  rows.push(row);
  return rows;
};

// En-tête : au moins un libellé connu et aucune valeur numérique. Sans la
// seconde condition, une ligne « Points;1245 » (un joueur nommé « Points »…)
// ou un fichier dont la première colonne s'appelle comme un joueur passerait.
const isCsvHeaderRow = (row) =>
  row.some(c => CSV_HEADER_WORDS.test(String(c).trim())) &&
  !row.some(c => csvCellNumber(c) !== null);

// Un CSV est un fichier **texte**. Les signatures ci-dessous repèrent les
// fichiers qui n'en sont pas mais en portent l'extension — le cas courant étant
// le document TextEdit laissé en texte enrichi, que macOS enregistre en RTF sans
// broncher quand on le nomme « .csv ». Sans ce garde-fou, la lecture réussit et
// produit des joueurs nommés « {\rtf1\ansi… » : mieux vaut un refus explicite.
const CSV_NOT_TEXT = [
  { code: 'rtf', test: /^\s*\{\\rtf/ },            // TextEdit en texte enrichi
  { code: 'zip', test: /^PK\x03\x04/ },             // .xlsx, .numbers, .ods renommé
  { code: 'pdf', test: /^\s*%PDF-/ },
];

// `text` (contenu brut du fichier) → `{ players: [{ name, ranking, line }],
// ignored: [{ line, raw }], error }`. `error` (code de `CSV_NOT_TEXT`) signale un
// fichier qui n'est pas du texte : la liste est alors vide, à l'écran d'expliquer.
// Ne crée aucun id : c'est l'appelant qui les attribue (un seul `Date.now()`,
// cf. le piège des ids dupliqués).
const parsePlayersCsv = (text) => {
  const head = String(text || '').slice(0, 64);
  const notText = CSV_NOT_TEXT.find(f => f.test.test(head));
  if (notText) return { players: [], ignored: [], error: notText.code };
  const delimiter = detectCsvDelimiter(text || '');
  const rows = parseCsvRows(text || '', delimiter);
  const players = [], ignored = [];
  rows.forEach((row, i) => {
    const line = i + 1;
    if (row.every(c => !String(c).trim())) return;            // ligne vide
    if (i === 0 && isCsvHeaderRow(row)) return;               // en-tête
    const cells = row.map(c => String(c).trim());
    const raw = cells.join(delimiter === '\t' ? ' ' : delimiter);
    // Séparateurs en trop en fin de ligne (« Dupont;1245;; ») : sans ce nettoyage,
    // la cellule vide finale passerait pour le classement et « 1245 » pour le nom.
    while (cells.length > 1 && !cells[cells.length - 1]) cells.pop();
    const rankingCell = cells.length > 1 && csvIsRankingCell(cells[cells.length - 1])
      ? cells.pop()
      : null;
    const name = cells.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    // Sans la moindre lettre, ce n'est pas un nom : ligne de total, colonne isolée…
    if (!/\p{L}/u.test(name)) { ignored.push({ line, raw }); return; }
    const n = rankingCell === null ? null : csvCellNumber(rankingCell);
    players.push({
      name,
      ranking: normalizeRanking(n !== null && n > 0 && n <= CSV_MAX_RANKING ? Math.round(n) : null),
      line,
    });
  });
  return { players, ignored, error: null };
};

// ─── Attribution des tables ─────────────────────────────────────────────────
// TABLE_COUNT tables numérotées de 1 à TABLE_COUNT, **partagées par le tableau
// principal ET la consolante** : ce sont les mêmes tables physiques, une table
// occupée d'un côté ne doit pas être proposée de l'autre. D'où un état unique
// dans `App` (clé `ertt-tables`, `{ [matchId]: table }`), descendu aux deux
// écrans — les ids de match portent leur préfixe (`principal-…`, `consolante-…`),
// ils ne peuvent pas se télescoper.
// Une table se libère **toute seule dès qu'un score est saisi** : le match est
// terminé, il rend sa table (effet de purge dans `App`). Il n'y a donc jamais à
// « rendre » une table à la main.
const TABLE_COUNT = 16;

// Bleu « match en cours » : attribuer une table, c'est dire que le match est lancé
// (ou sur le point de l'être). La carte prend ce bleu en fond léger et la case de
// table la même couleur — un seul signal, lu d'un coup d'œil. C'est un **état du
// match**, pas une couleur d'écran : il est identique dans les deux tableaux, là où
// le vert du principal et l'orange de la consolante restent les accents d'écran.
const LIVE_MATCH_COLOR = '#3b9ae1';

// Numéros proposés dans la liste d'un match : ceux que personne n'occupe, plus
// celui du match lui-même — sans quoi sa propre table disparaîtrait de sa liste
// et le `<select>` afficherait une valeur absente de ses options.
const availableTables = (tables, matchId) => {
  const taken = new Set(Object.entries(tables || {})
    .filter(([id]) => id !== matchId)
    .map(([, n]) => n));
  return Array.from({ length: TABLE_COUNT }, (_, i) => i + 1).filter(n => !taken.has(n));
};

// Attributions orphelines : le tableau a changé de forme (poules retouchées,
// placement consolante refait) et des ids de match n'existent plus. Sans ce
// ménage, leur table resterait occupée par un match qui ne s'affiche nulle part.
// Chaque écran ne nettoie **que son propre préfixe** : il ne connaît pas les
// matchs de l'autre tableau. Renvoie `tables` inchangé s'il n'y a rien à jeter,
// pour que le `setState` de l'appelant ne provoque pas de rendu.
const pruneTables = (tables, prefix, validIds) => {
  const valid = validIds instanceof Set ? validIds : new Set(validIds);
  const stale = Object.keys(tables || {}).filter(id => id.startsWith(`${prefix}-`) && !valid.has(id));
  if (stale.length === 0) return tables;
  const next = { ...tables };
  stale.forEach(id => { delete next[id]; });
  return next;
};

// Badge « en cours », posé à gauche du filet séparateur, en face de la case de
// table. Il vit **dans le flux**, dans la ligne qui existe déjà : sa hauteur
// (fontSize 8 + 1px de padding, ~13px) reste sous celle de la case (18px), donc
// la carte ne change pas de taille — c'était la contrainte. Pas d'en-tête ajouté
// (un match en cours n'en a pas toujours un) ni de badge en position absolue
// (il passerait sur les noms longs).
const LiveMatchBadge = () => (
  <span style={{
    fontSize: 8, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase',
    color: LIVE_MATCH_COLOR, background: `${LIVE_MATCH_COLOR}1f`,
    border: `1px solid ${LIVE_MATCH_COLOR}55`, borderRadius: 4,
    padding: '1px 5px', whiteSpace: 'nowrap', flexShrink: 0, lineHeight: 1.4,
  }}>En cours</span>
);

// La case entre les deux joueurs d'une carte de match : la liste des tables
// encore libres. **Source unique**, rendue par le tableau principal comme par la
// consolante — les deux doivent se comporter à l'identique.
// `active` (match jouable et sans résultat) : la liste des tables libres. Sinon
// (slot vide, exempté, match d'un tour à venir) : une case vide de mêmes
// dimensions, pour garder les cartes en attente alignées.
// Le cas « score saisi » ne passe pas par ici : les écrans retirent alors toute
// la ligne, filet compris — le match est terminé, il n'a plus de table.
const TableSelect = ({ t, tables, matchId, active, onUpdateTables }) => {
  const box = { width: 38, height: 18, borderRadius: 4, flexShrink: 0 };
  if (!active) return <div style={{ ...box, border: `1px solid ${t.tableBorder}`, background: t.pageBg }}></div>;
  const value = tables?.[matchId] ?? '';
  const assigned = value !== '';
  return (
    <select
      value={value}
      title={assigned ? `Table ${value} — sera libérée à la saisie du score` : 'Attribuer une table'}
      // Toute la carte ouvre la saisie du score : sans ce stopPropagation, dérouler
      // la liste ouvrirait la modale par-dessus.
      onClick={e => e.stopPropagation()}
      onChange={e => {
        e.stopPropagation();
        const n = parseInt(e.target.value, 10);
        onUpdateTables(prev => {
          const next = { ...prev };
          if (Number.isFinite(n)) next[matchId] = n; else delete next[matchId];
          return next;
        });
      }}
      style={{
        ...box,
        appearance: 'none', WebkitAppearance: 'none',
        border: `1px solid ${assigned ? LIVE_MATCH_COLOR : t.tableBorder}`,
        background: assigned ? `${LIVE_MATCH_COLOR}18` : t.pageBg,
        color: assigned ? LIVE_MATCH_COLOR : t.textSecondary,
        fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
        textAlign: 'center', textAlignLast: 'center',
        padding: 0, cursor: 'pointer', outline: 'none',
      }}>
      {/* Entrée vide (et non « — ») : la case doit rester vide tant qu'aucune table
          n'est attribuée. Elle sert aussi à libérer une table à la main, avant que
          le score ne le fasse tout seul. */}
      <option value=""></option>
      {availableTables(tables, matchId).map(n => <option key={n} value={n}>{n}</option>)}
    </select>
  );
};

Object.assign(window, { AppShell, THEME, loadState, saveState, resetTabPreferences, poolMatchKey, poolStandings, crossPoolCompare, computeBracketStructure, buildSeedingPattern, patternIndex, meetingRound, firstRoundOpponent, assignPartnerSlots, assignBracketSlots, buildPrincipalSeeds, buildConsolanteEntries, buildIntegralBracket, placementLabel, CONSOLANTE_SEEDS_KEY, clearConsolanteSeeds, loadConsolanteSeeds, poolShortLabel, randomPlayers, MIN_RANKING, normalizeRanking, parsePlayersCsv, TABLE_COUNT, LIVE_MATCH_COLOR, availableTables, pruneTables, TableSelect, LiveMatchBadge });
