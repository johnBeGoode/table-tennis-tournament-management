// ResultsScreen — Saisie des résultats par set
// Format: premier à 3 sets gagnants, 11 pts minimum, 2 pts d'écart
// Validation uniquement au blur (onBlur) pour permettre la saisie de nombres comme 12

const POOL_COLORS = [
  { bg: 'rgba(14,146,240,0.1)',   color: '#0e92f0' },
  { bg: 'rgba(251,140,4,0.1)',    color: '#fb8c04' },
  { bg: 'rgba(176,111,251,0.1)',  color: '#b06ffb' },
  { bg: 'rgba(249,107,107,0.1)',  color: '#f96b6b' },
  { bg: 'rgba(32,191,107,0.1)',   color: '#20bf6b' },
  { bg: 'rgba(0,183,255,0.1)',    color: '#00b7ff' },
  { bg: 'rgba(247,144,37,0.1)',   color: '#f79025' },
  { bg: 'rgba(99,102,241,0.1)',   color: '#6366f1' },
];

const SETS_TO_WIN = 3;
const MAX_SETS = 5;

// Vérifie si un score de set est valide selon les règles tennis de table
// Victoire normale : gagnant = 11, perdant ≤ 9
// Prolongation (égalité à 10-10+) : gagnant = perdant + 2, les deux ≥ 10
const isSetValid = (s1, s2) => {
  const a = parseInt(s1);
  const b = parseInt(s2);
  if (isNaN(a) || isNaN(b)) return false;
  if (a > 30 || b > 30) return false;
  if (a === b) return false; // pas de match nul
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi < 11) return false; // personne n'a encore 11
  if (lo <= 9) return hi === 11; // victoire normale : exactement 11 vs 0-9
  return hi - lo === 2; // prolongation : écart de 2
};

// Retourne un message d'erreur si le score est impossible, null sinon
const scoreError = (s1, s2) => {
  const a = parseInt(s1);
  const b = parseInt(s2);
  if (isNaN(a) || isNaN(b) || s1 === '' || s2 === '') return null;
  if (a > 30 || b > 30) return 'Score invalide — maximum 30 points par set';
  if (a === b) return 'Score nul impossible';
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi < 11) return null; // en cours, pas d'erreur
  if (lo === 10 && hi === 11) return 'Score invalide — il faut 2 points d\'écart';
  if (lo >= 10 && hi - lo !== 2) return 'Score invalide — il faut 2 points d\'écart';
  if (lo > 9 && hi !== lo + 2) return 'Score invalide';
  if (lo <= 9 && hi !== 11) return 'Score invalide — la victoire normale est à 11';
  return null;
};

// Compte les sets gagnés depuis le state [{s1,s2,done}]
const countSetsWonState = (sets) => {
  let w1 = 0, w2 = 0;
  sets.forEach(s => {
    if (!s.done) return;
    parseInt(s.s1) > parseInt(s.s2) ? w1++ : w2++;
  });
  return [w1, w2];
};

// Compte les sets gagnés depuis les résultats sauvegardés [[s1,s2],...]
const countSetsWonArr = (sets) => {
  let w1 = 0, w2 = 0;
  (sets || []).forEach(([s1, s2]) => { s1 > s2 ? w1++ : w2++; });
  return [w1, w2];
};

// Génère tous les matchs d'une poule
const poolMatches = (pool, pools, players) => {
  const pIds = pool.playerIds;
  const matches = [];
  for (let i = 0; i < pIds.length; i++) {
    for (let j = i + 1; j < pIds.length; j++) {
      matches.push({
        id: `pool-${pool.id}-${pIds[i]}-${pIds[j]}`,
        round: pool.name,
        poolIdx: pools.indexOf(pool),
        p1Id: pIds[i],
        p2Id: pIds[j],
        p1: players.find(p => p.id === pIds[i])?.name || '?',
        p2: players.find(p => p.id === pIds[j])?.name || '?',
      });
    }
  }
  return matches;
};

const emptySet = () => ({ s1: '', s2: '', done: false });
const initialSets = () => Array.from({ length: MAX_SETS }, emptySet);

const ResultsScreen = ({ theme, players, pools, results, onUpdateResults }) => {
  const t = window.THEMES[theme];
  const [tab, setTab] = React.useState('pending');
  const [selected, setSelected] = React.useState(null);
  const [sets, setSets] = React.useState(initialSets());
  const [setErrors, setSetErrors] = React.useState(Array(MAX_SETS).fill(null));
  const scorePanelRef = React.useRef(null);
  // Refs pour focus automatique: inputRefs[setIdx][0=s1, 1=s2]
  const inputRefs = React.useRef(Array.from({ length: MAX_SETS }, () => [null, null]));

  const allMatches = pools.flatMap(pool => poolMatches(pool, pools, players));
  const pending = allMatches.filter(m => !results[m.id]);
  const completed = allMatches.filter(m => !!results[m.id]);

  const [setsWon1, setsWon2] = countSetsWonState(sets);
  const matchOver = setsWon1 === SETS_TO_WIN || setsWon2 === SETS_TO_WIN;
  const winner = matchOver ? (setsWon1 > setsWon2 ? selected?.p1 : selected?.p2) : null;

  // Détermine jusqu'quel set on peut saisir
  const activeSetIdx = (() => {
    if (matchOver) return -1;
    // Premier set non terminé
    for (let i = 0; i < MAX_SETS; i++) {
      if (!sets[i].done) return i;
    }
    return -1;
  })();

  const handleSelect = (m) => {
    setSelected(m);
    setSets(initialSets());
    setSetErrors(Array(MAX_SETS).fill(null));
    setTimeout(() => {
      scorePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // Mise à jour d'un score (frappe clavier) — pas de validation ici
  const handleChange = (idx, key, val) => {
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, [key]: val } : s));
  };

  // Validation au blur
  const handleBlur = (idx) => {
    setSets(prev => {
      const s = prev[idx];
      if (s.done) return prev;
      if (s.s1 === '' || s.s2 === '') return prev;
      const err = scoreError(s.s1, s.s2);
      if (err) {
        setSetErrors(e => e.map((v, i) => i === idx ? err : v));
        return prev;
      }
      if (!isSetValid(s.s1, s.s2)) return prev;
      setSetErrors(e => e.map((v, i) => i === idx ? null : v));
      return prev.map((ss, i) => i === idx ? { ...ss, done: true } : ss);
    });
  };

  const handleSave = () => {
    if (!matchOver) return;
    const completedSets = sets
      .filter(s => s.done)
      .map(s => [parseInt(s.s1), parseInt(s.s2)]);
    onUpdateResults(prev => ({ ...prev, [selected.id]: { sets: completedSets } }));
    setSelected(null);
    setSets(initialSets());
    setTab('pending');
  };

  const getRoundColor = (m) => POOL_COLORS[m.poolIdx % POOL_COLORS.length];

  if (pools.length === 0) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: t.textSecondary }}>
        <i className="fas fa-layer-group" style={{ fontSize: 32, display: 'block', marginBottom: 12, opacity: .3 }}></i>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Aucune poule configurée</div>
        <div style={{ fontSize: 13 }}>Créez des poules dans l'onglet Poules</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 24 }}>

      {/* Liste des matchs */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Barre onglets + bouton aléatoire */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 4, background: t.cardBg, borderRadius: t.cardRadius, padding: 4, width: 'fit-content', boxShadow: t.cardShadow }}>
          {[
            { id: 'pending', label: `À jouer (${pending.length})` },
            { id: 'done',    label: `Terminés (${completed.length})` },
          ].map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              style={{
                padding: '7px 18px', border: 'none', borderRadius: Math.max(t.cardRadius - 4, 6),
                cursor: 'pointer', fontWeight: 600, fontSize: 13,
                background: tab === tb.id ? t.primary : 'transparent',
                color: tab === tb.id ? '#fff' : t.textSecondary,
                transition: 'all .15s ease',
              }}>
              {tb.label}
            </button>
          ))}
        </div>
        </div>

        {/* À jouer */}
        {tab === 'pending' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: t.textSecondary, background: t.cardBg, borderRadius: t.cardRadius, border: `1px solid ${t.tableBorder}` }}>
                <i className="fas fa-check-circle" style={{ fontSize: 28, color: '#20bf6b', marginBottom: 10, display: 'block' }}></i>
                Tous les matchs sont joués !
              </div>
            )}
            {pending.map(m => {
              const rc = getRoundColor(m);
              const isSel = selected?.id === m.id;
              return (
                <div key={m.id} onClick={() => handleSelect(m)} style={{
                  background: t.cardBg, borderRadius: t.cardRadius,
                  border: isSel ? `2px solid ${t.primary}` : `1px solid ${t.tableBorder}`,
                  boxShadow: isSel ? `0 0 0 3px ${t.primary}18` : t.cardShadow,
                  padding: '12px 16px', cursor: 'pointer', transition: 'all .15s ease',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: t.tagRadius, background: rc.bg, color: rc.color }}>{m.round}</span>
                    {isSel && <span style={{ fontSize: 11, color: t.primary, fontWeight: 700 }}><i className="fas fa-pen" style={{ marginRight: 4 }}></i>En cours</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: t.textPrimary }}>{m.p1}</span>
                    <span style={{ fontSize: 11, background: t.pageBg, border: `1px solid ${t.tableBorder}`, padding: '2px 8px', borderRadius: 6, fontWeight: 700, color: t.textSecondary }}>VS</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: t.textPrimary, textAlign: 'right' }}>{m.p2}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Terminés */}
        {tab === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {completed.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: t.textSecondary, background: t.cardBg, borderRadius: t.cardRadius, border: `1px solid ${t.tableBorder}` }}>
                <i className="fas fa-table-tennis-paddle-ball" style={{ fontSize: 28, display: 'block', marginBottom: 10, opacity: .3 }}></i>
                Aucun match terminé pour l'instant
              </div>
            )}
            {completed.map(m => {
              const rc = getRoundColor(m);
              const r = results[m.id];
              const [w1, w2] = countSetsWonArr(r?.sets);
              const p1won = w1 > w2;
              return (
                <div key={m.id} style={{ background: t.cardBg, borderRadius: t.cardRadius, border: `1px solid ${t.tableBorder}`, padding: '10px 16px' }}>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: t.tagRadius, background: rc.bg, color: rc.color }}>{m.round}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: p1won ? 700 : 500, color: p1won ? t.textPrimary : t.textSecondary }}>{m.p1}</span>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: p1won ? t.primary : t.textSecondary }}>{w1}</span>
                      <span style={{ fontSize: 12, color: t.textSecondary }}>–</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: !p1won ? t.primary : t.textSecondary }}>{w2}</span>
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: !p1won ? 700 : 500, color: !p1won ? t.textPrimary : t.textSecondary, textAlign: 'right' }}>{m.p2}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                    {(r?.sets || []).map(([s1, s2], i) => {
                      const sw = s1 > s2;
                      return (
                        <span key={i} style={{ fontSize: 11, padding: '1px 7px', borderRadius: 5, background: t.pageBg, border: `1px solid ${t.tableBorder}`, color: t.textSecondary }}>
                          <span style={{ color: sw ? t.primary : t.textSecondary, fontWeight: 700 }}>{s1}</span>
                          <span style={{ margin: '0 2px' }}>–</span>
                          <span style={{ color: !sw ? t.primary : t.textSecondary, fontWeight: 700 }}>{s2}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Panneau de saisie — uniquement sur l'onglet À jouer */}
      {tab === 'pending' && <div ref={scorePanelRef} style={{ width: 320, flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
          Saisie du score
        </div>
        <div style={{ background: t.cardBg, borderRadius: t.cardRadius, border: `1px solid ${t.tableBorder}`, overflow: 'hidden' }}>

          {/* Aucun match sélectionné */}
          {!selected && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: t.textSecondary }}>
              <i className="fas fa-table-tennis-paddle-ball" style={{ fontSize: 32, display: 'block', marginBottom: 10, opacity: .3 }}></i>
              <div style={{ fontSize: 13 }}>Sélectionnez un match pour saisir les scores</div>
            </div>
          )}

          {/* Saisie active */}
          {selected && (
            <div>
              {/* En-tête match */}
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.tableBorder}`, background: t.tableHeaderBg }}>
                <div style={{ fontSize: 11, color: (getRoundColor(selected)||{}).color, fontWeight: 700, marginBottom: 4 }}>{selected.round}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, flex: 1 }}>{selected.p1}</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: t.primary, margin: '0 8px' }}>{setsWon1} – {setsWon2}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, flex: 1, textAlign: 'right' }}>{selected.p2}</span>
                </div>
                <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 4, textAlign: 'center' }}>
                  Premier à {SETS_TO_WIN} sets · 11 pts min · 2 pts d'écart
                </div>
              </div>

              {/* Sets */}
              <div style={{ padding: '14px 18px' }}>
                {sets.map((s, idx) => {
                  const prevDone = idx === 0 || sets[idx - 1].done;
                  const [w1b, w2b] = countSetsWonState(sets.slice(0, idx));
                  const matchAlreadyOver = w1b >= SETS_TO_WIN || w2b >= SETS_TO_WIN;
                  if (matchAlreadyOver && !s.done) return null;

                  const isActive = prevDone && !matchAlreadyOver && !s.done;
                  const set1won = s.done && parseInt(s.s1) > parseInt(s.s2);
                  const set2won = s.done && parseInt(s.s2) > parseInt(s.s1);

                  const err = setErrors[idx];
                  const unlockSet = () => {
                    setSets(prev => prev.map((ss, i) =>
                      i === idx ? { ...ss, done: false }
                      : i > idx  ? emptySet()
                      : ss
                    ));
                    setSetErrors(e => e.map((v, i) => i >= idx ? null : v));
                  };

                  return (
                    <div key={idx} style={{
                      marginBottom: 8, padding: '10px 14px', borderRadius: 10,
                      background: s.done ? `${t.primary}08` : err ? 'rgba(249,107,107,0.06)' : isActive ? t.pageBg : `${t.tableBorder}44`,
                      border: `1px solid ${s.done ? t.primary + '44' : err ? '#f96b6b' : isActive ? t.inputBorder : 'transparent'}`,
                      opacity: isActive || s.done ? 1 : 0.4,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: s.done ? t.primary : t.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          Set {idx + 1}
                          {s.done && <i className="fas fa-check" style={{ marginLeft: 6 }}></i>}
                          {isActive && <span style={{ color: t.primary }}> — En cours</span>}
                        {err && <span style={{ color: '#f96b6b', fontWeight: 600, fontSize: 10, marginLeft: 6 }}><i className="fas fa-exclamation-circle"></i> {err}</span>}
                        </span>
                        {s.done && (
                          <button onClick={unlockSet} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, fontSize: 11, fontWeight: 600, padding: '0 2px' }} title="Modifier ce set">
                            <i className="fas fa-pencil" style={{ marginRight: 3 }}></i>Modifier
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 4, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.p1.split(' ')[0]}</div>
                          <input
                            type="number" min="0" max="30"
                            disabled={!isActive}
                            ref={el => inputRefs.current[idx][0] = el}
                            onChange={e => handleChange(idx, 's1', e.target.value)}
                            onBlur={() => handleBlur(idx)}
                            style={{ width: 56, textAlign: 'center', borderRadius: 6, border: `1.5px solid ${set1won ? t.primary : t.inputBorder}`, background: set1won ? `${t.primary}10` : t.inputBg, fontSize: 20, fontWeight: 900, color: set1won ? t.primary : t.textPrimary, padding: '6px 4px', outline: 'none', opacity: !isActive && !s.done ? .4 : 1 }}
                          />
                        </div>
                        <span style={{ color: t.textSecondary, fontWeight: 700 }}>–</span>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 4, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.p2.split(' ')[0]}</div>
                          <input
                            type="number" min="0" max="30"
                            disabled={!isActive}
                            ref={el => inputRefs.current[idx][1] = el}
                            onChange={e => handleChange(idx, 's2', e.target.value)}
                            onBlur={() => handleBlur(idx)}
                            onKeyDown={e => {
                              if (e.key !== 'Tab') return;
                              e.preventDefault();
                              // Valider le set courant
                              handleBlur(idx);
                              // Focus sur le s1 du set suivant (après rendu)
                              setTimeout(() => {
                                const next = inputRefs.current[idx + 1]?.[0];
                                if (next && !next.disabled) next.focus();
                              }, 50);
                            }}
                            style={{ width: 56, textAlign: 'center', borderRadius: 6, border: `1.5px solid ${set2won ? t.primary : t.inputBorder}`, background: set2won ? `${t.primary}10` : t.inputBg, fontSize: 20, fontWeight: 900, color: set2won ? t.primary : t.textPrimary, padding: '6px 4px', outline: 'none', opacity: !isActive && !s.done ? .4 : 1 }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Bandeau vainqueur */}
                {matchOver && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: `${t.primary}12`, border: `1px solid ${t.primary}`, textAlign: 'center', marginBottom: 12, marginTop: 4 }}>
                    <i className="fas fa-trophy" style={{ color: '#FFA500', marginRight: 6 }}></i>
                    <span style={{ fontWeight: 700, fontSize: 14, color: t.textPrimary }}>{winner}</span>
                    <span style={{ fontSize: 13, color: t.textSecondary, marginLeft: 4 }}>gagne le match</span>
                  </div>
                )}

                {/* Boutons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={handleSave} disabled={!matchOver} style={{
                    flex: 1, border: 'none', borderRadius: t.btnRadius, padding: '11px',
                    fontWeight: 700, fontSize: 14, cursor: matchOver ? 'pointer' : 'not-allowed',
                    background: matchOver ? t.primary : t.pageBg,
                    color: matchOver ? '#fff' : t.textSecondary,
                    transition: 'all .15s ease',
                  }}>
                    <i className="fas fa-save" style={{ marginRight: 6 }}></i>Enregistrer
                  </button>
                  <button onClick={() => { setSelected(null); setSets(initialSets()); setSetErrors(Array(MAX_SETS).fill(null)); }}
                    style={{ background: 'transparent', border: `1px solid ${t.tableBorder}`, borderRadius: t.btnRadius, padding: '11px 14px', cursor: 'pointer', color: t.textSecondary, fontSize: 14 }}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>}
    </div>
  );
};

Object.assign(window, { ResultsScreen });
