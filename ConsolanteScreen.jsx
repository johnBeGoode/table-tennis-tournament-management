// ConsolanteScreen — Tableau consolante avec placement manuel par drag & drop

const ConsolanteScreen = ({ theme, players, pools, results, barrageResults, bracketResults, onUpdateBracketResults }) => {
  const t = window.THEMES[theme];
  const accentColor = '#f79025';
  const prefix = 'consolante';

  // ── Calcul des joueurs éligibles consolante ──────────────────────────────
  const nextPow2 = n => { let b = 1; while (b < n) b *= 2; return b; };

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
          si.pf += s1; si.pa += s2; sj.pf += s2; sj.pa += s1;
        });
        if (w1 > w2) { si.v++; sj.d++; } else { sj.v++; si.d++; }
        si.sf += w1; si.sa += w2; sj.sf += w2; sj.sa += w1;
      }
    }
    return stats.sort((a, b) => b.v - a.v || (b.sf - b.sa) - (a.sf - a.sa));
  };

  const principalBracketSize = nextPow2(pools.length * 2);
  const missingSpots = Math.max(0, principalBracketSize - pools.length * 2);

  const thirds = pools.map((pool, idx) => {
    const st = poolStandings(pool);
    const p = st[2] || null;
    if (!p) return null;
    const stats = st.find(s => s.id === p.id);
    return { player: p, poolLabel: String.fromCharCode(65 + idx), poolId: pool.id, v: stats?.v || 0, diff: (stats?.sf || 0) - (stats?.sa || 0), pointDiff: (stats?.pf || 0) - (stats?.pa || 0) };
  }).filter(Boolean);

  const sortedDesc = [...thirds].sort((a, b) => b.v - a.v || b.diff - a.diff || b.pointDiff - a.pointDiff);
  const barrageEligible = sortedDesc.slice(0, missingSpots * 2);
  const directConsolante = thirds.filter(x => !barrageEligible.find(e => e.poolId === x.poolId));

  const barrageLosers = barrageEligible.reduce((acc, _, i) => {
    if (i % 2 !== 0) return acc;
    const a = barrageEligible[i], b = barrageEligible[i + 1];
    if (!a || !b) return acc;
    const matchId = `barrage-${a.poolId}-${b.poolId}`;
    const r = barrageResults[matchId];
    if (r) acc.push({ player: r.winner === 1 ? r.p2 : r.p1, label: 'Perdant barrage' });
    return acc;
  }, []);

  const fourths = pools.map((pool, idx) => {
    const st = poolStandings(pool);
    const p = st[3] || null;
    if (!p) return null;
    return { player: p, label: `4e Poule ${idx + 1}` };
  }).filter(Boolean);

  const directConsolanteEntries = directConsolante.map(x => ({ player: x.player, label: `3e direct (${x.poolLabel})` }));

  const eligibleList = [
    ...barrageLosers,
    ...directConsolanteEntries,
    ...fourths,
  ];

  // ── State ────────────────────────────────────────────────────────────────
  // Taille du bracket calculée dynamiquement selon le nombre de joueurs éligibles
  const bracketSize = nextPow2(eligibleList.length);
  const [seeds, setSeeds] = React.useState(() => {
    const saved = localStorage.getItem('consolante-seeds');
    const parsed = saved ? JSON.parse(saved) : null;
    // Réinitialise si la taille ne correspond plus
    if (parsed && parsed.length === bracketSize) return parsed;
    return Array(bracketSize).fill(null);
  });
  const [dragItem, setDragItem] = React.useState(null); // { player, fromSlot: null|number }
  const [dragOver, setDragOver] = React.useState(null);
  const [modal, setModal] = React.useState(null);
  const [score, setScore] = React.useState({ p1: '', p2: '' });
  const firstInputRef = React.useRef(null);
  const SETS_TO_WIN = 3;


  React.useEffect(() => {
    localStorage.setItem('consolante-seeds', JSON.stringify(seeds));
  }, [seeds]);

  // Joueurs déjà placés
  const placedIds = new Set(seeds.filter(Boolean).map(p => p.id));
  const unplaced = eligibleList.filter(e => !placedIds.has(e.player.id));

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  const handleDragStartList = (e, entry) => {
    setDragItem({ player: entry.player, label: entry.label, fromSlot: null });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragStartSlot = (e, idx, player) => {
    setDragItem({ player, label: '', fromSlot: idx });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropSlot = (e, toIdx) => {
    e.preventDefault();
    if (!dragItem) return;
    setSeeds(prev => {
      const next = [...prev];
      // Si vient d'un slot, libère la source
      if (dragItem.fromSlot !== null) {
        const swapTarget = next[toIdx];
        next[dragItem.fromSlot] = swapTarget;
      }
      next[toIdx] = dragItem.player;
      return next;
    });
    setDragItem(null);
    setDragOver(null);
  };

  const handleDropList = (e) => {
    e.preventDefault();
    if (!dragItem || dragItem.fromSlot === null) return;
    // Retirer du slot
    setSeeds(prev => {
      const next = [...prev];
      next[dragItem.fromSlot] = null;
      return next;
    });
    setDragItem(null);
    setDragOver(null);
  };

  const removeFromSlot = (idx) => {
    setSeeds(prev => { const next = [...prev]; next[idx] = null; return next; });
  };

  const clearAll = () => {
    setSeeds(Array(bracketSize).fill(null));
    onUpdateBracketResults(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (k.startsWith(prefix)) delete next[k]; });
      return next;
    });
  };

  // ── Génération du bracket ────────────────────────────────────────────────
  const autoWinner = (() => {
    const s1 = parseInt(score.p1), s2 = parseInt(score.p2);
    if (s1 === SETS_TO_WIN && s2 < SETS_TO_WIN) return 1;
    if (s2 === SETS_TO_WIN && s1 < SETS_TO_WIN) return 2;
    return null;
  })();

  const resolveMatch = (match, role, isR1 = false) => {
    if (!match) return null;
    const r = bracketResults[match.id];
    if (r) return role === 'winner' ? (r.winner === 1 ? r.p1 : r.p2) : (r.winner === 1 ? r.p2 : r.p1);
    if (isR1) {
      if (match.p1 && !match.p2) return role === 'winner' ? match.p1 : null;
      if (match.p2 && !match.p1) return role === 'winner' ? match.p2 : null;
    }
    return null;
  };

  const r1 = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    r1.push({
      id: `${prefix}-r1-${i + 1}`,
      p1: seeds[i] || null,
      p2: seeds[bracketSize - 1 - i] || null,
    });
  }

  const allRounds = [r1];
  let roundNum = 2;
  while (allRounds[allRounds.length - 1].length > 1) {
    const prev = allRounds[allRounds.length - 1];
    const isR1 = allRounds.length === 1;
    const newRound = [];
    for (let i = 0; i < prev.length; i += 2) {
      newRound.push({
        id: `${prefix}-r${roundNum}-${i / 2 + 1}`,
        p1: resolveMatch(prev[i], 'winner', isR1),
        p2: resolveMatch(prev[i + 1] || null, 'winner', isR1),
      });
    }
    allRounds.push(newRound);
    roundNum++;
  }

  const totalRounds = allRounds.length;
  const semiRound = allRounds.length >= 2 ? allRounds[allRounds.length - 2] : null;
  const thirdPlaceMatch = (semiRound && semiRound.length === 2) ? {
    id: `${prefix}-3rd`,
    label: '3e place',
    p1: resolveMatch(semiRound[0], 'loser', false),
    p2: resolveMatch(semiRound[1], 'loser', false),
  } : null;

  const roundLabel = (roundIdx, total) => {
    const fromEnd = total - 1 - roundIdx;
    if (fromEnd === 0) return 'Finale';
    if (fromEnd === 1) return 'Demi-finales';
    if (fromEnd === 2) return 'Quarts de finale';
    if (fromEnd === 3) return 'Huitièmes de finale';
    return `${Math.pow(2, fromEnd)}e de finale`;
  };

  // ── Modal scores ─────────────────────────────────────────────────────────
  const openModal = (matchId, p1, p2) => {
    if (!p1 || !p2) return;
    const ex = bracketResults[matchId];
    setScore({ p1: ex ? String(ex.score1) : '', p2: ex ? String(ex.score2) : '' });
    setModal({ matchId, p1, p2 });
    setTimeout(() => firstInputRef.current?.focus(), 50);
  };

  const saveResult = () => {
    if (!autoWinner || !modal) return;
    onUpdateBracketResults(prev => ({
      ...prev,
      [modal.matchId]: { p1: modal.p1, p2: modal.p2, winner: autoWinner, score1: parseInt(score.p1), score2: parseInt(score.p2) },
    }));
    setModal(null);
  };

  const clearResult = (matchId, e) => {
    e.stopPropagation();
    onUpdateBracketResults(prev => { const n = { ...prev }; delete n[matchId]; return n; });
  };

  // ── Composants visuels ───────────────────────────────────────────────────
  const PlayerRow = ({ player, isWinner, sc, isBye }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: isWinner ? `${accentColor}18` : 'transparent', opacity: player ? 1 : 0.35 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {isWinner && <i className="fas fa-trophy" style={{ color: accentColor, fontSize: 10 }}></i>}
        <span style={{ fontSize: 12, fontWeight: isWinner ? 700 : 500, color: t.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
          {player ? player.name : (isBye ? '— Bye —' : '—')}
        </span>
      </div>
      {sc !== undefined && sc !== '' && (
        <span style={{ fontSize: 12, fontWeight: 700, color: isWinner ? accentColor : t.textSecondary }}>{sc}</span>
      )}
    </div>
  );

  const MatchCard = ({ match, isHighlight, customLabel, isR1 }) => {
    const r = bracketResults[match.id];
    const winner = r?.winner;
    const canPlay = match.p1 && match.p2;
    const isByeMatch = isR1 && ((match.p1 && !match.p2) || (match.p2 && !match.p1));
    return (
      <div onClick={() => canPlay && openModal(match.id, match.p1, match.p2)}
        style={{ background: isByeMatch ? `${t.cardBg}88` : t.cardBg, border: `1.5px solid ${isHighlight ? accentColor : t.tableBorder}`, borderRadius: t.cardRadius, overflow: 'hidden', cursor: canPlay ? 'pointer' : 'default', boxShadow: isHighlight ? `0 0 0 3px ${accentColor}25` : t.cardShadow, minWidth: 170, opacity: isByeMatch ? 0.6 : 1, userSelect: 'none' }}>
        {(isHighlight || r || customLabel) && (
          <div style={{ padding: '4px 10px', background: isHighlight ? accentColor : t.tableHeaderBg, borderBottom: `1px solid ${t.tableBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {(isHighlight || customLabel) && <span style={{ fontSize: 10, fontWeight: 700, color: isHighlight ? '#fff' : t.textSecondary, textTransform: 'uppercase', letterSpacing: '.4px' }}>{isHighlight ? 'Finale cons.' : customLabel}</span>}
            {!isHighlight && !customLabel && <span></span>}
            {r && <button onClick={e => clearResult(match.id, e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isHighlight ? 'rgba(255,255,255,.7)' : t.textSecondary, fontSize: 10, padding: 0 }}><i className="fas fa-times"></i></button>}
          </div>
        )}
        <PlayerRow player={match.p1} isWinner={winner === 1} sc={r?.score1} isBye={isR1 && !match.p1} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px' }}>
          <div style={{ flex: 1, height: 1, background: t.tableBorder }}></div>
          <span style={{ fontSize: 9, fontWeight: 700, color: t.textSecondary, opacity: 0.4, letterSpacing: '.5px' }}>VS</span>
          <div style={{ flex: 1, height: 1, background: t.tableBorder }}></div>
        </div>
        <PlayerRow player={match.p2} isWinner={winner === 2} sc={r?.score2} isBye={isR1 && !match.p2} />
      </div>
    );
  };

  const ColHeader = ({ label }) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10, whiteSpace: 'nowrap' }}>{label}</div>
  );

  const Arrow = ({ count }) => (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', padding: '28px 6px 0', flexShrink: 0 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 20, height: 1, background: t.tableBorder }}></div>
        </div>
      ))}
    </div>
  );

  // ── Phase de placement ────────────────────────────────────────────────────
  const placementDone = unplaced.length === 0 || seeds.filter(Boolean).length > 0;
  const [showBracket, setShowBracket] = React.useState(() => {
    return seeds.some(Boolean);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ background: accentColor, color: '#fff', borderRadius: 6, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>Consolante</span>
        <span style={{ fontSize: 12, color: t.textSecondary }}>
          {eligibleList.length} joueurs éligibles · tableau de {bracketSize}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setShowBracket(v => !v)}
            style={{ padding: '5px 14px', borderRadius: 8, border: `1.5px solid ${t.tableBorder}`, background: 'transparent', color: t.textPrimary, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            <i className={`fas fa-${showBracket ? 'list' : 'sitemap'}`} style={{ marginRight: 6 }}></i>
            {showBracket ? 'Placement' : 'Tableau'}
          </button>
          <button onClick={clearAll}
            style={{ padding: '5px 14px', borderRadius: 8, border: `1.5px solid #f96b6b`, background: 'transparent', color: '#f96b6b', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            <i className="fas fa-trash" style={{ marginRight: 6 }}></i>Réinitialiser
          </button>
        </div>
      </div>

      {!showBracket ? (
        /* ── Vue Placement ── */
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {/* Liste joueurs */}
          <div style={{ width: 220, flexShrink: 0 }}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDropList}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
              Joueurs à placer ({unplaced.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {unplaced.map((entry, i) => (
                <div key={entry.player.id} draggable
                  onDragStart={e => handleDragStartList(e, entry)}
                  style={{ background: t.cardBg, border: `1.5px solid ${t.tableBorder}`, borderRadius: 8, padding: '8px 12px', cursor: 'grab', userSelect: 'none', display: 'flex', flexDirection: 'column', gap: 2, boxShadow: t.cardShadow }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>
                    <i className="fas fa-grip-vertical" style={{ color: t.textSecondary, fontSize: 10, marginRight: 6, opacity: 0.5 }}></i>
                    {entry.player.name}
                  </span>
                  <span style={{ fontSize: 10, color: t.textSecondary, marginLeft: 18 }}>{entry.label}</span>
                </div>
              ))}
              {unplaced.length === 0 && (
                <div style={{ padding: '12px', textAlign: 'center', color: t.textSecondary, fontSize: 12, border: `1px dashed ${t.tableBorder}`, borderRadius: 8 }}>
                  Tous placés ✓
                </div>
              )}
            </div>
          </div>

          {/* Grille de slots */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
              Bracket — {bracketSize} slots ({seeds.filter(Boolean).length} placés, {bracketSize - seeds.filter(Boolean).length} byes)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
              {seeds.map((player, idx) => {
                const isOver = dragOver === idx;
                return (
                  <div key={idx}
                    onDragOver={e => { e.preventDefault(); setDragOver(idx); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={e => handleDropSlot(e, idx)}
                    style={{ background: isOver ? `${accentColor}15` : player ? t.cardBg : `${t.tableHeaderBg}`, border: `1.5px solid ${isOver ? accentColor : player ? t.tableBorder : `${t.tableBorder}88`}`, borderRadius: 8, padding: '8px 12px', minHeight: 52, display: 'flex', alignItems: 'center', gap: 8, transition: 'all .12s', position: 'relative' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, opacity: 0.5, flexShrink: 0, width: 18 }}>{idx + 1}</span>
                    {player ? (
                      <>
                        <div draggable onDragStart={e => handleDragStartSlot(e, idx, player)}
                          style={{ flex: 1, cursor: 'grab' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>{player.name}</div>
                        </div>
                        <button onClick={() => removeFromSlot(idx)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, fontSize: 11, opacity: 0.5, padding: 2, flexShrink: 0 }}>
                          <i className="fas fa-times"></i>
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: 12, color: t.textSecondary, opacity: 0.4, fontStyle: 'italic' }}>
                        {isOver ? 'Déposer ici' : 'Bye'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14 }}>
              <button onClick={() => setShowBracket(true)}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: accentColor, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                <i className="fas fa-sitemap" style={{ marginRight: 8 }}></i>Voir le tableau →
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Vue Tableau (bracket) ── */
        <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', overflowX: 'auto', paddingBottom: 12 }}>
          {allRounds.map((round, rIdx) => {
            const isLastRound = rIdx === totalRounds - 1;
            const label = roundLabel(rIdx, totalRounds);
            const nextCount = isLastRound ? 0 : Math.ceil(round.length / 2);

            if (isLastRound) {
              const finalMatch = round[0];
              return (
                <React.Fragment key={rIdx}>
                  <Arrow count={nextCount || 1} />
                  <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, alignSelf: 'stretch', minWidth: 185 }}>
                    <ColHeader label={label} />
                    <div style={{ flex: 1, position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: '100%' }}>
                        <MatchCard match={finalMatch} isHighlight={true} />
                      </div>
                      {thirdPlaceMatch && (
                        <div style={{ position: 'absolute', bottom: 0, width: '100%' }}>
                          <div style={{ borderTop: `2px dashed ${t.textSecondary}`, paddingTop: 10, opacity: 0.35 }}></div>
                          <MatchCard match={thirdPlaceMatch} isHighlight={false} customLabel="3e place" />
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={rIdx}>
                {rIdx > 0 && <Arrow count={nextCount} />}
                <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  <ColHeader label={label} />
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-around', gap: 10 }}>
                    {round.map(m => <MatchCard key={m.id} match={m} isHighlight={false} isR1={rIdx === 0} />)}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Modal saisie scores */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModal(null)}>
          <div style={{ background: t.cardBg, borderRadius: 16, padding: 28, width: 320, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 20 }}>Entrer le résultat</div>
            {[{ key: 'p1', player: modal.p1 }, { key: 'p2', player: modal.p2 }].map(({ key, player }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: t.textPrimary }}>{player.name}</div>
                <input type="number" min="0" max="3" value={score[key]}
                  onChange={e => setScore(s => ({ ...s, [key]: e.target.value }))}
                  ref={key === 'p1' ? firstInputRef : null}
                  style={{ width: 56, padding: '8px', borderRadius: 8, border: `1.5px solid ${t.inputBorder}`, background: t.inputBg, fontSize: 22, fontWeight: 700, textAlign: 'center', color: t.textPrimary, outline: 'none' }} />
              </div>
            ))}
            {autoWinner && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: `${accentColor}12`, border: `1px solid ${accentColor}40`, textAlign: 'center', margin: '8px 0 16px' }}>
                <i className="fas fa-trophy" style={{ color: '#FFA500', marginRight: 6 }}></i>
                <span style={{ fontWeight: 700, fontSize: 14, color: t.textPrimary }}>{autoWinner === 1 ? modal.p1.name : modal.p2.name}</span>
                <span style={{ fontSize: 13, color: t.textSecondary, marginLeft: 4 }}>gagne le match</span>
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

Object.assign(window, { ConsolanteScreen });
