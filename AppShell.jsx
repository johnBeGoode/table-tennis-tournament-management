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

const AppShell = ({ theme, screen, onNav, children, tournamentName }) => {
  const t = THEMES[theme];

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


      </aside>

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
  return stats.sort((a, b) => b.v - a.v || (b.sf - b.sa) - (a.sf - a.sa) || (b.pf - b.pa) - (a.pf - a.pa));
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

// Étiquette courte d'une poule, dérivée de son VRAI nom (« Poule A » → « A »).
// Remplace l'ancien étiquetage par index, qui divergeait après renommage/suppression.
const poolShortLabel = (pool) => ((pool.name || '').replace(/^poule\s*/i, '').trim() || pool.name || '?');

Object.assign(window, { AppShell, THEMES, poolMatchKey, poolStandings, computeBracketStructure, poolShortLabel });
