// PoolsScreen — Joueurs, format et constitution des poules (répartition auto)
// Reçoit : players, pools, onUpdatePlayers, onUpdatePools, poolsLocked, onUpdatePoolsLocked

const PoolsScreen = ({ theme, players, pools, results, setsToWin, onUpdateSetsToWin, onUpdatePlayers, onUpdatePools, poolsLocked = false, onUpdatePoolsLocked }) => {
  const t = window.THEMES[theme];
  const [newName, setNewName] = React.useState('');
  const [newRanking, setNewRanking] = React.useState('');
  const [addingToPool, setAddingToPool] = React.useState(null); // poolId en cours d'ajout
  const [confirmDeletePool, setConfirmDeletePool] = React.useState(null); // poolId en attente de confirmation
  const [confirmDeletePlayer, setConfirmDeletePlayer] = React.useState(null); // playerId en attente de confirmation
  const [showAutoDraw, setShowAutoDraw] = React.useState(false); // modale de répartition automatique
  const [autoPoolCount, setAutoPoolCount] = React.useState(null); // null = valeur par défaut (poules de 4)
  const [confirmUnlock, setConfirmUnlock] = React.useState(false); // modale de déverrouillage des poules
  const [csvPreview, setCsvPreview] = React.useState(null); // aperçu de l'import CSV avant validation
  const [csvError, setCsvError] = React.useState(null);     // fichier illisible ou vide
  const nameInputRef = React.useRef(null); // pour rendre le focus au nom après chaque ajout
  const csvInputRef = React.useRef(null);  // <input type="file"> caché, ouvert par le bouton « Importer »

  // Format verrouillé dès qu'un match de poule a un résultat enregistré
  const formatLocked = Object.keys(results || {}).some(k => k.startsWith('pool-'));

  // Poules verrouillées (`poolsLocked`, état d'App persisté) : posé par la répartition
  // auto pour figer la composition une fois le tournoi lancé. Tant qu'il est actif,
  // aucune action de modification n'est rendue — ni sur les poules (création,
  // suppression, ajout/retrait de joueur, nouvelle répartition), ni sur les joueurs
  // déjà placés. Seul « Déverrouiller » (confirmé) le lève ; les purges automatiques
  // d'App (résultats de poule orphelins) prennent le relais ensuite.
  const locked = !!poolsLocked;

  // Joueurs déjà assignés à une poule
  const assignedIds = new Set(pools.flatMap(p => p.playerIds));
  const unassigned = players.filter(p => !assignedIds.has(p.id));

  const addPlayer = () => {
    if (!newName.trim()) return;
    // Champ vide, valeur illisible ou inférieure au plancher : le joueur est traité
    // comme un loisir à 500 points (window.normalizeRanking, AppShell).
    const ranking = window.normalizeRanking(newRanking.trim());
    onUpdatePlayers(prev => [...prev, { id: Date.now(), name: newName.trim(), ranking }]);
    setNewName('');
    setNewRanking('');
    // Saisie en rafale : le curseur revient au nom, jamais au classement.
    nameInputRef.current?.focus();
  };

  // ─── Import CSV ───────────────────────────────────────────────────────────
  // Le parseur (`window.parsePlayersCsv`, AppShell) fait la lecture ; l'écran ne
  // s'occupe que du fichier, des doublons et de la confirmation.

  // Clé de comparaison des noms : casse, accents et espaces multiples ignorés —
  // « Léa Martin » et « lea  martin » désignent le même joueur.
  const nameKey = (name) => name.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

  // UTF-8 d'abord, repli Windows-1252 si le décodage a produit des caractères de
  // remplacement : c'est l'encodage des CSV exportés par les Excel français, et
  // sans ce repli tous les noms accentués arrivent en charabia.
  const readCsvFile = async (file) => {
    const buffer = await file.arrayBuffer();
    const utf8 = new TextDecoder('utf-8').decode(buffer);
    return utf8.includes('\uFFFD') ? new TextDecoder('windows-1252').decode(buffer) : utf8;
  };

  const handleCsvFile = async (file) => {
    if (!file) return;
    let parsed;
    try {
      parsed = window.parsePlayersCsv(await readCsvFile(file));
    } catch (err) {
      setCsvPreview(null);
      setCsvError(`« ${file.name} » n'a pas pu être lu.`);
      return;
    }
    // Fichier qui n'est pas du texte, malgré l'extension. Le cas de loin le plus
    // fréquent : un document TextEdit resté en texte enrichi, enregistré en .csv.
    if (parsed.error) {
      setCsvPreview(null);
      setCsvError({
        rtf: `« ${file.name} » est un document en texte enrichi (RTF), pas un fichier texte. Dans TextEdit : menu Format ▸ « Convertir au format Texte », puis enregistrer.`,
        zip: `« ${file.name} » est un classeur (Excel, Numbers…), pas un CSV. Depuis le tableur : Fichier ▸ Exporter / Enregistrer sous ▸ CSV.`,
        pdf: `« ${file.name} » est un PDF, pas un fichier texte.`,
      }[parsed.error] || `« ${file.name} » n'est pas un fichier texte.`);
      return;
    }
    if (parsed.players.length === 0 && parsed.ignored.length === 0) {
      setCsvPreview(null);
      setCsvError(`Aucun joueur trouvé dans « ${file.name} ».`);
      return;
    }
    // Doublons : dans le fichier lui-même comme avec les joueurs déjà saisis.
    // Ils sont écartés, mais listés dans l'aperçu — jamais perdus en silence.
    const seen = new Set(players.map(p => nameKey(p.name)));
    const toImport = [], duplicates = [];
    parsed.players.forEach(entry => {
      const key = nameKey(entry.name);
      if (seen.has(key)) { duplicates.push(entry); return; }
      seen.add(key);
      toImport.push(entry);
    });
    setCsvError(null);
    setCsvPreview({ fileName: file.name, players: toImport, ignored: parsed.ignored, duplicates });
  };

  // Les joueurs importés s'ajoutent à la liste, ils ne la remplacent pas.
  // Un seul appel à Date.now() pour toute la fournée (ids en double sinon), et
  // jamais en dessous du plus grand id existant : deux imports dans la même
  // milliseconde ne doivent pas se marcher dessus.
  const applyCsvImport = () => {
    const entries = csvPreview?.players || [];
    if (entries.length) {
      onUpdatePlayers(prev => {
        const base = Math.max(Date.now(), ...prev.map(p => p.id).filter(Number.isFinite), 0) + 1;
        return [...prev, ...entries.map((entry, i) => ({ id: base + i, name: entry.name, ranking: entry.ranking }))];
      });
    }
    setCsvPreview(null);
  };

  // Meilleur classé (points les plus élevés) en premier ; non classés relégués en fin de liste.
  const sortedPlayers = [...players].sort((a, b) => {
    const ra = typeof a.ranking === 'number' ? a.ranking : -Infinity;
    const rb = typeof b.ranking === 'number' ? b.ranking : -Infinity;
    if (rb !== ra) return rb - ra;
    return a.name.localeCompare(b.name);
  });

  // Méthode du serpent : les joueurs, triés du meilleur au moins bon, sont distribués
  // en zigzag sur `poolCount` poules — A, B, … H, puis H, G, … A, puis A, B, … et ainsi
  // de suite. Chaque poule récupère donc un joueur de chaque quartile de niveau : les
  // poules sont homogènes entre elles, hétérogènes en interne.
  const snakeDistribute = (ordered, poolCount) => {
    const buckets = Array.from({ length: poolCount }, () => []);
    ordered.forEach((player, i) => {
      const row = Math.floor(i / poolCount);   // n° de passage sur la ligne de poules
      const pos = i % poolCount;               // position dans le passage
      const idx = row % 2 === 0 ? pos : poolCount - 1 - pos; // 1 passage sur 2 à l'envers
      buckets[idx].push(player);
    });
    return buckets;
  };

  // Poule A…Z, puis « Poule 27 » au-delà de l'alphabet.
  const autoPoolName = (i) => `Poule ${i < 26 ? String.fromCharCode(65 + i) : i + 1}`;

  // Nombre de poules par défaut : on vise des poules de 4 (format le plus courant).
  // C'est aussi le plancher : descendre en dessous produirait des poules de 5 ou plus,
  // écartées volontairement du tournoi (round robin trop long, qualifications ambiguës).
  const MAX_POOL_SIZE = 4;
  const defaultPoolCount = Math.max(1, Math.ceil(players.length / MAX_POOL_SIZE));
  const effectivePoolCount = Math.min(
    Math.max(defaultPoolCount, autoPoolCount ?? defaultPoolCount),
    Math.max(1, players.length)
  );
  const previewBuckets = players.length > 0 ? snakeDistribute(sortedPlayers, effectivePoolCount) : [];

  // Remplace intégralement les poules existantes par la répartition serpentin.
  // Les résultats de poule devenus orphelins sont purgés automatiquement par App.
  const applyAutoDraw = () => {
    const buckets = snakeDistribute(sortedPlayers, effectivePoolCount);
    const base = Date.now();
    onUpdatePools(buckets.map((bucket, i) => ({
      id: base + i,
      name: autoPoolName(i),
      playerIds: bucket.map(p => p.id),
    })));
    setShowAutoDraw(false);
    setAutoPoolCount(null);
    // Les poules sont figées dès qu'elles sortent de la répartition auto.
    onUpdatePoolsLocked?.(true);
  };

  const removePlayer = (id) => {
    onUpdatePlayers(prev => prev.filter(p => p.id !== id));
    onUpdatePools(prev => prev.map(pool => ({ ...pool, playerIds: pool.playerIds.filter(pid => pid !== id) })));
  };

  const removePool = (poolId) => {
    onUpdatePools(prev => prev.filter(p => p.id !== poolId));
  };

  const assignPlayer = (poolId, playerId) => {
    onUpdatePools(prev => prev.map(p => p.id === poolId
      ? { ...p, playerIds: [...p.playerIds, playerId] }
      : p
    ));
    setAddingToPool(null);
  };

  const removeFromPool = (poolId, playerId) => {
    onUpdatePools(prev => prev.map(p => p.id === poolId
      ? { ...p, playerIds: p.playerIds.filter(id => id !== playerId) }
      : p
    ));
  };

  const playerName = (id) => players.find(p => p.id === id)?.name || '?';

  const FORMAT_OPTIONS = [
    { val: 2, label: '2 sets gagnants', sub: 'Best of 3' },
    { val: 3, label: '3 sets gagnants', sub: 'Best of 5' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Barre de réglage du format des matchs de poule */}
      <div style={{
        background: t.cardBg,
        borderRadius: t.cardRadius,
        border: `1px solid ${t.tableBorder}`,
        boxShadow: t.cardShadow,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: formatLocked ? `${t.textSecondary}15` : `${t.primary}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className={formatLocked ? 'fas fa-lock' : 'fas fa-table-tennis-paddle-ball'}
              style={{ color: formatLocked ? t.textSecondary : t.primary, fontSize: 14 }}></i>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
              Format des matchs de poule
            </div>
            <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>
              {formatLocked
                ? 'Verrouillé — un match de poule a déjà été saisi'
                : 'À choisir avant de saisir le premier résultat'}
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 4,
          background: t.pageBg,
          borderRadius: 10,
          padding: 4,
          border: `1px solid ${t.tableBorder}`,
        }}>
          {FORMAT_OPTIONS.map(opt => {
            const active = setsToWin === opt.val;
            const disabled = formatLocked && !active;
            return (
              <button key={opt.val}
                onClick={() => { if (!formatLocked) onUpdateSetsToWin(opt.val); }}
                disabled={formatLocked}
                style={{
                  padding: '7px 16px',
                  border: 'none', borderRadius: 7,
                  background: active ? t.cardBg : 'transparent',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  color: active ? t.primary : t.textSecondary,
                  cursor: formatLocked ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.45 : 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                  minWidth: 120,
                  transition: 'all .15s ease',
                }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{opt.label}</span>
                <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, letterSpacing: '.4px', textTransform: 'uppercase' }}>{opt.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

      {/* Left: player list */}
      <div style={{ width: 260, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Joueurs ({players.length})
          </div>
          {/* Import CSV — comme la saisie manuelle, masqué quand les poules sont verrouillées */}
          {!locked && (
            <React.Fragment>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  e.target.value = ''; // même fichier réimportable juste après
                  handleCsvFile(file);
                }}
              />
              <button onClick={() => csvInputRef.current?.click()}
                title="Importer une liste de joueurs depuis un fichier CSV (Nom;Points)"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: t.primary, border: `1.5px solid ${t.primary}55`, borderRadius: 8, padding: '5px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <i className="fas fa-file-arrow-up"></i>Importer (.csv)
              </button>
            </React.Fragment>
          )}
        </div>

        {/* Add player — masqué quand les poules sont verrouillées */}
        {!locked && <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={nameInputRef}
              placeholder="Nom du joueur…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPlayer()}
              style={{ flex: 1, minWidth: 0, padding: '8px 12px', borderRadius: 8, border: `1px solid ${t.inputBorder}`, background: t.inputBg, fontSize: 14, color: t.textPrimary, outline: 'none' }}
            />
            <input
              placeholder="Classement"
              title="Classement (points) — vide ou inférieur à 500 : le joueur est compté à 500"
              type="number"
              value={newRanking}
              onChange={e => setNewRanking(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPlayer()}
              style={{ width: 90, minWidth: 0, flexShrink: 0, padding: '8px 10px', borderRadius: 8, border: `1px solid ${t.inputBorder}`, background: t.inputBg, fontSize: 14, color: t.textPrimary, outline: 'none' }}
            />
          </div>
          <button onClick={addPlayer} style={{ background: t.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            <i className="fas fa-plus" style={{ marginRight: 6 }}></i>Ajouter le joueur
          </button>
        </div>}

        {/* Player list — triée du mieux classé au moins bien classé */}
        <div style={{ background: t.cardBg, borderRadius: t.cardRadius, border: `1px solid ${t.tableBorder}`, overflow: 'hidden' }}>
          {sortedPlayers.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: t.textSecondary, fontSize: 13 }}>
              Aucun joueur ajouté
            </div>
          )}
          {sortedPlayers.map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px',
              borderBottom: i < sortedPlayers.length - 1 ? `1px solid ${t.tableBorder}` : 'none',
              background: assignedIds.has(p.id) ? `${t.primary}06` : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: assignedIds.has(p.id) ? t.primary : t.pageBg, color: assignedIds.has(p.id) ? '#fff' : t.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                  {p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontSize: 14, color: t.textPrimary, fontWeight: 500 }}>{p.name}</span>
                <span style={{ fontSize: 11, color: t.textSecondary, fontWeight: 600 }}>
                  {typeof p.ranking === 'number' ? p.ranking : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {assignedIds.has(p.id) && (
                  <span style={{ fontSize: 11, color: t.primary, fontWeight: 700 }}>
                    {pools.find(pool => pool.playerIds.includes(p.id))?.name}
                  </span>
                )}
                {!(locked && assignedIds.has(p.id)) && (
                  <button onClick={() => setConfirmDeletePlayer(p.id)} style={{ background: 'transparent', border: 'none', color: t.textSecondary, cursor: 'pointer', fontSize: 14, padding: 2, opacity: 0.45, transition: 'opacity .2s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.45'}>
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: pools */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Poules ({pools.length})
          </div>
          {locked ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span title="Composition figée par la répartition automatique"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: t.textSecondary, background: `${t.textSecondary}12`, border: `1px solid ${t.tableBorder}`, borderRadius: 8, padding: '6px 12px' }}>
                <i className="fas fa-lock"></i>Poules verrouillées
              </span>
              <button onClick={() => setConfirmUnlock(true)}
                style={{ background: 'transparent', color: t.textSecondary, border: `1.5px solid ${t.tableBorder}`, borderRadius: 8, padding: '6px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <i className="fas fa-lock-open" style={{ marginRight: 6 }}></i>Déverrouiller
              </button>
            </div>
          ) : pools.length > 0 ? (
            /* Poules déverrouillées pour une retouche (intervertir deux joueurs…) :
               on propose de reverrouiller, pas de tout redistribuer. */
            <button onClick={() => onUpdatePoolsLocked?.(true)}
              style={{ background: t.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <i className="fas fa-lock" style={{ marginRight: 6 }}></i>Verrouiller
            </button>
          ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => { setAutoPoolCount(null); setShowAutoDraw(true); }}
              disabled={players.length < 2}
              title={players.length < 2 ? 'Ajoutez au moins 2 joueurs' : 'Répartir les joueurs par la méthode du serpent'}
              style={{
                // Noir et or : le seul bouton « magique » de l'app, volontairement
                // à l'écart de la palette verte des actions ordinaires.
                // La bordure transparente conserve la géométrie de l'ancien bouton bordé.
                background: '#000',
                color: '#d4af37',
                border: '1.5px solid transparent', borderRadius: 8,
                padding: '6px 14px', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
                boxShadow: players.length < 2 ? 'none' : '0 2px 8px rgba(0,0,0,.28)',
                cursor: players.length < 2 ? 'not-allowed' : 'pointer',
                opacity: players.length < 2 ? 0.4 : 1,
              }}>
              <i className="fas fa-wand-magic-sparkles" style={{ marginRight: 6, color: '#d4af37' }}></i>Répartition auto
            </button>
          </div>
          )}
        </div>

        {pools.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: t.textSecondary, background: t.cardBg, borderRadius: t.cardRadius, border: `1px dashed ${t.tableBorder}` }}>
            <i className="fas fa-layer-group" style={{ fontSize: 28, marginBottom: 10, display: 'block', opacity: .3 }}></i>
            Aucune poule — cliquez sur « Répartition auto » pour constituer les poules
          </div>
        )}

        {/* Grille : colonnes de largeur égale, même en fin de ligne incomplète. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, alignItems: 'start' }}>
          {pools.map(pool => {
            const poolPlayers = pool.playerIds.map(id => players.find(p => p.id === id)).filter(Boolean);
            const availableToAdd = unassigned;
            const isAdding = addingToPool === pool.id;

            return (
              <div key={pool.id} style={{ background: t.cardBg, borderRadius: t.cardRadius, border: `1px solid ${t.tableBorder}`, overflow: 'hidden' }}>
                {/* Pool header */}
                <div style={{ padding: '12px 16px', background: t.tableHeaderBg, borderBottom: `1px solid ${t.tableBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ background: t.primary, color: '#fff', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{pool.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: t.textSecondary }}>{poolPlayers.length} joueur{poolPlayers.length !== 1 ? 's' : ''}</span>
                    {!locked && (
                      <button onClick={() => setConfirmDeletePool(pool.id)}
                        style={{ background: 'transparent', border: 'none', color: t.textSecondary, cursor: 'pointer', fontSize: 13, opacity: 0.45, transition: 'opacity .2s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.45'}>
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Players in pool */}
                {poolPlayers.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 16px', borderBottom: `1px solid ${t.tableBorder}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: t.primary + '22', color: t.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                        {p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, color: t.textPrimary, fontWeight: 500 }}>{p.name}</span>
                    </div>
                    {!locked && (
                      <button onClick={() => removeFromPool(pool.id, p.id)} style={{ background: 'transparent', border: 'none', color: t.textSecondary, cursor: 'pointer', fontSize: 13 }}>
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                ))}

                {/* Add player to pool */}
                {isAdding ? (
                  <div style={{ padding: '10px 16px', borderTop: poolPlayers.length > 0 ? 'none' : undefined }}>
                    {availableToAdd.length === 0 ? (
                      <div style={{ fontSize: 12, color: t.textSecondary, textAlign: 'center', padding: '4px 0' }}>Tous les joueurs sont assignés</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {availableToAdd.map(p => (
                          <button key={p.id} onClick={() => assignPlayer(pool.id, p.id)}
                            style={{ background: t.pageBg, border: `1px solid ${t.tableBorder}`, borderRadius: 6, padding: '6px 10px', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: t.textPrimary, fontWeight: 500 }}>
                            <i className="fas fa-plus" style={{ marginRight: 6, color: t.primary, fontSize: 10 }}></i>{p.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <button onClick={() => setAddingToPool(null)} style={{ marginTop: 6, background: 'transparent', border: 'none', color: t.textSecondary, cursor: 'pointer', fontSize: 12, padding: 0 }}>
                      Annuler
                    </button>
                  </div>
                ) : locked || poolPlayers.length >= MAX_POOL_SIZE ? (
                  /* Poules verrouillées, ou poule pleine (4 maximum, à la main comme en
                     répartition auto) — le bouton d'ajout disparaît, sans message. */
                  null
                ) : (
                  <button onClick={() => setAddingToPool(pool.id)}
                    style={{ width: '100%', background: 'transparent', border: 'none', borderTop: poolPlayers.length > 0 ? `1px dashed ${t.tableBorder}` : 'none', padding: '10px 16px', cursor: 'pointer', color: t.primary, fontSize: 13, fontWeight: 600, textAlign: 'left' }}>
                    <i className="fas fa-plus" style={{ marginRight: 6 }}></i>Ajouter un joueur
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modale de répartition automatique — méthode du serpent */}
      {showAutoDraw && (() => {
        // Raccourcis « poules de N » — proposés seulement s'ils ont du sens vu l'effectif.
        const presets = [3, MAX_POOL_SIZE]
          .map(size => ({ size, count: Math.ceil(players.length / size) }))
          .filter((p, i, arr) => p.count >= 1 && arr.findIndex(o => o.count === p.count) === i);

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
            onClick={() => setShowAutoDraw(false)}>
            <div style={{ background: t.cardBg, borderRadius: 14, padding: '26px 28px 22px', width: 620, maxWidth: '92vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}
              onClick={e => e.stopPropagation()}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${t.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="fas fa-wand-magic-sparkles" style={{ color: t.primary, fontSize: 15 }}></i>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>Répartition automatique</div>
                  <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>
                    Méthode du serpent — {players.length} joueur{players.length > 1 ? 's' : ''} classé{players.length > 1 ? 's' : ''} du meilleur au moins bon
                  </div>
                </div>
              </div>

              {/* Choix du nombre de poules */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '18px 0 14px' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  Nombre de poules
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, border: `1px solid ${t.tableBorder}`, borderRadius: 8, background: t.pageBg, padding: 3 }}>
                  <button onClick={() => setAutoPoolCount(Math.max(defaultPoolCount, effectivePoolCount - 1))}
                    disabled={effectivePoolCount <= defaultPoolCount}
                    title={effectivePoolCount <= defaultPoolCount ? `Minimum : au-delà, les poules dépasseraient ${MAX_POOL_SIZE} joueurs` : undefined}
                    style={{ width: 28, height: 28, border: 'none', borderRadius: 6, background: 'transparent', color: t.textSecondary, cursor: effectivePoolCount <= defaultPoolCount ? 'not-allowed' : 'pointer', fontSize: 12 }}>
                    <i className="fas fa-minus"></i>
                  </button>
                  <span style={{ minWidth: 30, textAlign: 'center', fontSize: 15, fontWeight: 700, color: t.textPrimary }}>{effectivePoolCount}</span>
                  <button onClick={() => setAutoPoolCount(Math.min(players.length, effectivePoolCount + 1))}
                    disabled={effectivePoolCount >= players.length}
                    style={{ width: 28, height: 28, border: 'none', borderRadius: 6, background: 'transparent', color: t.textSecondary, cursor: effectivePoolCount >= players.length ? 'not-allowed' : 'pointer', fontSize: 12 }}>
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
                {presets.map(p => {
                  const active = p.count === effectivePoolCount;
                  return (
                    <button key={p.size} onClick={() => setAutoPoolCount(p.count)}
                      style={{
                        border: `1px solid ${active ? t.primary : t.tableBorder}`,
                        background: active ? `${t.primary}12` : 'transparent',
                        color: active ? t.primary : t.textSecondary,
                        borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}>
                      Poules de {p.size}
                    </button>
                  );
                })}
              </div>

              {/* Aperçu de la répartition */}
              {/* gridAutoRows: 'max-content' est indispensable ici : la grille est un élément
                  flex à hauteur définie (flex: 1) ; sans lui, Chrome comprime ses lignes
                  implicites pour les faire tenir dans le panneau, et les cartes — en
                  overflow: hidden — perdaient leur dernière ligne de joueur dès que
                  l'aperçu était plus haut que le panneau (poules de 4 à partir de 16 poules). */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gridAutoRows: 'max-content', alignItems: 'start', gap: 10, paddingRight: 2 }}>
                {previewBuckets.map((bucket, i) => (
                  <div key={i} style={{ border: `1px solid ${t.tableBorder}`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ background: t.tableHeaderBg, padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${t.tableBorder}` }}>
                      <span style={{ background: t.primary, color: '#fff', borderRadius: 5, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{autoPoolName(i)}</span>
                      <span style={{ fontSize: 11, color: t.textSecondary }}>{bucket.length}</span>
                    </div>
                    {bucket.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '5px 10px', fontSize: 12, color: t.textPrimary }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        <span style={{ color: t.textSecondary, fontWeight: 600, flexShrink: 0 }}>
                          {typeof p.ranking === 'number' ? p.ranking : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {pools.length > 0 && (
                <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 8, background: '#fff8ec', border: '1px solid #f5dfb8', fontSize: 12, color: '#8a6212', lineHeight: 1.5 }}>
                  <i className="fas fa-triangle-exclamation" style={{ marginRight: 6 }}></i>
                  Les {pools.length} poule{pools.length > 1 ? 's' : ''} actuelle{pools.length > 1 ? 's' : ''} ser{pools.length > 1 ? 'ont' : 'a'} remplacée{pools.length > 1 ? 's' : ''}
                  {formatLocked ? ', et les résultats de poule déjà saisis seront perdus.' : '.'}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button onClick={() => setShowAutoDraw(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: t.btnRadius, border: `1.5px solid ${t.tableBorder}`, background: 'transparent', color: t.textSecondary, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={applyAutoDraw}
                  style={{ flex: 1, padding: '10px', borderRadius: t.btnRadius, border: 'none', background: t.primary, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  <i className="fas fa-wand-magic-sparkles" style={{ marginRight: 6 }}></i>Répartir
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modale confirmation déverrouillage des poules */}
      {confirmUnlock && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setConfirmUnlock(false)}>
          <div style={{ background: t.cardBg, borderRadius: 14, padding: '28px 28px 22px', width: 340, boxShadow: '0 16px 48px rgba(0,0,0,0.2)', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff8ec', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="fas fa-lock-open" style={{ color: '#d19a2a', fontSize: 18 }}></i>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>
              Déverrouiller les poules ?
            </div>
            <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 24, lineHeight: 1.5 }}>
              Les poules redeviennent modifiables. Toute modification de composition efface
              les résultats de poule concernés ; les tableaux qui en dépendent sont à revoir.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmUnlock(false)}
                style={{ flex: 1, padding: '10px', borderRadius: t.btnRadius, border: `1.5px solid ${t.tableBorder}`, background: 'transparent', color: t.textSecondary, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={() => { onUpdatePoolsLocked?.(false); setConfirmUnlock(false); }}
                style={{ flex: 1, padding: '10px', borderRadius: t.btnRadius, border: 'none', background: '#d19a2a', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Déverrouiller
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale confirmation suppression joueur */}
      {confirmDeletePlayer && (() => {
        const player = players.find(p => p.id === confirmDeletePlayer);
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
            onClick={() => setConfirmDeletePlayer(null)}>
            <div style={{ background: t.cardBg, borderRadius: 14, padding: '28px 28px 22px', width: 300, boxShadow: '0 16px 48px rgba(0,0,0,0.2)', textAlign: 'center' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <i className="fas fa-user-minus" style={{ color: '#f96b6b', fontSize: 18 }}></i>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>
                Supprimer {player?.name} ?
              </div>
              <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 24, lineHeight: 1.5 }}>
                Le joueur sera retiré de toutes les poules et de la liste.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDeletePlayer(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: t.btnRadius, border: `1.5px solid ${t.tableBorder}`, background: 'transparent', color: t.textSecondary, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={() => { removePlayer(confirmDeletePlayer); setConfirmDeletePlayer(null); }}
                  style={{ flex: 1, padding: '10px', borderRadius: t.btnRadius, border: 'none', background: '#f96b6b', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modale confirmation suppression poule */}
      {confirmDeletePool && (() => {
        const pool = pools.find(p => p.id === confirmDeletePool);
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
            onClick={() => setConfirmDeletePool(null)}>
            <div style={{ background: t.cardBg, borderRadius: 14, padding: '28px 28px 22px', width: 300, boxShadow: '0 16px 48px rgba(0,0,0,0.2)', textAlign: 'center' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <i className="fas fa-trash-alt" style={{ color: '#f96b6b', fontSize: 18 }}></i>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>
                Supprimer {pool?.name} ?
              </div>
              <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 24, lineHeight: 1.5 }}>
                Les joueurs ne seront pas supprimés, mais la poule sera définitivement retirée.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDeletePool(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: t.btnRadius, border: `1.5px solid ${t.tableBorder}`, background: 'transparent', color: t.textSecondary, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={() => { removePool(confirmDeletePool); setConfirmDeletePool(null); }}
                  style={{ flex: 1, padding: '10px', borderRadius: t.btnRadius, border: 'none', background: '#f96b6b', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        );
      })()}


      {/* Modale d'aperçu de l'import CSV — rien n'est ajouté avant confirmation */}
      {csvPreview && (() => {
        const { fileName, players: toImport, ignored, duplicates } = csvPreview;
        const warnings = [
          duplicates.length && `${duplicates.length} doublon${duplicates.length > 1 ? 's' : ''} écarté${duplicates.length > 1 ? 's' : ''} : ${duplicates.map(d => d.name).join(', ')}`,
          ignored.length && `${ignored.length} ligne${ignored.length > 1 ? 's' : ''} sans nom ignorée${ignored.length > 1 ? 's' : ''} (ligne${ignored.length > 1 ? 's' : ''} ${ignored.map(l => l.line).join(', ')})`,
        ].filter(Boolean);

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
            onClick={() => setCsvPreview(null)}>
            <div style={{ background: t.cardBg, borderRadius: 14, padding: '26px 28px 22px', width: 560, maxWidth: '92vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}
              onClick={e => e.stopPropagation()}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${t.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="fas fa-file-csv" style={{ color: t.primary, fontSize: 15 }}></i>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>
                    {toImport.length} joueur{toImport.length > 1 ? 's' : ''} à importer
                  </div>
                  <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fileName} — ajoutés à la liste existante
                  </div>
                </div>
              </div>

              {/* Aperçu ligne à ligne : le classement affiché est celui qui sera
                  enregistré, plancher de 500 compris. */}
              <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${t.tableBorder}`, borderRadius: 10 }}>
                {toImport.length === 0 && (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: t.textSecondary, fontSize: 13 }}>
                    Aucun joueur à ajouter
                  </div>
                )}
                {toImport.map((entry, i) => (
                  <div key={`${entry.line}-${entry.name}`} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    padding: '8px 14px',
                    borderBottom: i < toImport.length - 1 ? `1px solid ${t.tableBorder}` : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ fontSize: 11, color: t.textSecondary, fontWeight: 600, minWidth: 22, textAlign: 'right' }}>{i + 1}</span>
                      <span style={{ fontSize: 13, color: t.textPrimary, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: t.textSecondary, fontWeight: 700, flexShrink: 0 }}>{entry.ranking}</span>
                  </div>
                ))}
              </div>

              {warnings.length > 0 && (
                <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 8, background: '#fff8ec', border: '1px solid #f5dfb8', fontSize: 12, color: '#8a6212', lineHeight: 1.5 }}>
                  {warnings.map((w, i) => (
                    <div key={i} style={{ marginTop: i > 0 ? 4 : 0 }}>
                      <i className="fas fa-triangle-exclamation" style={{ marginRight: 6 }}></i>{w}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button onClick={() => setCsvPreview(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: t.btnRadius, border: `1.5px solid ${t.tableBorder}`, background: 'transparent', color: t.textSecondary, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={applyCsvImport}
                  disabled={toImport.length === 0}
                  style={{ flex: 1, padding: '10px', borderRadius: t.btnRadius, border: 'none', background: t.primary, color: '#fff', fontWeight: 700, fontSize: 13, cursor: toImport.length === 0 ? 'not-allowed' : 'pointer', opacity: toImport.length === 0 ? 0.45 : 1 }}>
                  <i className="fas fa-file-arrow-up" style={{ marginRight: 6 }}></i>Importer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modale d'erreur d'import — fichier illisible ou sans aucun joueur */}
      {csvError && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setCsvError(null)}>
          <div style={{ background: t.cardBg, borderRadius: 14, padding: '28px 28px 22px', width: 340, boxShadow: '0 16px 48px rgba(0,0,0,0.2)', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="fas fa-file-circle-exclamation" style={{ color: '#f96b6b', fontSize: 18 }}></i>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>
              Import impossible
            </div>
            <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 24, lineHeight: 1.5 }}>
              {csvError}<br />
              Format attendu : une ligne par joueur, « Nom;Points ».
            </div>
            <button onClick={() => setCsvError(null)}
              style={{ width: '100%', padding: '10px', borderRadius: t.btnRadius, border: 'none', background: t.primary, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

Object.assign(window, { PoolsScreen });
