// ResultsScreen — Saisie des résultats par set
// Format : 2 ou 3 sets gagnants selon le réglage de l'écran Poules (prop `setsToWin`),
// 11 pts minimum, 2 pts d'écart, 30 pts maximum par set
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
      // Paire canonique (petit id en premier) — la clé et l'orientation des sets
      // ne dépendent plus de la position des joueurs dans la poule
      const lo = Math.min(pIds[i], pIds[j]);
      const hi = Math.max(pIds[i], pIds[j]);
      matches.push({
        id: window.poolMatchKey(pool.id, lo, hi),
        round: pool.name,
        poolIdx: pools.indexOf(pool),
        p1Id: lo,
        p2Id: hi,
        p1: players.find(p => p.id === lo)?.name || '?',
        p2: players.find(p => p.id === hi)?.name || '?',
      });
    }
  }
  return matches;
};

// --- Données de test ---------------------------------------------------------
// Un set valide au sens de isSetValid : 11 contre 0-9, ou prolongation à +2.
// `winnerIsP1` oriente le score sur (p1Id, p2Id), c.-à-d. (petit id, grand id).
const randomSet = (winnerIsP1) => {
  const deuce = Math.random() < 0.2;                        // 1 set sur 5 en prolongation
  const loser = deuce ? 10 + Math.floor(Math.random() * 4) : Math.floor(Math.random() * 10);
  const hi = deuce ? loser + 2 : 11;
  return winnerIsP1 ? [hi, loser] : [loser, hi];
};

// Résultat complet d'un match : vainqueur tiré à pile ou face, puis un nombre de
// sets cohérent avec le format (entre setsToWin et setsToWin * 2 - 1 manches).
const randomResult = (setsToWin) => {
  const p1Wins = Math.random() < 0.5;
  const loserSets = Math.floor(Math.random() * setsToWin);  // 0 … setsToWin - 1
  const order = [
    ...Array(setsToWin - 1).fill(true),
    ...Array(loserSets).fill(false),
  ];
  for (let i = order.length - 1; i > 0; i--) {              // mélange de Fisher-Yates
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  order.push(true);                                         // le dernier set revient au vainqueur
  return { sets: order.map(wonByWinner => randomSet(wonByWinner === p1Wins)) };
};

const emptySet = () => ({ s1: '', s2: '', done: false });

const ResultsScreen = ({ players, pools, results, setsToWin = 3, onUpdateResults, testMode }) => {
  const t = window.THEME;
  // Format dynamique : best-of-3 (2 sets gagnants) ou best-of-5 (3 sets gagnants)
  const SETS_TO_WIN = setsToWin;
  const MAX_SETS = setsToWin * 2 - 1;
  const initialSets = React.useCallback(() => Array.from({ length: MAX_SETS }, emptySet), [MAX_SETS]);

  // Sous-onglet mémorisé : on retrouve « À jouer » ou « Terminés » tel qu'on l'a laissé
  // en revenant sur l'écran (ou après rechargement).
  const [tab, setTab] = React.useState(() => window.loadState('ertt-results-tab', 'pending'));
  React.useEffect(() => { window.saveState('ertt-results-tab', tab); }, [tab]);
  const [selected, setSelected] = React.useState(null);
  const [sets, setSets] = React.useState(() => Array.from({ length: MAX_SETS }, emptySet));
  const [setErrors, setSetErrors] = React.useState(() => Array(MAX_SETS).fill(null));
  const scorePanelRef = React.useRef(null);
  const saveBtnRef = React.useRef(null);
  // Refs pour focus automatique: inputRefs[setIdx][0=s1, 1=s2]
  const inputRefs = React.useRef(Array.from({ length: MAX_SETS }, () => [null, null]));

  // Si le format change (ne peut arriver que sans résultat enregistré, cf. verrou côté Poules),
  // on resynchronise les tailles internes.
  React.useEffect(() => {
    setSets(Array.from({ length: MAX_SETS }, emptySet));
    setSetErrors(Array(MAX_SETS).fill(null));
    inputRefs.current = Array.from({ length: MAX_SETS }, () => [null, null]);
    setSelected(null);
  }, [MAX_SETS]);

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

  // Focus automatique — source unique du placement du curseur pendant la saisie :
  // le set actif attire le curseur sur le score du joueur 1, et dès que le vainqueur
  // est désigné c'est le bouton « Enregistrer » qui le prend (Entrée valide alors le match).
  // Les dépendances ne changent qu'au passage d'un set au suivant, jamais pendant la
  // frappe : le curseur n'est donc pas volé si l'utilisateur revient sur le 2e champ.
  React.useEffect(() => {
    if (!selected) return;
    const el = matchOver ? saveBtnRef.current : inputRefs.current[activeSetIdx]?.[0];
    if (el && !el.disabled) el.focus({ preventScroll: true });
  }, [selected?.id, activeSetIdx, matchOver]);

  const handleSelect = (m) => {
    setSelected(m);
    setSets(initialSets());
    setSetErrors(Array(MAX_SETS).fill(null));
    setTimeout(() => {
      // Le curseur est placé par l'effet de focus ci-dessus ; ici, uniquement le défilement.
      const el = scorePanelRef.current;
      if (!el) return;
      // Fait défiler le premier ancêtre scrollable (pas de scrollIntoView,
      // qui peut faire défiler la page hôte)
      let sc = el.parentElement;
      while (sc && sc.scrollHeight <= sc.clientHeight + 1) sc = sc.parentElement;
      if (!sc) return;
      const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 16;
      sc.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }, 50);
  };

  // Mise à jour d'un score (frappe clavier) — pas de validation ici,
  // mais une nouvelle frappe efface l'erreur affichée sur ce set
  const handleChange = (idx, key, val) => {
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, [key]: val } : s));
    setSetErrors(e => (e[idx] ? e.map((v, i) => i === idx ? null : v) : e));
  };

  // Le score saisi manuellement est toujours traité comme le plus petit des deux
  // (le perdant du set) : victoire normale à 11 si ≤ 9, sinon +2 points d'écart.
  const computeOtherScore = (val) => {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 0 || n > 30) return null;
    return n <= 9 ? 11 : n + 2;
  };

  // Validation au blur — lit l'état courant, aucun effet de bord dans les updaters
  // Complète automatiquement l'autre score du set à partir de celui qu'on vient de saisir.
  const handleBlur = (idx, key) => {
    const s = sets[idx];
    if (s.done || s[key] === '') return;
    const otherKey = key === 's1' ? 's2' : 's1';
    const computed = computeOtherScore(s[key]);
    const otherVal = computed === null ? s[otherKey] : String(computed);
    const merged = { ...s, [otherKey]: otherVal };

    if (merged.s1 === '' || merged.s2 === '') {
      setSets(prev => prev.map((ss, i) => i === idx ? merged : ss));
      return;
    }

    const err = scoreError(merged.s1, merged.s2);
    if (err) {
      setSets(prev => prev.map((ss, i) => i === idx ? merged : ss));
      setSetErrors(e => e.map((v, i) => i === idx ? err : v));
      return;
    }
    if (!isSetValid(merged.s1, merged.s2)) {
      // Score plausible mais incomplet (ex. 5–3) : feedback explicite
      setSets(prev => prev.map((ss, i) => i === idx ? merged : ss));
      setSetErrors(e => e.map((v, i) => i === idx ? 'Set incomplet — il faut 11 pts (2 pts d\'écart)' : v));
      return;
    }
    setSetErrors(e => e.map((v, i) => i === idx ? null : v));
    setSets(prev => prev.map((ss, i) => i === idx ? { ...merged, done: true } : ss));
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

  // Remplit d'un coup tous les matchs sans résultat — les scores déjà saisis
  // ne sont pas touchés.
  const generateAllResults = () => {
    if (pending.length === 0) return;
    onUpdateResults(prev => {
      const next = { ...prev };
      pending.forEach(m => { next[m.id] = randomResult(SETS_TO_WIN); });
      return next;
    });
    setSelected(null);
    setSets(initialSets());
    setTab('done');
  };

  const getRoundColor = (m) => POOL_COLORS[m.poolIdx % POOL_COLORS.length];

  // Largeur du bandeau de poule, partagée par les deux listes : c'est elle qui met
  // les noms de joueurs à la même abscisse d'une carte à l'autre, et d'un onglet à l'autre.
  const MATCH_TAG_WIDTH = 62;

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

      {/* Liste des matchs — largeur plafonnée : une carte de match tient en une ligne,
          l'étirer sur tout l'écran creuse un vide entre les deux noms de joueurs.
          Même plafond que le classement du tableau principal (BracketsScreen). */}
      <div style={{ flex: 1, minWidth: 0, maxWidth: 540 }}>

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
        {/* Données de test : réservé au mode test (bascule dans la sidebar) */}
        {testMode && (
          <button onClick={generateAllResults} disabled={pending.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 16px', borderRadius: t.btnRadius, border: 'none',
              background: pending.length === 0 ? t.tableBorder : t.primary,
              color: pending.length === 0 ? t.textSecondary : t.primaryText,
              fontWeight: 700, fontSize: 13,
              cursor: pending.length === 0 ? 'default' : 'pointer',
            }}>
            <i className="fas fa-dice" style={{ fontSize: 14 }}></i>
            Générer les scores
          </button>
        )}
        </div>

        {/* À jouer */}
        {tab === 'pending' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                  // Bordure toujours à 1px : un 2px sur la carte sélectionnée décalait
                  // toute la liste d'un pixel à chaque sélection. L'anneau porte l'état.
                  border: `1px solid ${isSel ? t.primary : t.tableBorder}`,
                  boxShadow: isSel ? `0 0 0 2px ${t.primary}22` : t.cardShadow,
                  // Padding vertical calé pour que la carte fasse la même hauteur (55px) qu'une carte
                  // de match terminé, qui porte une ligne de détail des sets en plus.
                  padding: '19px 12px', cursor: 'pointer', transition: 'all .15s ease',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ minWidth: MATCH_TAG_WIDTH, textAlign: 'center', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: t.tagRadius, background: rc.bg, color: rc.color, whiteSpace: 'nowrap' }}>{m.round}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: t.textPrimary }}>{m.p1}</span>
                  <span style={{ fontSize: 10, background: t.pageBg, border: `1px solid ${t.tableBorder}`, padding: '1px 6px', borderRadius: 5, fontWeight: 700, color: t.textSecondary }}>VS</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: t.textPrimary, textAlign: 'right' }}>{m.p2}</span>
                  <span style={{ width: 12, textAlign: 'right', flexShrink: 0 }}>
                    {isSel && <i className="fas fa-pen" title="Saisie en cours" style={{ fontSize: 11, color: t.primary }}></i>}
                  </span>
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
                <div key={m.id} style={{ background: t.cardBg, borderRadius: t.cardRadius, border: `1px solid ${t.tableBorder}`, padding: '8px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ minWidth: MATCH_TAG_WIDTH, textAlign: 'center', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: t.tagRadius, background: rc.bg, color: rc.color, whiteSpace: 'nowrap' }}>{m.round}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: p1won ? 700 : 500, color: p1won ? t.textPrimary : t.textSecondary }}>{m.p1}</span>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 15, fontWeight: 900, color: p1won ? t.primary : t.textSecondary }}>{w1}</span>
                      <span style={{ fontSize: 11, color: t.textSecondary }}>–</span>
                      <span style={{ fontSize: 15, fontWeight: 900, color: !p1won ? t.primary : t.textSecondary }}>{w2}</span>
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: !p1won ? 700 : 500, color: !p1won ? t.textPrimary : t.textSecondary, textAlign: 'right' }}>{m.p2}</span>
                  </div>
                  {/* Détail des sets aligné sur les noms, pas sur le bord de la carte */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, marginLeft: MATCH_TAG_WIDTH + 10, flexWrap: 'wrap' }}>
                    {(r?.sets || []).map(([s1, s2], i) => {
                      const sw = s1 > s2;
                      return (
                        <span key={i} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 5, background: t.pageBg, border: `1px solid ${t.tableBorder}`, color: t.textSecondary }}>
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
                  Saisissez le plus petit score dans la case du perdant
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
                            value={s.s1}
                            ref={el => inputRefs.current[idx][0] = el}
                            onChange={e => handleChange(idx, 's1', e.target.value)}
                            onBlur={() => handleBlur(idx, 's1')}
                            style={{ width: 56, textAlign: 'center', borderRadius: 6, border: `1.5px solid ${set1won ? t.primary : t.inputBorder}`, background: set1won ? `${t.primary}10` : t.inputBg, fontSize: 20, fontWeight: 900, color: set1won ? t.primary : t.textPrimary, padding: '6px 4px', outline: 'none', opacity: !isActive && !s.done ? .4 : 1 }}
                          />
                        </div>
                        <span style={{ color: t.textSecondary, fontWeight: 700 }}>–</span>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 4, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.p2.split(' ')[0]}</div>
                          <input
                            type="number" min="0" max="30"
                            disabled={!isActive}
                            value={s.s2}
                            ref={el => inputRefs.current[idx][1] = el}
                            onChange={e => handleChange(idx, 's2', e.target.value)}
                            onBlur={() => handleBlur(idx, 's2')}
                            onKeyDown={e => {
                              if (e.key !== 'Tab') return;
                              e.preventDefault();
                              // Valider le set courant : l'effet de focus enchaîne
                              // sur le set suivant, ou sur « Enregistrer » si le match est plié.
                              handleBlur(idx, 's2');
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
                  <button ref={saveBtnRef} onClick={handleSave} disabled={!matchOver} style={{
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
