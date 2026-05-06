// PoolsScreen — Constitution manuelle des poules
// Reçoit : players, pools, onUpdatePlayers, onUpdatePools

const PoolsScreen = ({ theme, players, pools, onUpdatePlayers, onUpdatePools }) => {
  const t = window.THEMES[theme];
  const [newName, setNewName] = React.useState('');
  const [newPoolName, setNewPoolName] = React.useState('');
  const [addingToPool, setAddingToPool] = React.useState(null); // poolId en cours d'ajout
  const [confirmDeletePool, setConfirmDeletePool] = React.useState(null); // poolId en attente de confirmation
  const [confirmDeletePlayer, setConfirmDeletePlayer] = React.useState(null); // playerId en attente de confirmation

  // Joueurs déjà assignés à une poule
  const assignedIds = new Set(pools.flatMap(p => p.playerIds));
  const unassigned = players.filter(p => !assignedIds.has(p.id));

  const addPlayer = () => {
    if (!newName.trim()) return;
    onUpdatePlayers(prev => [...prev, { id: Date.now(), name: newName.trim() }]);
    setNewName('');
  };

  const removePlayer = (id) => {
    onUpdatePlayers(prev => prev.filter(p => p.id !== id));
    onUpdatePools(prev => prev.map(pool => ({ ...pool, playerIds: pool.playerIds.filter(pid => pid !== id) })));
  };

  const createPool = () => {
    const name = newPoolName.trim() || `Poule ${String.fromCharCode(65 + pools.length)}`;
    onUpdatePools(prev => [...prev, { id: Date.now(), name, playerIds: [] }]);
    setNewPoolName('');
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

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

      {/* Left: player list */}
      <div style={{ width: 260, flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 }}>
          Joueurs ({players.length})
        </div>

        {/* Add player */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            placeholder="Nom du joueur…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPlayer()}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${t.inputBorder}`, background: t.inputBg, fontSize: 14, color: t.textPrimary, outline: 'none' }}
          />
          <button onClick={addPlayer} style={{ background: t.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer', fontSize: 16 }}>+</button>
        </div>

        {/* Player list */}
        <div style={{ background: t.cardBg, borderRadius: t.cardRadius, border: `1px solid ${t.tableBorder}`, overflow: 'hidden' }}>
          {players.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: t.textSecondary, fontSize: 13 }}>
              Aucun joueur ajouté
            </div>
          )}
          {players.map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px',
              borderBottom: i < players.length - 1 ? `1px solid ${t.tableBorder}` : 'none',
              background: assignedIds.has(p.id) ? `${t.primary}06` : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: assignedIds.has(p.id) ? t.primary : t.pageBg, color: assignedIds.has(p.id) ? '#fff' : t.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                  {p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontSize: 14, color: t.textPrimary, fontWeight: 500 }}>{p.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {assignedIds.has(p.id) && (
                  <span style={{ fontSize: 11, color: t.primary, fontWeight: 700 }}>
                    {pools.find(pool => pool.playerIds.includes(p.id))?.name}
                  </span>
                )}
                <button onClick={() => setConfirmDeletePlayer(p.id)} style={{ background: 'transparent', border: 'none', color: t.textSecondary, cursor: 'pointer', fontSize: 14, padding: 2, opacity: 0.45, transition: 'opacity .2s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.45'}>
                  <i className="fas fa-times"></i>
                </button>
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              placeholder={`Poule ${String.fromCharCode(65 + pools.length)}`}
              value={newPoolName}
              onChange={e => setNewPoolName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createPool()}
              style={{ width: 120, padding: '7px 10px', borderRadius: 8, border: `1px solid ${t.inputBorder}`, background: t.inputBg, fontSize: 13, color: t.textPrimary, outline: 'none' }}
            />
            <button onClick={createPool} style={{ background: t.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
              <i className="fas fa-plus" style={{ marginRight: 6 }}></i>Créer une poule
            </button>
          </div>
        </div>

        {pools.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: t.textSecondary, background: t.cardBg, borderRadius: t.cardRadius, border: `1px dashed ${t.tableBorder}` }}>
            <i className="fas fa-layer-group" style={{ fontSize: 28, marginBottom: 10, display: 'block', opacity: .3 }}></i>
            Aucune poule créée — cliquez sur "Créer une poule"
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {pools.map(pool => {
            const poolPlayers = pool.playerIds.map(id => players.find(p => p.id === id)).filter(Boolean);
            const availableToAdd = unassigned;
            const isAdding = addingToPool === pool.id;

            return (
              <div key={pool.id} style={{ background: t.cardBg, borderRadius: t.cardRadius, border: `1px solid ${t.tableBorder}`, overflow: 'hidden', minWidth: 200, flex: 1 }}>
                {/* Pool header */}
                <div style={{ padding: '12px 16px', background: t.tableHeaderBg, borderBottom: `1px solid ${t.tableBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ background: t.primary, color: '#fff', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{pool.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: t.textSecondary }}>{poolPlayers.length} joueur{poolPlayers.length !== 1 ? 's' : ''}</span>
                    <button onClick={() => setConfirmDeletePool(pool.id)}
                      style={{ background: 'transparent', border: 'none', color: t.textSecondary, cursor: 'pointer', fontSize: 13, opacity: 0.45, transition: 'opacity .2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.45'}>
                      <i className="fas fa-trash-alt"></i>
                    </button>
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
                    <button onClick={() => removeFromPool(pool.id, p.id)} style={{ background: 'transparent', border: 'none', color: t.textSecondary, cursor: 'pointer', fontSize: 13 }}>
                      <i className="fas fa-times"></i>
                    </button>
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
    </div>
  );
};

Object.assign(window, { PoolsScreen });
