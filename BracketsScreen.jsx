// BracketsScreen — Standings des poules (lecture seule, calculé depuis résultats)
// Reçoit: theme, players, pools, results

const BracketsScreen = ({ theme, players, pools, results, barrageResults }) => {
  const t = window.THEMES[theme];
  const [subTab, setSubTab] = React.useState('poules');

  const renderTabs = () => (
    <div style={{ display: 'flex', gap: 4, background: t.cardBg, borderRadius: t.cardRadius, padding: 4, width: 'fit-content', boxShadow: t.cardShadow, marginBottom: 20 }}>
      {[
        { id: 'poules',    label: 'Poules',        icon: 'fas fa-layer-group' },
        { id: 'principal', label: 'Tab principal', icon: 'fas fa-trophy' },
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

  if (subTab === 'principal') {
    const totalPlayers = pools.reduce((acc, p) => acc + p.playerIds.length, 0);
    const n = pools.length;

    const totalPoolMatchesPlayed = Object.keys(results || {}).filter(k => k.startsWith('pool-')).length;
    if (totalPoolMatchesPlayed === 0) {
      return (
        <div>
          {renderTabs()}
          <div style={{ padding: '60px', textAlign: 'center', color: t.textSecondary, background: t.cardBg, borderRadius: t.cardRadius, border: `1px solid ${t.tableBorder}` }}>
            <i className="fas fa-trophy" style={{ fontSize: 32, display: 'block', marginBottom: 12, opacity: .3 }}></i>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: t.textPrimary }}>En attente des résultats de poule</div>
            <div style={{ fontSize: 13 }}>Le classement des qualifiés sera généré dès que les matchs de poule auront commencé.</div>
          </div>
        </div>
      );
    }

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

    const sortByPerf = (arr) => [...arr].sort((a, b) =>
      b.v - a.v
      || (b.setsFor - b.setsAgainst) - (a.setsFor - a.setsAgainst)
      || (b.ptsFor - b.ptsAgainst) - (a.ptsFor - a.ptsAgainst)
    );

    // Groupes : 1ers, 2es de poule
    const firsts  = sortByPerf(allStats.filter(s => s.poolRank === 1));
    const seconds = sortByPerf(allStats.filter(s => s.poolRank === 2));

    // Logique partagée (AppShell.computeBracketStructure)
    const autoQualifiers = n * 2;

    const thirdPlayers = pools.map(pool => {
      const tStats = allStats.filter(s => s.poolId === pool.id && s.poolRank === 3)[0];
      return tStats ? { player: tStats, poolId: pool.id } : null;
    }).filter(Boolean);

    const struct = window.computeBracketStructure(autoQualifiers, thirdPlayers.length);

    // Mode 'eliminate' : retirer les `eliminateCount` moins bons 2es du tableau principal
    let keptSeconds = seconds;
    if (struct.mode === 'eliminate') {
      const cut = struct.eliminateCount;
      keptSeconds = seconds.slice(0, Math.max(0, seconds.length - cut));
    }

    const sortedThird = [...thirdPlayers].sort((a, b) =>
      b.player.v - a.player.v
      || (b.player.setsFor - b.player.setsAgainst) - (a.player.setsFor - a.player.setsAgainst)
      || (b.player.ptsFor - b.player.ptsAgainst) - (a.player.ptsFor - a.player.ptsAgainst)
    );
    const eligible = struct.mode === 'barrage' ? sortedThird.slice(0, struct.barrageCount * 2) : [];
    const barrageWinners = [];
    for (let i = 0; i < eligible.length; i += 2) {
      const a = eligible[i], b = eligible[i + 1];
      if (!a || !b) break;
      const matchId = `barrage-${a.poolId}-${b.poolId}`;
      const r = (barrageResults || {})[matchId];
      if (r) {
        const winnerId = r.winner === 1 ? r.p1.id : r.p2.id;
        const winnerStats = allStats.find(s => s.id === winnerId);
        if (winnerStats) barrageWinners.push(winnerStats);
      } else {
        barrageWinners.push(null); // barrage non joué
      }
    }

    const QUALIFIED = firsts.length + keptSeconds.length + barrageWinners.length;

    // Construction du classement final par groupes
    // 1..n : 1ers   |   n+1..2n : 2es   |   2n+1..QUALIFIED : vainqueurs barrage
    const ranked = [
      ...firsts.map(s  => ({ ...s, group: '1er',     groupColor: '#20bf6b' })),
      ...keptSeconds.map(s => ({ ...s, group: '2e',      groupColor: '#0e92f0' })),
      ...barrageWinners.map(s => s
        ? { ...s, group: 'Barrage', groupColor: '#fb8c04' }
        : { id: `pending-${Math.random()}`, name: 'Vainqueur barrage à venir', poolName: '—', poolColor: t.textSecondary, poolRank: 3, v: 0, d: 0, setsFor: 0, setsAgainst: 0, ptsFor: 0, ptsAgainst: 0, group: 'Barrage', groupColor: '#fb8c04', pending: true }
      ),
    ];

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
                {struct.mode === 'barrage' && `1ers → 2es → ${struct.barrageCount} vainqueur${struct.barrageCount > 1 ? 's' : ''} barrage`}
                {struct.mode === 'eliminate' && `1ers → ${keptSeconds.length} meilleurs 2es (${struct.eliminateCount} 2e${struct.eliminateCount > 1 ? 's' : ''} éliminé${struct.eliminateCount > 1 ? 's' : ''})`}
              </div>
            </div>
          </div>
        </div>

        {/* Tableau classement */}
        <div style={{ background: t.cardBg, borderRadius: t.cardRadius, border: `1px solid ${t.tableBorder}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: t.tableHeaderBg }}>
                {[
                  { l: 'Rang', a: 'left' },
                  { l: 'Joueur', a: 'left' },
                  { l: 'Groupe', a: 'left' },
                  { l: 'Poule', a: 'left' },
                  { l: 'V', a: 'center' },
                  { l: 'D', a: 'center' },
                  { l: 'Sets +/−', a: 'center' },
                  { l: 'Diff sets', a: 'center' },
                  { l: 'Pts +/−', a: 'center' },
                  { l: 'Diff pts', a: 'center' },
                ].map((h, i) => (
                  <th key={i} style={{ padding: '10px 14px', textAlign: h.a, fontSize: 11, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${t.tableBorder}`, whiteSpace: 'nowrap' }}>{h.l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranked.slice(0, QUALIFIED).map((s, idx) => {
                const rank = idx + 1;
                const qualified = hasResults;
                const setsDiff = s.setsFor - s.setsAgainst;
                const ptsDiff = s.ptsFor - s.ptsAgainst;

                // Médaille pour top 3
                let medal = null;
                if (qualified && rank === 1) medal = '#FFD700';
                else if (qualified && rank === 2) medal = '#C0C0C0';
                else if (qualified && rank === 3) medal = '#CD7F32';

                return (
                    <tr key={s.id} style={{
                      borderBottom: idx < Math.min(ranked.length, QUALIFIED) - 1 ? `1px solid ${t.tableBorder}` : 'none',
                      background: qualified ? `${t.primary}06` : 'transparent',
                    }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          width: 28, height: 28, borderRadius: '50%',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 800,
                          background: medal || (qualified ? t.primary : t.pageBg),
                          color: medal ? '#000' : (qualified ? '#fff' : t.textSecondary),
                        }}>{rank}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                        {s.name}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          background: `${s.groupColor}1a`, color: s.groupColor,
                          borderRadius: t.tagRadius, padding: '2px 9px',
                          fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                        }}>
                          {s.group}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          background: `${s.poolColor}1a`, color: s.poolColor,
                          borderRadius: t.tagRadius, padding: '2px 9px',
                          fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                        }}>
                          {s.poolName} · {s.poolRank}<sup style={{ fontSize: 8 }}>{s.poolRank === 1 ? 'er' : 'e'}</sup>
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#20bf6b' }}>{s.v}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 14, color: '#f96b6b', fontWeight: 600 }}>{s.d}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, color: t.textSecondary, fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {s.setsFor}–{s.setsAgainst}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: setsDiff > 0 ? '#20bf6b' : setsDiff < 0 ? '#f96b6b' : t.textSecondary }}>
                        {setsDiff > 0 ? '+' : ''}{setsDiff}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, color: t.textSecondary, fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {s.ptsFor}–{s.ptsAgainst}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: ptsDiff > 0 ? '#20bf6b' : ptsDiff < 0 ? '#f96b6b' : t.textSecondary }}>
                        {ptsDiff > 0 ? '+' : ''}{ptsDiff}
                      </td>
                    </tr>
                );
              })}
              {!hasResults && (
                <tr>
                  <td colSpan={10} style={{ padding: '40px 20px', textAlign: 'center', color: t.textSecondary, fontSize: 13 }}>
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
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {pools.map((pool, poolIdx) => {
        const standings = poolStandings(pool);
        const played = playedMatches(pool);
        const total = totalMatches(pool);
        const accentColor = POOL_COLORS[poolIdx % POOL_COLORS.length];

        return (
          <div key={pool.id} style={{ background: t.cardBg, borderRadius: t.cardRadius, border: `1px solid ${t.tableBorder}`, overflow: 'hidden', minWidth: 320, flex: 1 }}>
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
                  {['Rang', 'Joueur', 'V', 'D', 'Sets'].map((h, i) => (
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
                    <td style={{ padding: '11px 16px', fontSize: 14, fontWeight: 600, color: t.textPrimary }}>{s.name}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#20bf6b' }}>{s.v}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'center', fontSize: 14, color: '#f96b6b' }}>{s.d}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'center', fontSize: 13, color: t.textSecondary, fontWeight: 500 }}>
                      {s.setsFor}–{s.setsAgainst}
                    </td>
                  </tr>
                ))}
                {standings.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: t.textSecondary, fontSize: 13 }}>Aucun joueur dans cette poule</td></tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })}
      </div>
    </div>
  );
};

Object.assign(window, { BracketsScreen });
