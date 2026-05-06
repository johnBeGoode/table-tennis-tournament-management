// BarrageScreen — Matchs de barrage entre 3es de poule
// Complète le tableau principal si les 1ers+2es ne suffisent pas à atteindre 16 joueurs

const BarrageScreen = ({ theme, players, pools, results, barrageResults, onUpdateBarrageResults }) => {
  const t = window.THEMES[theme];
  const [modal, setModal] = React.useState(null);
  const [score, setScore] = React.useState({ p1: '', p2: '' });
  const firstInputRef = React.useRef(null);

  const SETS_TO_WIN = 3;
  // Taille du bracket = prochaine puissance de 2 >= nb qualifiés directs (1er + 2e par poule)
  const nextPow2 = (n) => { let b = 1; while (b < n) b *= 2; return b; };
  const BRACKET_SIZE = nextPow2(pools.length * 2);
  const accentColor = '#f79025';

  const autoWinner = (() => {
    const s1 = parseInt(score.p1), s2 = parseInt(score.p2);
    if (s1 === SETS_TO_WIN && s2 < SETS_TO_WIN) return 1;
    if (s2 === SETS_TO_WIN && s1 < SETS_TO_WIN) return 2;
    return null;
  })();

  // Classement d'une poule
  const poolStandings = (pool) => {
    const stats = pool.playerIds.map(id => {
      const name = players.find(p => p.id === id)?.name || '?';
      return { id, name, v: 0, d: 0, sf: 0, sa: 0, pf: 0, pa: 0 };
    });
    for (let i = 0; i < pool.playerIds.length; i++) {
      for (let j = i + 1; j < pool.playerIds.length; j++) {
        const key = `pool-${pool.id}-${pool.playerIds[i]}-${pool.playerIds[j]}`;
        const r = results[key];
        if (!r) continue;
        let w1 = 0, w2 = 0;
        const si = stats.find(s => s.id === pool.playerIds[i]);
        const sj = stats.find(s => s.id === pool.playerIds[j]);
        (r.sets || []).forEach(([s1, s2]) => {
          s1 > s2 ? w1++ : w2++;
          si.pf += s1; si.pa += s2;
          sj.pf += s2; sj.pa += s1;
        });
        if (w1 > w2) { si.v++; sj.d++; } else { sj.v++; si.d++; }
        si.sf += w1; si.sa += w2; sj.sf += w2; sj.sa += w1;
      }
    }
    return stats.sort((a, b) => b.v - a.v || (b.sf - b.sa) - (a.sf - a.sa));
  };

  // Calcul des qualifiés automatiques (1ers + 2es) et des places manquantes
  const autoQualifiers = pools.length * 2; // 1er + 2e de chaque poule
  const missingSpots = Math.max(0, BRACKET_SIZE - autoQualifiers); // places à remplir via 3es

  // Tous les 3es de poule, avec leurs stats pour départager les ex-æquo
  const thirdPlacePlayers = pools.map((pool, idx) => {
    const standings = poolStandings(pool);
    const p = standings[2] || null;
    if (!p) return null;
    const stats = standings.find(s => s.id === p.id);
    return { player: p, poolLabel: String.fromCharCode(65 + idx), poolId: pool.id, v: stats?.v || 0, diff: (stats?.sf || 0) - (stats?.sa || 0), pointDiff: (stats?.pf || 0) - (stats?.pa || 0) };
  }).filter(Boolean);

  // barrageMatchCount = missingSpots : chaque match produit 1 vainqueur qui occupe 1 spot
  // Les MEILLEURS 3es jouent les barrages, les autres vont directement en consolante
  const barrageMatchCount = missingSpots;
  const sortedDesc = [...thirdPlacePlayers].sort((a, b) => b.v - a.v || b.diff - a.diff || b.pointDiff - a.pointDiff);
  const barrageEligible = sortedDesc.slice(0, barrageMatchCount * 2);
  const directConsolante = thirdPlacePlayers.filter(x => !barrageEligible.find(e => e.poolId === x.poolId));

  // Construction des matchs de barrage (paires)
  const barrageMatches = [];
  for (let i = 0; i < barrageEligible.length; i += 2) {
    const a = barrageEligible[i];
    const b = barrageEligible[i + 1];
    if (!a || !b) break;
    barrageMatches.push({
      id: `barrage-${a.poolId}-${b.poolId}`,
      label: `${a.poolLabel}3 vs ${b.poolLabel}3`,
      p1: a.player,
      p2: b.player,
    });
  }

  const openModal = (matchId, p1, p2) => {
    if (!p1 || !p2) return;
    const ex = barrageResults[matchId];
    setScore({ p1: ex ? String(ex.score1) : '', p2: ex ? String(ex.score2) : '' });
    setModal({ matchId, p1, p2 });
    setTimeout(() => firstInputRef.current?.focus(), 50);
  };

  const saveResult = () => {
    if (!autoWinner || !modal) return;
    onUpdateBarrageResults(prev => ({
      ...prev,
      [modal.matchId]: { p1: modal.p1, p2: modal.p2, winner: autoWinner, score1: parseInt(score.p1), score2: parseInt(score.p2) },
    }));
    setModal(null);
  };

  const clearResult = (matchId, e) => {
    e.stopPropagation();
    onUpdateBarrageResults(prev => { const n = { ...prev }; delete n[matchId]; return n; });
  };

  // Cas : aucun barrage nécessaire
  if (missingSpots === 0) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: t.textSecondary, background: t.cardBg, borderRadius: t.cardRadius, border: `1px dashed ${t.tableBorder}` }}>
        <i className="fas fa-check-circle" style={{ fontSize: 32, display: 'block', marginBottom: 12, color: '#20bf6b', opacity: .8 }}></i>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, marginBottom: 6 }}>Aucun barrage nécessaire</div>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          Avec {pools.length} poules, les 1ers et 2es ({autoQualifiers} joueurs) remplissent directement
          les {BRACKET_SIZE} places du tableau principal.
        </div>
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: t.textSecondary }}>
        <i className="fas fa-code-branch" style={{ fontSize: 32, display: 'block', marginBottom: 12, opacity: .3 }}></i>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Aucune poule configurée</div>
      </div>
    );
  }

  const done = barrageMatches.filter(m => barrageResults[m.id]).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ background: accentColor, color: '#fff', borderRadius: 6, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>Barrage</span>
        <span style={{ fontSize: 12, color: t.textSecondary }}>
          {autoQualifiers} qualifiés directs (1ers+2es) · {missingSpots} place{missingSpots > 1 ? 's' : ''} pour les 3es · {barrageMatchCount} match{barrageMatchCount > 1 ? 's' : ''} de barrage · {done}/{barrageMatches.length} joués
        </span>
      </div>

      {/* Légende */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: t.textSecondary }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#20bf6b', display: 'inline-block' }}></span>
          Vainqueur → Tableau principal
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: t.textSecondary }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f96b6b', display: 'inline-block' }}></span>
          Perdant → Consolante
        </div>
      </div>

      {/* Matchs de barrage */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
          Matchs de barrage — 3es de poule
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {barrageMatches.map(match => {
            const r = barrageResults[match.id];
            const winner = r?.winner;
            const canPlay = match.p1 && match.p2;
            return (
              <div key={match.id} onClick={() => canPlay && openModal(match.id, match.p1, match.p2)}
                style={{ background: t.cardBg, border: `1.5px solid ${t.tableBorder}`, borderRadius: t.cardRadius, overflow: 'hidden', minWidth: 210, flex: '1 1 210px', cursor: canPlay ? 'pointer' : 'default', boxShadow: t.cardShadow }}>
                <div style={{ padding: '6px 14px', background: t.tableHeaderBg, borderBottom: `1px solid ${t.tableBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '.4px' }}>{match.label}</span>
                  {r && <button onClick={e => clearResult(match.id, e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, fontSize: 10, padding: 0, opacity: 0.5 }}><i className="fas fa-times"></i></button>}
                </div>
                {[{ player: match.p1, isWinner: winner === 1, sc: r?.score1 }, { player: match.p2, isWinner: winner === 2, sc: r?.score2 }].map((row, i) => (
                  <React.Fragment key={i}>
                    {i === 1 && <div style={{ height: 1, background: t.tableBorder }}></div>}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: row.isWinner ? '#20bf6b12' : 'transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {row.isWinner && <i className="fas fa-trophy" style={{ color: '#20bf6b', fontSize: 10 }}></i>}
                        <span style={{ fontSize: 13, fontWeight: row.isWinner ? 700 : 500, color: t.textPrimary }}>{row.player?.name || '—'}</span>
                      </div>
                      {row.sc !== undefined && <span style={{ fontSize: 13, fontWeight: 700, color: row.isWinner ? '#20bf6b' : t.textSecondary }}>{row.sc}</span>}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3es qualifiés directement en consolante */}
      {directConsolante.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
            3es qualifiés directement en consolante
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {directConsolante.map(({ player, poolLabel }) => (
              <div key={poolLabel} style={{ background: t.cardBg, border: `1px solid ${t.tableBorder}`, borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#f96b6b' }}>{poolLabel}3</span>
                <span style={{ fontSize: 13, color: t.textPrimary }}>{player.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModal(null)}>
          <div style={{ background: t.cardBg, borderRadius: 16, padding: 28, width: 320, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 20 }}>Entrer le résultat</div>
            {[{ key: 'p1', player: modal.p1 }, { key: 'p2', player: modal.p2 }].map(({ key, player }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: t.textPrimary }}>{player.name}</div>
                <input type="number" min="0" max="3" value={score[key]}
                  ref={key === 'p1' ? firstInputRef : null}
                  onChange={e => setScore(s => ({ ...s, [key]: e.target.value }))}
                  style={{ width: 56, padding: '8px', borderRadius: 8, border: `1.5px solid ${t.inputBorder}`, background: t.inputBg, fontSize: 22, fontWeight: 700, textAlign: 'center', color: t.textPrimary, outline: 'none' }} />
              </div>
            ))}
            {autoWinner && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: '#20bf6b12', border: '1px solid #20bf6b40', textAlign: 'center', margin: '8px 0 16px' }}>
                <i className="fas fa-trophy" style={{ color: '#FFA500', marginRight: 6 }}></i>
                <span style={{ fontWeight: 700, fontSize: 14, color: t.textPrimary }}>{autoWinner === 1 ? modal.p1.name : modal.p2.name}</span>
                <span style={{ fontSize: 13, color: t.textSecondary, marginLeft: 4 }}>→ Tableau principal</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: autoWinner ? 0 : 16 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '10px', borderRadius: t.btnRadius, border: `1.5px solid ${t.tableBorder}`, background: 'transparent', color: t.textSecondary, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={saveResult} disabled={!autoWinner}
                style={{ flex: 1, padding: '10px', borderRadius: t.btnRadius, border: 'none', background: autoWinner ? accentColor : t.tableBorder, color: '#fff', fontWeight: 700, fontSize: 13, cursor: autoWinner ? 'pointer' : 'not-allowed', opacity: autoWinner ? 1 : 0.5 }}>
                <i className="fas fa-save" style={{ marginRight: 6 }}></i>Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { BarrageScreen });
