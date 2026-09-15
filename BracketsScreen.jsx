// BracketsScreen — Standings des poules et classements du tableau (lecture seule, calculé depuis résultats)
// Reçoit: theme, players, pools, results, bracketResults

const BracketsScreen = ({ theme, players, pools, results, bracketResults }) => {
  const t = window.THEMES[theme];
  // Sous-onglet mémorisé : on retrouve Poules / Tab principal / Classement final
  // tel qu'on l'a laissé en revenant sur l'écran (ou après rechargement).
  const [subTab, setSubTab] = React.useState(() => window.loadState('ertt-brackets-tab', 'poules'));
  React.useEffect(() => { window.saveState('ertt-brackets-tab', subTab); }, [subTab]);

  const renderTabs = () => (
    <div style={{ display: 'flex', gap: 4, background: t.cardBg, borderRadius: t.cardRadius, padding: 4, width: 'fit-content', boxShadow: t.cardShadow, marginBottom: 20 }}>
      {[
        { id: 'poules',    label: 'Poules',        icon: 'fas fa-layer-group' },
        { id: 'principal', label: 'Tab principal', icon: 'fas fa-trophy' },
        { id: 'final',     label: 'Classement final', icon: 'fas fa-ranking-star' },
      ].map(tb => (
        <button key={tb.id} onClick={() => setSubTab(tb.id)}
          style={{
            padding: '7px 18px', border: 'none', borderRadius: Math.max(t.cardRadius - 4, 6),
            cursor: 'pointer', fontWeight: 600, fontSize: 13,
            background: subTab === tb.id ? t.primary : 'transparent',
            color: subTab === tb.id ? '#fff' : t.textSecondary,
            transition: 'all .15s ease',
          }}>
          <i className={tb.icon} style={{ marginRight: 6 }}></i>{tb.label}
        </button>
      ))}
    </div>
  );

  if (pools.length === 0) {
    return (
      <div>
        {renderTabs()}
        <div style={{ padding: '60px', textAlign: 'center', color: t.textSecondary }}>
          <i className="fas fa-sitemap" style={{ fontSize: 32, display: 'block', marginBottom: 12, opacity: .3 }}></i>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Aucune poule configurée</div>
          <div style={{ fontSize: 13 }}>Créez des poules dans l'onglet Poules</div>
        </div>
      </div>
    );
  }

  const POOL_COLORS = [
    '#0e92f0', '#fb8c04', '#b06ffb', '#f96b6b', '#20bf6b', '#00B7FF',
  ];

  // Classement d'une poule — délégué au helper partagé (AppShell), champs renommés pour l'affichage
  const poolStandings = (pool) => window.poolStandings(pool, players, results).map(s => ({
    ...s, setsFor: s.sf, setsAgainst: s.sa, ptsFor: s.pf, ptsAgainst: s.pa,
  }));

  // Égalités que les 3 critères intra-poule ne départagent pas (poolCompare === 0).
  // Le règlement prévoit alors un tirage au sort : l'ordre affiché est arbitraire, on le signale.
  // Les joueurs sans match joué sont ignorés, sinon une poule vierge serait entièrement « ex æquo ».
  const markTies = (standings) => {
    const tied = standings.map(() => false);
    for (let i = 0; i < standings.length - 1; i++) {
      const a = standings[i], b = standings[i + 1];
      if (a.v + a.d === 0 || b.v + b.d === 0) continue;
      if (window.poolCompare(a, b) === 0) { tied[i] = true; tied[i + 1] = true; }
    }
    return tied;
  };

  const totalMatches = (pool) => {
    const n = pool.playerIds.length;
    return n * (n - 1) / 2;
  };

  const playedMatches = (pool) => {
    let count = 0;
    const ids = pool.playerIds;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        if (results[window.poolMatchKey(pool.id, ids[i], ids[j])]) count++;
      }
    }
    return count;
  };

  // Les deux classements n'apparaissent qu'une fois toutes les poules terminées :
  // un classement partiel se réordonne à chaque score saisi et n'engage à rien.
  const poolMatchesTotal  = pools.reduce((acc, pool) => acc + totalMatches(pool), 0);
  const poolMatchesPlayed = pools.reduce((acc, pool) => acc + playedMatches(pool), 0);

  if (poolMatchesPlayed < poolMatchesTotal) {
    return (
      <div>
        {renderTabs()}
        <div style={{ padding: '64px 24px', textAlign: 'center', background: t.cardBg, border: `1.5px dashed ${t.tableBorder}`, borderRadius: t.cardRadius, color: t.textSecondary }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 18px', borderRadius: '50%', background: `${t.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-hourglass-half" style={{ fontSize: 26, color: t.primary }}></i>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>
            Classements pas encore disponibles
          </div>
          <div style={{ fontSize: 13, maxWidth: 380, margin: '0 auto 20px', lineHeight: 1.5 }}>
            Termine tous les matchs de poules : les classements ne sont figés qu'une fois la dernière rencontre saisie.
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderRadius: 10, background: t.tableHeaderBg, fontSize: 12 }}>
            <span><i className="fas fa-table-tennis-paddle-ball" style={{ marginRight: 6, opacity: .5 }}></i><strong style={{ color: t.textPrimary }}>{poolMatchesPlayed}</strong> / {poolMatchesTotal} matchs joués</span>
            <span style={{ width: 1, height: 14, background: t.tableBorder }}></span>
            <span><i className="fas fa-layer-group" style={{ marginRight: 6, opacity: .5 }}></i><strong style={{ color: t.textPrimary }}>{pools.length}</strong> poule{pools.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    );
  }

  if (subTab === 'final') {
    // Places finales du tableau principal (classement intégral) : mêmes seeds et même
    // structure que KnockoutScreen, via les helpers partagés — aucune logique dupliquée ici.
    const { struct, bracketSize, seeds, seedList } = window.buildPrincipalSeeds({ pools, players, results });
    const { places, totalRounds } = window.buildIntegralBracket(seeds, 'principal', bracketResults || {}, { byes: struct.mode === 'byes' });

    // En mode byes, un exempté ne « bat » personne : les places au-delà des qualifiés
    // ne sont jamais attribuées, on ne les affiche pas.
    const capacity = struct.mode === 'byes' ? seedList.length : bracketSize;
    const rows = Array.from({ length: capacity }, (_, i) => ({ place: i + 1, player: places[i + 1] || null }));
    const settled = rows.filter(r => r.player).length;
    const medal = { 1: '#FFA500', 2: '#9aa5b1', 3: '#c07a3a' };

    return (
      <div>
        {renderTabs()}

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ background: t.cardBg, borderRadius: t.cardRadius, border: `1px solid ${t.tableBorder}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <i className="fas fa-ranking-star" style={{ color: '#FFA500', fontSize: 18 }}></i>
            <div>
              <div style={{ fontSize: 11, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 700 }}>Places attribuées</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: t.textPrimary }}>{settled} <span style={{ fontSize: 13, fontWeight: 500, color: t.textSecondary }}>sur {capacity}</span></div>
            </div>
          </div>
          <div style={{ background: t.cardBg, borderRadius: t.cardRadius, border: `1px solid ${t.tableBorder}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <i className="fas fa-sitemap" style={{ color: t.primary, fontSize: 18 }}></i>
            <div>
              <div style={{ fontSize: 11, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 700 }}>Classement intégral</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary }}>
                Tableau de {bracketSize}{struct.mode === 'byes' ? ` · ${struct.byeCount} exempté${struct.byeCount > 1 ? 's' : ''} de 1er tour` : ` · ${totalRounds} matchs par joueur`}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: t.cardBg, borderRadius: t.cardRadius, border: `1px solid ${t.tableBorder}`, overflowX: 'auto', maxWidth: 420 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: t.tableHeaderBg }}>
                {[
                  { l: 'Place',  a: 'left', w: 64 },
                  { l: 'Joueur', a: 'left'        },
                ].map((h, i) => (
                  <th key={i} style={{ width: h.w, padding: '9px 12px', textAlign: h.a, fontSize: 11, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${t.tableBorder}`, whiteSpace: 'nowrap' }}>
                    {h.l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ place, player }, idx) => {
                const badge = medal[place];
                return (
                  <tr key={place} style={{ borderBottom: idx < rows.length - 1 ? `1px solid ${t.tableBorder}` : 'none', background: player && badge ? `${badge}0f` : 'transparent', opacity: player ? 1 : 0.55 }}>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: '50%',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 800,
                        background: player ? (badge || t.primary) : t.pageBg,
                        color: player ? '#fff' : t.textSecondary,
                      }}>{place}</span>
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 14, fontWeight: 600, color: player ? t.textPrimary : t.textSecondary, whiteSpace: 'nowrap', fontStyle: player ? 'normal' : 'italic' }}>
                      {player ? player.name : 'À déterminer'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (subTab === 'principal') {
    const totalPlayers = pools.reduce((acc, p) => acc + p.playerIds.length, 0);
    const n = pools.length;

    // Stats par joueur — bâties sur le classement partagé (AppShell.poolStandings)
    const buildStats = () => {
      const all = [];
      pools.forEach((pool, poolIdx) => {
        const accent = POOL_COLORS[poolIdx % POOL_COLORS.length];
        window.poolStandings(pool, players, results).forEach((s, i) => {
          all.push({
            id: s.id, name: s.name, poolId: pool.id, poolName: pool.name, poolColor: accent,
            v: s.v, d: s.d, played: s.v + s.d,
            setsFor: s.sf, setsAgainst: s.sa,
            ptsFor: s.pf, ptsAgainst: s.pa,
            poolRank: i + 1,
          });
        });
      });
      return all;
    };

    const allStats = buildStats();

    // Composition et numérotation des TS : source unique (AppShell.buildPrincipalSeeds) —
    // ordre des poules dans tous les modes (1ers, 2es, puis meilleurs 3es), jamais au mérite.
    // On ne fait ici que rhabiller chaque TS avec ses stats de poule (poule · rang, V, D).
    const { struct, seedList } = window.buildPrincipalSeeds({ pools, players, results });
    const statsById = {};
    allStats.forEach(s => { statsById[s.id] = s; });
    const ranked = seedList.map(e => {
      const s = e.player && statsById[e.player.id];
      return s
        ? { ...s, seed: e.seed, bye: e.bye }
        : { id: `pending-${e.seed}`, seed: e.seed, bye: false, pending: true, name: 'À déterminer', poolName: '—', poolColor: t.textSecondary, poolRank: 3, v: 0, d: 0, setsFor: 0, setsAgainst: 0, ptsFor: 0, ptsAgainst: 0 };
    });
    const QUALIFIED = ranked.length;

    const totalPlayed = allStats.reduce((acc, s) => acc + s.played, 0);
    const hasResults = totalPlayed > 0;

    return (
      <div>
        {renderTabs()}

        {/* En-tête synthèse */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ background: t.cardBg, borderRadius: t.cardRadius, border: `1px solid ${t.tableBorder}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <i className="fas fa-trophy" style={{ color: '#FFA500', fontSize: 18 }}></i>
            <div>
              <div style={{ fontSize: 11, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 700 }}>Qualifiés</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: t.textPrimary }}>{QUALIFIED} <span style={{ fontSize: 13, fontWeight: 500, color: t.textSecondary }}>sur {totalPlayers}</span></div>
            </div>
          </div>
          <div style={{ background: t.cardBg, borderRadius: t.cardRadius, border: `1px solid ${t.tableBorder}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <i className="fas fa-list-ol" style={{ color: t.primary, fontSize: 18 }}></i>
            <div>
              <div style={{ fontSize: 11, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 700 }}>Critères</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary }}>
                {struct.mode === 'direct' && '1ers → 2es (tableau direct)'}
                {struct.mode === 'thirds' && `1ers → 2es → ${struct.thirdsQualified} meilleur${struct.thirdsQualified > 1 ? 's' : ''} 3e${struct.thirdsQualified > 1 ? 's' : ''}`}
                {struct.mode === 'byes' && `1ers → 2es (ordre des poules) · ${struct.byeCount} exempté${struct.byeCount > 1 ? 's' : ''} de 1er tour`}
              </div>
            </div>
          </div>
        </div>

        {/* Tableau classement — largeur plafonnée : avec 5 colonnes, un tableau
            pleine largeur diluerait les colonnes en colonnes de vide. */}
        <div style={{ background: t.cardBg, borderRadius: t.cardRadius, border: `1px solid ${t.tableBorder}`, overflowX: 'auto', maxWidth: 540 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: t.tableHeaderBg }}>
                {[
                  { l: 'TS',     a: 'left',   w: 64 },
                  { l: 'Joueur', a: 'left'          },
                  { l: 'Poule',  a: 'left',   w: 116 },
                  { l: 'V',      a: 'center', w: 48 },
                  { l: 'D',      a: 'center', w: 48 },
                ].map((h, i) => (
                  <th key={i} style={{ width: h.w, padding: '9px 12px', textAlign: h.a, fontSize: 11, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${t.tableBorder}`, whiteSpace: 'nowrap' }}>
                    {h.l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranked.map((s, idx) => {
                const rank = s.seed;
                const qualified = hasResults;

                return (
                    <tr key={s.id} style={{
                      borderBottom: idx < Math.min(ranked.length, QUALIFIED) - 1 ? `1px solid ${t.tableBorder}` : 'none',
                      background: qualified ? `${t.primary}06` : 'transparent',
                    }}>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{
                          width: 26, height: 26, borderRadius: '50%',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 800,
                          background: qualified ? t.primary : t.pageBg,
                          color: qualified ? '#fff' : t.textSecondary,
                        }}>{rank}</span>
                      </td>
                      <td style={{ padding: '9px 12px', fontSize: 14, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                        {s.name}
                        {s.bye && (
                          <span title="Exempté de 1er tour : entre directement au 2e tour"
                            style={{ marginLeft: 8, background: '#20bf6b1a', color: '#20bf6b', borderRadius: t.tagRadius, padding: '2px 7px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
                            <i className="fas fa-forward" style={{ marginRight: 4, fontSize: 9 }}></i>Exempt 1er tour
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{
                          background: `${s.poolColor}1a`, color: s.poolColor,
                          borderRadius: t.tagRadius, padding: '2px 9px',
                          fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                        }}>
                          {s.poolName} · {s.poolRank}<sup style={{ fontSize: 8 }}>{s.poolRank === 1 ? 'er' : 'e'}</sup>
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#20bf6b' }}>{s.v}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 14, color: '#f96b6b', fontWeight: 600 }}>{s.d}</td>
                    </tr>
                );
              })}
              {!hasResults && (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center', color: t.textSecondary, fontSize: 13 }}>
                    <i className="fas fa-table-tennis-paddle-ball" style={{ fontSize: 28, display: 'block', marginBottom: 10, opacity: .3 }}></i>
                    Aucun match joué — saisissez des résultats pour voir le classement
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      {renderTabs()}
      {/* Grille : colonnes de largeur égale. Un flex-wrap étirerait la carte
          seule sur sa ligne (ex. la 4e poule) sur toute la largeur. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20, alignItems: 'start' }}>
      {pools.map((pool, poolIdx) => {
        const standings = poolStandings(pool);
        const tied = markTies(standings);
        const hasTie = tied.some(Boolean);
        const played = playedMatches(pool);
        const total = totalMatches(pool);
        const accentColor = POOL_COLORS[poolIdx % POOL_COLORS.length];

        return (
          <div key={pool.id} style={{ background: t.cardBg, borderRadius: t.cardRadius, border: `1px solid ${t.tableBorder}`, overflow: 'hidden' }}>
            {/* Pool header */}
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.tableBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: t.tableHeaderBg }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ background: accentColor, color: '#fff', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{pool.name}</span>
                <span style={{ fontSize: 13, color: t.textSecondary }}>{standings.length} joueurs</span>
              </div>
              <span style={{ fontSize: 12, color: t.textSecondary }}>
                {played}/{total} matchs joués
              </span>
            </div>

            {/* Standings table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Rang', 'Joueur', 'V', 'D', 'Sets', 'Pts'].map((h, i) => (
                    <th key={i} style={{ padding: '9px 16px', textAlign: i > 1 ? 'center' : 'left', fontSize: 11, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${t.tableBorder}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {standings.map((s, idx) => (
                  <tr key={s.id} style={{ borderBottom: idx < standings.length - 1 ? `1px solid ${t.tableBorder}` : 'none', background: idx === 0 && played > 0 ? `${accentColor}08` : 'transparent' }}>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: idx === 0 && played > 0 ? accentColor : t.pageBg, color: idx === 0 && played > 0 ? '#fff' : t.textSecondary }}>{idx + 1}</span>
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 14, fontWeight: 600, color: t.textPrimary }}>
                      {s.name}
                      {tied[idx] && (
                        <span title="Égalité sur les 3 critères (quotients rencontres, manches, points) — départage par tirage au sort"
                          style={{ marginLeft: 8, background: '#fb8c041a', color: '#fb8c04', borderRadius: t.tagRadius, padding: '2px 7px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          <i className="fas fa-equals" style={{ marginRight: 4, fontSize: 9 }}></i>ex æquo
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#20bf6b' }}>{s.v}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'center', fontSize: 14, color: '#f96b6b' }}>{s.d}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'center', fontSize: 13, color: t.textSecondary, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {s.setsFor}–{s.setsAgainst}
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'center', fontSize: 13, color: t.textSecondary, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {s.ptsFor}–{s.ptsAgainst}
                    </td>
                  </tr>
                ))}
                {standings.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: t.textSecondary, fontSize: 13 }}>Aucun joueur dans cette poule</td></tr>
                )}
              </tbody>
            </table>

            {hasTie && (
              <div style={{ padding: '9px 16px', borderTop: `1px solid ${t.tableBorder}`, background: t.tableHeaderBg, fontSize: 11, color: t.textSecondary, display: 'flex', alignItems: 'center', gap: 7, lineHeight: 1.4 }}>
                <i className="fas fa-triangle-exclamation" style={{ color: '#fb8c04' }}></i>
                Égalité non départagée par les 3 quotients — tirage au sort requis
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
};

Object.assign(window, { BracketsScreen });
