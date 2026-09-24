// ConsolanteScreen — Tableau consolante avec placement manuel par drag & drop,
// en classement intégral (structure : AppShell.buildIntegralBracket, avec byes)

const ConsolanteScreen = ({ players, pools, results, bracketResults, onUpdateBracketResults, tables = {}, onUpdateTables, testMode }) => {
  const t = window.THEME;
  const accentColor = '#f79025';
  const prefix = 'consolante';

  // ── Calcul des joueurs éligibles consolante ──────────────────────────────
  const nextPow2 = n => { let b = 1; while (b < n) b *= 2; return b; };

  const poolStandings = (pool) => window.poolStandings(pool, players, results);

  // Les 3es retenus dans le tableau principal (mode 'thirds' : les meilleurs 3es
  // complètent le tableau) ne sont pas éligibles — source unique : AppShell.buildPrincipalSeeds.
  const { thirds: principalThirds } = window.buildPrincipalSeeds({ pools, players, results });
  const principalThirdIds = new Set(principalThirds.map(e => e.player.id));
  const thirds = pools.map((pool) => {
    const p = poolStandings(pool)[2] || null;
    if (!p || principalThirdIds.has(p.id)) return null;
    return { player: p, poolId: pool.id, label: `3e (${window.poolShortLabel(pool)})` };
  }).filter(Boolean);

  // Index de la poule dans `pools` — c'est lui qui fait le numéro de TS à
  // l'intérieur d'une catégorie (cf. « Calcul des têtes de série » plus bas).
  const poolIndex = {};
  pools.forEach((pool, i) => { poolIndex[pool.id] = i; });

  const fourths = pools.map((pool) => {
    const st = poolStandings(pool);
    const p = st[3] || null;
    if (!p) return null;
    return { player: p, poolId: pool.id, label: `4e (${window.poolShortLabel(pool)})` };
  }).filter(Boolean);

  // Les 1ers et 2es sont toujours qualifiés pour le principal (mode 'byes' : exemptions
  // de 1er tour, plus d'élimination) : la consolante ne reçoit que les 3es non retenus
  // dans le principal et les 4es.

  // Aucun match de poule joué → pas de joueurs éligibles
  const totalPoolMatchesPlayed = Object.keys(results || {}).filter(k => k.startsWith('pool-')).length;

  const eligibleListRaw = totalPoolMatchesPlayed === 0 ? [] : [
    ...thirds,
    ...fourths,
  ];

  // ── Calcul des têtes de série ────────────────────────────────────────────
  // Même règle que le tableau principal (AppShell.buildPrincipalSeeds) : le RANG dans
  // la poule puis l'ORDRE DES POULES, jamais les statistiques. Tous les 3es d'abord,
  // dans l'ordre des poules (3e de A = TS 1, 3e de B = TS 2, …), puis tous les 4es dans
  // ce même ordre (4e de A = TS a+1). L'étiquette n'est qu'une information.
  // Trier par performance ici donnait un tableau qui paraissait distribué au hasard.
  const isFourth = (label) => !!label?.startsWith('4e');

  const eligibleList = [...eligibleListRaw]
    .sort((a, b) => ((isFourth(a.label) ? 1 : 0) - (isFourth(b.label) ? 1 : 0)) || (poolIndex[a.poolId] - poolIndex[b.poolId]))
    .map((e, i) => ({ ...e, seed: i + 1 }));

  // ── State ────────────────────────────────────────────────────────────────
  // Taille du bracket calculée dynamiquement selon le nombre de joueurs éligibles
  const bracketSize = nextPow2(eligibleList.length);
  const [seeds, setSeeds] = React.useState(() => {
    try {
      // Les placements des versions précédentes ont été construits avec un autre
      // pattern de seeding : on les jette au lieu de les recharger.
      window.CONSOLANTE_SEEDS_LEGACY_KEYS.forEach(k => localStorage.removeItem(k));
      const saved = localStorage.getItem(window.CONSOLANTE_SEEDS_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      // Réinitialise si la taille ne correspond plus
      if (parsed && parsed.length === bracketSize) return parsed;
    } catch {}
    return Array(bracketSize).fill(null);
  });
  const [dragItem, setDragItem] = React.useState(null); // { player, fromSlot: null|number }
  const [dragOver, setDragOver] = React.useState(null);
  const [modal, setModal] = React.useState(null);
  const [score, setScore] = React.useState({ p1: '', p2: '' });
  const firstInputRef = React.useRef(null);
  const saveBtnRef = React.useRef(null);
  // Les tableaux se jouent TOUJOURS en 3 sets gagnants (best of 5). Le réglage
  // `setsToWin` (2 ou 3) ne concerne QUE les matchs de poule — c'est voulu, ce n'est
  // pas un oubli de câblage : ne pas le brancher ici.
  const SETS_TO_WIN = 3;


  React.useEffect(() => {
    try { localStorage.setItem(window.CONSOLANTE_SEEDS_KEY, JSON.stringify(seeds)); } catch {}
  }, [seeds]);

  // Resynchronise les seeds si la structure change en cours de session
  // (résultat de poule corrigé, poule modifiée…) :
  // taille de bracket différente → reset ; joueur plus éligible → retiré du tableau.
  const eligibleIdsKey = eligibleList.map(e => e.player.id).sort((a, b) => a - b).join(',');
  React.useEffect(() => {
    setSeeds(prev => {
      if (prev.length !== bracketSize) return Array(bracketSize).fill(null);
      const ok = new Set(eligibleList.map(e => e.player.id));
      const cleaned = prev.map(p => (p && ok.has(p.id) ? p : null));
      return cleaned.some((v, i) => v !== prev[i]) ? cleaned : prev;
    });
  }, [bracketSize, eligibleIdsKey]);

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

  const autoPlace = () => {
    // Placement délégué à AppShell.assignBracketSlots — la MÊME fonction que le tableau
    // principal, pour que les deux répartissent à l'identique. Les 3es (TS 1..a) puis les
    // 4es (TS a+1..a+b), chacun en moitié opposée du 3e de sa poule pour ne le rejouer
    // que le plus tard possible, et les exemptions de 1er tour aux MEILLEURES TS.
    const ordered = [...eligibleList].sort((a, b) => a.seed - b.seed);   // déjà trié, par sûreté
    const numbered = ordered.map(e => ({ poolId: e.poolId, poolRank: isFourth(e.label) ? 4 : 3, seed: e.seed }));
    const slotOf = window.assignBracketSlots(bracketSize, bracketSize - ordered.length, numbered);
    const slotToPlayer = {};
    ordered.forEach(e => { slotToPlayer[slotOf[e.seed]] = e.player; });

    // Réécrit tous les slots selon le pattern (AppShell.buildSeedingPattern). Les seeds
    // sans joueur deviennent des byes, face aux TS que le pattern désigne.
    const pattern = window.buildSeedingPattern(bracketSize);
    setSeeds(pattern.map(targetSeed => slotToPlayer[targetSeed] || null));
  };

  // Données de test : scores aléatoires sur tous les matchs restants (les résultats
  // déjà saisis sont conservés). Tour par tour, puisque chaque tour dépend du précédent.
  const generateScores = () => {
    onUpdateBracketResults(prev => {
      const next = { ...prev };
      let b = window.buildIntegralBracket(seeds, prefix, next, { byes: true });
      for (let round = 1; round <= b.totalRounds; round++) {
        b.groups.filter(g => g.round === round).forEach(g => g.matches.forEach(m => {
          if (!m.p1 || !m.p2 || next[m.id]) return;
          const winner = Math.random() < 0.5 ? 1 : 2;
          const loserSets = Math.floor(Math.random() * SETS_TO_WIN);
          next[m.id] = { p1: m.p1, p2: m.p2, winner, score1: winner === 1 ? SETS_TO_WIN : loserSets, score2: winner === 2 ? SETS_TO_WIN : loserSets };
        }));
        b = window.buildIntegralBracket(seeds, prefix, next, { byes: true });
      }
      return next;
    });
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

  // Dès que le vainqueur est désigné, le curseur passe sur « Enregistrer » — même
  // comportement que le tableau principal (KnockoutScreen, dans index.html).
  React.useEffect(() => {
    if (modal && autoWinner) saveBtnRef.current?.focus();
  }, [autoWinner, modal?.matchId]);

  // Classement intégral — même construction que le tableau principal, mais avec
  // des byes : la consolante n'est pas forcément pleine (taille = puissance de 2
  // supérieure), un slot vide au 1er tour est un bye qui se propage.
  const { groups, totalRounds, descendants } = window.buildIntegralBracket(seeds, prefix, bracketResults, { byes: true });

  // Ménage des tables : le placement consolante se refait à volonté (« Auto »,
  // drag & drop), et les ids de match changent avec la taille du bracket. Une
  // attribution orpheline occuperait une table sans qu'aucune carte ne l'affiche.
  // Rien au-dessus de cette ligne ne sort du rendu : le hook tourne bien à tous
  // les rendus, avant les sorties anticipées plus bas.
  const liveMatchIds = groups.flatMap(g => g.matches.map(m => m.id)).join('|');
  React.useEffect(() => {
    onUpdateTables?.(prev => window.pruneTables(prev, prefix, liveMatchIds ? liveMatchIds.split('|') : []));
  }, [liveMatchIds]);
  const columns = Array.from({ length: totalRounds }, (_, i) => ({
    round: i + 1,
    groups: groups.filter(g => g.round === i + 1).sort((a, b) => a.startPlace - b.startPlace),
  }));
  const hasPendingMatch = groups.some(g => g.matches.some(m => m.p1 && m.p2 && !bracketResults[m.id]));

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

  // Effacer un résultat efface aussi sa chaîne de dépendance (branches vainqueur
  // ET perdant), sinon des scores orphelins resteraient affichés en aval.
  const clearResult = (matchId, e) => {
    e.stopPropagation();
    onUpdateBracketResults(prev => {
      const n = { ...prev };
      delete n[matchId];
      (descendants[matchId] || []).forEach(id => { delete n[id]; });
      return n;
    });
  };

  // ── Composants visuels ───────────────────────────────────────────────────
  // `gold` : le vainqueur de la finale a une coupe en or, les autres la couleur de l'écran
  const PlayerRow = ({ player, isWinner, sc, isBye, gold }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: isWinner ? `${accentColor}18` : 'transparent', opacity: player ? 1 : 0.35 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {isWinner && <i className="fas fa-trophy" style={{ color: gold ? '#FFA500' : accentColor, fontSize: gold ? 12 : 10 }}></i>}
        <span style={{ fontSize: 12, fontWeight: isWinner ? 700 : 500, color: t.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
          {player ? player.name : (isBye ? '— Exempt —' : '—')}
        </span>
      </div>
      {sc !== undefined && sc !== '' && (
        <span style={{ fontSize: 12, fontWeight: 700, color: isWinner ? accentColor : t.textSecondary }}>{sc}</span>
      )}
    </div>
  );

  const MatchCard = ({ match, isHighlight, customLabel }) => {
    const r = bracketResults[match.id];
    const winner = r?.winner;
    const canPlay = match.p1 && match.p2;
    // Exempt (bye structurel, à n'importe quel tour) : le match ne se joue pas, l'autre passe
    const isByeMatch = match.bye1 || match.bye2;
    // Table attribuée = match en cours : même bleu que le tableau principal
    // (AppShell.LIVE_MATCH_COLOR) — c'est un état du match, pas une couleur d'écran.
    const live = tables[match.id] !== undefined;
    const liveColor = window.LIVE_MATCH_COLOR;
    return (
      <div onClick={() => canPlay && openModal(match.id, match.p1, match.p2)}
        style={{ background: live ? `${liveColor}1f` : isByeMatch ? `${t.cardBg}88` : t.cardBg, border: `1.5px solid ${isHighlight ? accentColor : live ? `${liveColor}80` : t.tableBorder}`, borderRadius: t.cardRadius, overflow: 'hidden', cursor: canPlay ? 'pointer' : 'default', boxShadow: isHighlight ? `0 0 0 3px ${accentColor}25` : t.cardShadow, minWidth: 170, opacity: isByeMatch ? 0.6 : 1, userSelect: 'none' }}>
        {(isHighlight || r || customLabel) && (
          <div style={{ padding: '4px 10px', background: isHighlight ? accentColor : t.tableHeaderBg, borderBottom: `1px solid ${t.tableBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {(isHighlight || customLabel) && <span style={{ fontSize: 10, fontWeight: 700, color: isHighlight ? '#fff' : t.textSecondary, textTransform: 'uppercase', letterSpacing: '.4px' }}>{isHighlight ? 'Finale cons.' : customLabel}</span>}
            {!isHighlight && !customLabel && <span></span>}
            {r && <button onClick={e => clearResult(match.id, e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isHighlight ? 'rgba(255,255,255,.7)' : t.textSecondary, fontSize: 10, padding: 0 }}><i className="fas fa-times"></i></button>}
          </div>
        )}
        <PlayerRow player={match.p1} isWinner={winner === 1} sc={r?.score1} isBye={match.bye1} gold={isHighlight} />
        {/* Filet + case de table : toute la ligne disparaît dès que le score est
            saisi. Le match est terminé, il n'occupe plus de table et ses deux
            lignes de joueurs se lisent avec leurs scores. */}
        {!r && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px' }}>
            {live && <window.LiveMatchBadge />}
            <div style={{ flex: 1, height: 1, background: t.tableBorder }}></div>
            <window.TableSelect t={t} tables={tables} matchId={match.id}
              active={!!canPlay && !r && !isByeMatch} onUpdateTables={onUpdateTables} />
            <div style={{ flex: 1, height: 1, background: t.tableBorder }}></div>
          </div>
        )}
        <PlayerRow player={match.p2} isWinner={winner === 2} sc={r?.score2} isBye={match.bye2} gold={isHighlight} />
      </div>
    );
  };

  const ColHeader = ({ label }) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10, whiteSpace: 'nowrap' }}>{label}</div>
  );

  // Encadré d'un bloc de matchs de classement
  const boxStyle = { padding: 14, border: `1.5px solid ${t.tableBorder}`, borderRadius: t.cardRadius, background: '#e9ebee' };

  const GroupLabel = ({ label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 8px' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: t.tableBorder }}></div>
    </div>
  );

  // Un groupe = un tour d'un sous-tableau (même rendu que le tableau principal)
  const renderGroup = (g) => {
    const isSpine = g.startPlace === 1;
    const isFinal = isSpine && g.size === 2;
    const terminal = g.size === 2;
    const label = window.placementLabel(g);
    return (
      <div key={g.key} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!isSpine && !terminal && <GroupLabel label={label} />}
        {g.matches.map(m => (
          <MatchCard key={m.id} match={m} isHighlight={isFinal}
            customLabel={terminal && !isFinal ? label : undefined} />
        ))}
      </div>
    );
  };

  // ── Phase de placement ────────────────────────────────────────────────────
  const [showBracket, setShowBracket] = React.useState(() => {
    return seeds.some(Boolean);
  });

  // ── Vue vide ─────────────────────────────────────────────────────────────
  // Garde-fou : tous les matchs de poule doivent être terminés
  let totalPoolMatches = 0, playedPoolMatches = 0;
  pools.forEach(pool => {
    const ids = pool.playerIds;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        totalPoolMatches++;
        if (results[window.poolMatchKey(pool.id, ids[i], ids[j])]) playedPoolMatches++;
      }
    }
  });
  const poolsIncomplete = pools.length > 0 && playedPoolMatches < totalPoolMatches;

  if (poolsIncomplete) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ background: accentColor, color: '#fff', borderRadius: 6, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>Consolante</span>
        </div>
        <div style={{ padding: '64px 24px', textAlign: 'center', background: t.cardBg, border: `1.5px dashed ${t.tableBorder}`, borderRadius: t.cardRadius, color: t.textSecondary }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 18px', borderRadius: '50%', background: `${accentColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-hourglass-half" style={{ fontSize: 26, color: accentColor }}></i>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>Consolante pas encore disponible</div>
          <div style={{ fontSize: 13, maxWidth: 380, margin: '0 auto 20px', lineHeight: 1.5 }}>
            Termine tous les matchs de poules pour que les classements soient figés et que la consolante puisse être générée.
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderRadius: 10, background: t.tableHeaderBg, fontSize: 12 }}>
            <span><i className="fas fa-table-tennis-paddle-ball" style={{ marginRight: 6, opacity: 0.5 }}></i><strong style={{ color: t.textPrimary }}>{playedPoolMatches}</strong> / {totalPoolMatches} matchs joués</span>
            <span style={{ width: 1, height: 14, background: t.tableBorder }}></span>
            <span><i className="fas fa-layer-group" style={{ marginRight: 6, opacity: 0.5 }}></i><strong style={{ color: t.textPrimary }}>{pools.length}</strong> poule{pools.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    );
  }

  if (players.length === 0 || pools.length === 0 || eligibleList.length === 0) {
    const reason = players.length === 0
      ? { icon: 'fa-users', title: 'Aucun joueur inscrit', hint: "Ajoute des joueurs dans l'onglet Poules pour démarrer le tournoi." }
      : pools.length === 0
      ? { icon: 'fa-layer-group', title: 'Aucune poule configurée', hint: "Crée des poules dans l'onglet Poules pour générer la consolante." }
      : { icon: 'fa-hourglass-half', title: 'Consolante pas encore disponible', hint: 'Joue les matchs de poules — les 3es et 4es seront automatiquement éligibles ici.' };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ background: accentColor, color: '#fff', borderRadius: 6, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>Consolante</span>
        </div>
        <div style={{ padding: '64px 24px', textAlign: 'center', background: t.cardBg, border: `1.5px dashed ${t.tableBorder}`, borderRadius: t.cardRadius, color: t.textSecondary }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 18px', borderRadius: '50%', background: `${accentColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`fas ${reason.icon}`} style={{ fontSize: 26, color: accentColor }}></i>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>{reason.title}</div>
          <div style={{ fontSize: 13, maxWidth: 380, margin: '0 auto 20px', lineHeight: 1.5 }}>{reason.hint}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderRadius: 10, background: t.tableHeaderBg, fontSize: 12 }}>
            <span><i className="fas fa-user" style={{ marginRight: 6, opacity: 0.5 }}></i><strong style={{ color: t.textPrimary }}>{players.length}</strong> joueur{players.length > 1 ? 's' : ''}</span>
            <span style={{ width: 1, height: 14, background: t.tableBorder }}></span>
            <span><i className="fas fa-layer-group" style={{ marginRight: 6, opacity: 0.5 }}></i><strong style={{ color: t.textPrimary }}>{pools.length}</strong> poule{pools.length > 1 ? 's' : ''}</span>
            <span style={{ width: 1, height: 14, background: t.tableBorder }}></span>
            <span><i className="fas fa-trophy" style={{ marginRight: 6, opacity: 0.5 }}></i><strong style={{ color: t.textPrimary }}>{eligibleList.length}</strong> éligible{eligibleList.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ background: accentColor, color: '#fff', borderRadius: 6, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>Consolante</span>
        <span style={{ fontSize: 12, color: t.textSecondary }}>
          {eligibleList.length} joueurs éligibles · tableau de {bracketSize}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {/* Retour au placement — seulement depuis le tableau : en vue placement,
              c'est le bouton « Voir le tableau → » du bas qui fait l'aller. */}
          {showBracket && (
            <button onClick={() => setShowBracket(false)}
              style={{ padding: '5px 14px', borderRadius: 8, border: `1.5px solid ${t.tableBorder}`, background: 'transparent', color: t.textPrimary, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              <i className="fas fa-list" style={{ marginRight: 6 }}></i>Placement
            </button>
          )}
          {/* Données de test : réservé au mode test (bascule dans la sidebar) */}
          {showBracket && testMode && (
            <button onClick={generateScores} disabled={!hasPendingMatch}
              style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: hasPendingMatch ? accentColor : t.tableBorder, color: hasPendingMatch ? '#fff' : t.textSecondary, fontWeight: 600, fontSize: 12, cursor: hasPendingMatch ? 'pointer' : 'default' }}>
              <i className="fas fa-dice" style={{ marginRight: 6 }}></i>Générer les scores
            </button>
          )}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                Joueurs à placer ({unplaced.length})
              </div>
              <button onClick={autoPlace}
                title="Place automatiquement les joueurs selon leur n° de sortie de poules (réinitialise les slots, vous pouvez ensuite intervertir manuellement)"
                style={{ padding: '5px 10px', borderRadius: 6, border: `1.5px solid ${accentColor}`, background: `${accentColor}12`, color: accentColor, fontWeight: 700, fontSize: 10, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' }}>
                <i className="fas fa-magic" style={{ marginRight: 5 }}></i>Auto
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {unplaced.map((entry, i) => (
                <div key={entry.player.id} draggable
                  onDragStart={e => handleDragStartList(e, entry)}
                  style={{ background: t.cardBg, border: `1.5px solid ${t.tableBorder}`, borderRadius: 8, padding: '8px 12px', cursor: 'grab', userSelect: 'none', display: 'flex', flexDirection: 'column', gap: 2, boxShadow: t.cardShadow }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-grip-vertical" style={{ color: t.textSecondary, fontSize: 10, opacity: 0.5 }}></i>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.player.name}</span>
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
              Bracket — {bracketSize} slots ({seeds.filter(Boolean).length} placés, {bracketSize - seeds.filter(Boolean).length} exempt{bracketSize - seeds.filter(Boolean).length > 1 ? 's' : ''})
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
                        {isOver ? 'Déposer ici' : ''}
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
        /* ── Vue Tableau (bracket) ── une colonne par tour ; l'épine principale en
           haut, puis, bien détachés, les sous-tableaux de classement encadrés
           (un par sous-tableau ouvert, un seul pour les matchs de place terminaux). */
        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 12 }}>
          {columns.map((col, cIdx) => {
            const spine = col.groups.filter(g => g.startPlace === 1);
            const placement = col.groups.filter(g => g.startPlace !== 1);
            return (
              <div key={col.round} style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, minWidth: 185 }}>
                <ColHeader label={roundLabel(cIdx, totalRounds)} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {spine.map(renderGroup)}
                </div>
                {placement.length > 0 && (
                  <div style={{ marginTop: 64, display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {placement.filter(g => g.size > 2).map(g => (
                      <div key={g.key} style={boxStyle}>{renderGroup(g)}</div>
                    ))}
                    {placement.some(g => g.size === 2) && (
                      <div style={{ ...boxStyle, display: 'flex', flexDirection: 'column', gap: 18 }}>
                        {placement.filter(g => g.size === 2).map(renderGroup)}
                      </div>
                    )}
                  </div>
                )}
              </div>
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
              <button ref={saveBtnRef} onClick={saveResult} disabled={!autoWinner}
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
