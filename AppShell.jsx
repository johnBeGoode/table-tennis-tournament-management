// AppShell — ERTT Tournament App
// Shared layout: sidebar + top bar + content area

const THEMES = {
  classique: {
    name: 'Classique',
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
    primaryDark: '#17a35a',
    primaryText: '#ffffff',
    btnRadius: 8,
    tableBorder: '#e8eaed',
    tableHeaderBg: '#f8f9fa',
    inputBorder: '#dde1e7',
    inputBg: '#ffffff',
    tagRadius: 6,
    textPrimary: '#1a1d23',
    textSecondary: '#6b7280',
    divider: '#e8eaed',
  },
};

const NAV_ITEMS = [
  { id: 'poules',     label: 'Poules',             icon: 'fas fa-layer-group' },
  { id: 'resultats',  label: 'Résultats',           icon: 'fas fa-table-tennis-paddle-ball' },
  { id: 'brackets',   label: 'Classements',         icon: 'fas fa-sitemap' },
  { id: 'barrage',    label: 'Barrages',            icon: 'fas fa-code-branch' },
  { id: 'principal',  label: 'Tableau principal',   icon: 'fas fa-trophy' },
  { id: 'consolante', label: 'Consolante',          icon: 'fas fa-shield-halved' },
];

const AppShell = ({ theme, screen, onNav, children, tournamentName, onResetAll, onSeedPlayers }) => {
  const t = THEMES[theme];
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [showSeed, setShowSeed] = React.useState(false);   // modale « joueurs de test »
  const [seedCount, setSeedCount] = React.useState('');

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
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #e8eaed' }}>
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

        {/* Génération de joueurs de test */}
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
          justifyContent: 'space-between',
          padding: '0 28px',
          flexShrink: 0,
        }}>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
            {NAV_ITEMS.find(n => n.id === screen)?.label}
          </h1>
          <div></div>
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

// Classement d'une poule — source unique pour tous les écrans.
// Champs : v/d (victoires/défaites), sf/sa (sets pour/contre), pf/pa (points pour/contre).
const poolStandings = (pool, players, results) => {
  const stats = pool.playerIds.map(id => {
    const name = players.find(p => p.id === id)?.name || '?';
    return { id, name, v: 0, d: 0, sf: 0, sa: 0, pf: 0, pa: 0 };
  });
  for (let i = 0; i < pool.playerIds.length; i++) {
    for (let j = i + 1; j < pool.playerIds.length; j++) {
      const lo = Math.min(pool.playerIds[i], pool.playerIds[j]);
      const hi = Math.max(pool.playerIds[i], pool.playerIds[j]);
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
  // Départage à égalité : les mêmes quotients que l'inter-poules (Art. II.109 FFTT),
  // et non des différences brutes — un joueur qui perd 3-0 puis gagne 3-2 et un joueur
  // qui perd 3-2 puis gagne 3-0 ont la même différence de manches mais pas le même quotient.
  return stats.sort(crossPoolCompare);
};

// Comparateur transversal inter-poules — Art. II.109 du règlement FFTT.
// Dès qu'on compare des joueurs de poules de tailles différentes (poules de 3 vs 4),
// on ne compare plus des totaux bruts mais des quotients par rencontre jouée : sinon
// un joueur ayant disputé plus de matchs est mécaniquement avantagé. Attendu : {v, d, sf, sa, pf, pa}.
// Ordre des critères : (1) quotient points-rencontre (2 pts/victoire, 1 pt/défaite jouée) / rencontres jouées,
// (2) quotient manches gagnées/perdues, (3) quotient points-jeu gagnés/perdus.
const ratio = (num, den) => den > 0 ? num / den : (num > 0 ? Infinity : 0);
const crossPoolCompare = (a, b) => {
  const playedA = a.v + a.d, playedB = b.v + b.d;
  const prA = ratio(2 * a.v + a.d, playedA);
  const prB = ratio(2 * b.v + b.d, playedB);
  if (prA !== prB) return prB - prA;
  const setsA = ratio(a.sf, a.sa), setsB = ratio(b.sf, b.sa);
  if (setsA !== setsB) return setsB - setsA;
  const ptsA = ratio(a.pf, a.pa), ptsB = ratio(b.pf, b.pa);
  if (ptsA !== ptsB) return ptsB - ptsA;
  return 0; // égalité persistante — départage par tirage au sort (hors scope du tri auto)
};

// Structure du tableau principal — source unique (anciennement dupliquée dans 4 fichiers).
// Essaye les puissances de 2 en descendant depuis nextPow2(qualifiés) :
//   missing == 0           → tableau direct
//   missing*2 <= nb de 3es → organiser `missing` barrages (chaque barrage consomme 2 troisièmes)
//   missing < 0            → éliminer |missing| moins bons 2es
//   missing*2 > nb de 3es  → essayer la taille inférieure
const computeBracketStructure = (autoQualifiers, thirdsCount) => {
  const nextPow2 = (n) => { let b = 1; while (b < n) b *= 2; return b; };
  let size = nextPow2(autoQualifiers);
  while (size >= 2) {
    const missing = size - autoQualifiers;
    if (missing === 0) return { bracketSize: size, mode: 'direct', barrageCount: 0, eliminateCount: 0 };
    if (missing > 0 && missing * 2 <= thirdsCount) return { bracketSize: size, mode: 'barrage', barrageCount: missing, eliminateCount: 0 };
    if (missing < 0) return { bracketSize: size, mode: 'eliminate', barrageCount: 0, eliminateCount: -missing };
    size = size / 2;
  }
  return { bracketSize: 2, mode: 'direct', barrageCount: 0, eliminateCount: 0 };
};

// Placement manuel de la consolante (drag & drop). Contrairement au reste, cette
// clé est écrite directement par ConsolanteScreen, pas par App : elle doit donc
// être purgée explicitement partout où le tournoi repart de zéro.
// Le suffixe de version est incrémenté dès que le placement change — que ce soit
// buildSeedingPattern ou la numérotation des têtes de série de la consolante : un
// placement construit avec l'ancienne règle doit être jeté, pas rechargé.
const CONSOLANTE_SEEDS_KEY = 'consolante-seeds-v3';
const CONSOLANTE_SEEDS_LEGACY_KEYS = ['consolante-seeds', 'consolante-seeds-v2'];

const clearConsolanteSeeds = () => {
  try {
    [CONSOLANTE_SEEDS_KEY, ...CONSOLANTE_SEEDS_LEGACY_KEYS].forEach(k => localStorage.removeItem(k));
  } catch {}
};

// Placement standard FFTT : numéro de tête de série à chaque position du tableau,
// 1-indexé. Source unique pour le tableau principal (KnockoutScreen, index.html) et
// la consolante (ConsolanteScreen) — les deux DOIVENT répartir de la même façon.
// Invariant : dans chaque paire du 1er tour, la somme des seeds vaut size + 1
// (TS1 vs TSN, TS2 vs TSN-1, …), et l'invariant se propage à chaque tour.
const buildSeedingPattern = (size) => {
  const FFTT = {
    2:  [1,2],
    4:  [1,4,3,2],
    8:  [1,8,5,4,3,6,7,2],
    16: [1,16,9,8,5,12,13,4,3,14,11,6,7,10,15,2],
    32: [1,32,17,16,9,24,25,8,5,28,21,12,13,20,29,4,3,30,19,14,11,22,27,6,7,26,23,10,15,18,31,2],
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
// ni dans les joueurs de test, ni dans les tournois déjà enregistrés (migration
// au chargement dans `App`).
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

Object.assign(window, { AppShell, THEMES, poolMatchKey, poolStandings, crossPoolCompare, computeBracketStructure, buildSeedingPattern, CONSOLANTE_SEEDS_KEY, CONSOLANTE_SEEDS_LEGACY_KEYS, clearConsolanteSeeds, poolShortLabel, randomPlayers, MIN_RANKING, normalizeRanking });
