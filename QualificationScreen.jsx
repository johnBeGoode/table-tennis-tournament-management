// QualificationScreen — Comment le tableau principal se remplit (lecture seule).
// Il n'y a jamais de barrage : les 1ers et 2es de chaque poule sont qualifiés d'office,
// et selon le nombre de poules (AppShell.computeBracketStructure) :
//   'direct' : ils remplissent exactement le tableau ;
//   'thirds' : les places manquantes vont aux MEILLEURS 3es (quotients inter-poules,
//              Art. II.109 FFTT) — l'écran montre le classement de tous les 3es ;
//   'byes'   : pas assez de 3es, certaines TS sont exemptées de 1er tour — l'écran les liste.

const QualificationScreen = ({ theme, players, pools, results }) => {
  const t = window.THEMES[theme];
  const accentColor = '#f79025';

  // Structure, numérotation et 3es retenus — source unique (AppShell.buildPrincipalSeeds)
  const { struct, bracketSize, seedList, thirds: qualifiedThirds } = window.buildPrincipalSeeds({ pools, players, results });
  const autoQualifiers = pools.length * 2;
  const missing = bracketSize - autoQualifiers;

  // Tous les 3es, classés au mérite inter-poules (le critère de sélection)
  const poolLabelById = {};
  pools.forEach(p => { poolLabelById[p.id] = window.poolShortLabel(p); });
  const allThirds = pools.map(pool => {
    const p = window.poolStandings(pool, players, results)[2];
    return p ? { player: p, poolId: pool.id } : null;
  }).filter(Boolean).sort((a, b) => window.crossPoolCompare(a.player, b.player));
  const qualifiedThirdIds = new Set(qualifiedThirds.map(e => e.player.id));

  // Vérifie si tous les matchs de poules ont été joués
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
  const poolsComplete = totalPoolMatches > 0 && playedPoolMatches === totalPoolMatches;

  const ratio = (a, b) => (b === 0 ? (a === 0 ? '—' : '∞') : (a / b).toFixed(2));

  if (pools.length === 0) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: t.textSecondary }}>
        <i className="fas fa-user-check" style={{ fontSize: 32, display: 'block', marginBottom: 12, opacity: .3 }}></i>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Aucune poule configurée</div>
      </div>
    );
  }

  const Badge = () => (
    <span style={{ background: accentColor, color: '#fff', borderRadius: 6, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>Qualification</span>
  );
  const Pending = () => (
    <div style={{ fontSize: 12, color: t.textSecondary, fontStyle: 'italic' }}>
      Connus une fois tous les matchs de poules joués ({playedPoolMatches}/{totalPoolMatches}).
    </div>
  );
  const SectionTitle = ({ children }) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>{children}</div>
  );
  const CardTitle = ({ children }) => (
    <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>
      <i className="fas fa-info-circle" style={{ color: accentColor, marginRight: 8 }}></i>{children}
    </div>
  );
  const cardStyle = { padding: '32px 24px', background: t.cardBg, border: `1.5px solid ${t.tableBorder}`, borderRadius: t.cardRadius };
  const textStyle = { fontSize: 13, color: t.textSecondary, lineHeight: 1.6, marginBottom: 18 };

  // Cas : tableau exactement rempli
  if (struct.mode === 'direct') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Badge />
          <span style={{ fontSize: 12, color: t.textSecondary }}>
            Tableau principal de {bracketSize} · {autoQualifiers} qualifiés (1ers + 2es) · tableau complet
          </span>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <i className="fas fa-check-circle" style={{ fontSize: 32, display: 'block', marginBottom: 12, color: '#20bf6b', opacity: .8 }}></i>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, marginBottom: 6 }}>Tableau principal complet</div>
          <div style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.6 }}>
            Avec {pools.length} poules, les 1ers et 2es ({autoQualifiers} joueurs) remplissent exactement
            les {bracketSize} places du tableau principal. Les 3es et 4es vont en consolante.
          </div>
        </div>
      </div>
    );
  }

  // Cas : les meilleurs 3es complètent le tableau
  if (struct.mode === 'thirds') {
    const k = struct.thirdsQualified;
    const seedByPlayerId = {};
    seedList.forEach(e => { if (e.player) seedByPlayerId[e.player.id] = e.seed; });
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Badge />
          <span style={{ fontSize: 12, color: t.textSecondary }}>
            Tableau principal de {bracketSize} · {autoQualifiers} qualifiés directs (1ers + 2es) · {k} meilleur{k > 1 ? 's' : ''} 3e{k > 1 ? 's' : ''}
          </span>
        </div>
        <div style={cardStyle}>
          <CardTitle>Tableau principal de {bracketSize} complété par les meilleurs 3es</CardTitle>
          <div style={textStyle}>
            Avec {pools.length} poules, les 1ers et 2es ({autoQualifiers} joueurs) ne remplissent pas un tableau
            de {bracketSize} : il manque {missing} joueur{missing > 1 ? 's' : ''}. Les {k} meilleur{k > 1 ? 's' : ''} 3e{k > 1 ? 's' : ''} de
            poule complètent le tableau, les autres 3es et les 4es vont en consolante.
            Les 3es sont départagés entre poules par quotients (Art. II.109 FFTT) : points-rencontre
            par rencontre jouée, puis manches gagnées / perdues, puis points-jeu gagnés / perdus —
            des quotients et non des totaux, pour rester équitable entre poules de tailles différentes.
          </div>
          <SectionTitle>Classement des 3es</SectionTitle>
          {poolsComplete ? (
            <div style={{ border: `1px solid ${t.tableBorder}`, borderRadius: 8, overflowX: 'auto', maxWidth: 640 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: t.tableHeaderBg }}>
                    {[
                      { l: '#',        a: 'left',   w: 40 },
                      { l: 'Joueur',   a: 'left'          },
                      { l: 'Poule',    a: 'left',   w: 64 },
                      { l: 'V-D',      a: 'center', w: 56 },
                      { l: 'Manches',  a: 'center', w: 72 },
                      { l: 'Points',   a: 'center', w: 72 },
                      { l: '',         a: 'left',   w: 120 },
                    ].map((h, i) => (
                      <th key={i} style={{ width: h.w, padding: '8px 12px', textAlign: h.a, fontSize: 11, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${t.tableBorder}`, whiteSpace: 'nowrap' }}>{h.l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allThirds.map(({ player, poolId }, idx) => {
                    const qualified = qualifiedThirdIds.has(player.id);
                    return (
                      <tr key={player.id} style={{ borderBottom: idx < allThirds.length - 1 ? `1px solid ${t.tableBorder}` : 'none', background: qualified ? '#20bf6b0d' : 'transparent' }}>
                        <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, color: t.textSecondary }}>{idx + 1}</td>
                        <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: qualified ? 700 : 500, color: t.textPrimary, whiteSpace: 'nowrap' }}>{player.name}</td>
                        <td style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#20bf6b' }}>{poolLabelById[poolId]}3</td>
                        <td style={{ padding: '8px 12px', fontSize: 12, textAlign: 'center', color: t.textPrimary }}>{player.v}-{player.d}</td>
                        <td style={{ padding: '8px 12px', fontSize: 12, textAlign: 'center', color: t.textSecondary }} title={`${player.sf} / ${player.sa}`}>{ratio(player.sf, player.sa)}</td>
                        <td style={{ padding: '8px 12px', fontSize: 12, textAlign: 'center', color: t.textSecondary }} title={`${player.pf} / ${player.pa}`}>{ratio(player.pf, player.pa)}</td>
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                          {qualified ? (
                            <span style={{ background: '#20bf6b1a', color: '#20bf6b', borderRadius: t.tagRadius, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>
                              <i className="fas fa-trophy" style={{ marginRight: 4, fontSize: 9 }}></i>TS{seedByPlayerId[player.id]} · Principal
                            </span>
                          ) : (
                            <span style={{ background: `${accentColor}1a`, color: accentColor, borderRadius: t.tagRadius, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>
                              <i className="fas fa-shield-halved" style={{ marginRight: 4, fontSize: 9 }}></i>Consolante
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <Pending />}
        </div>
      </div>
    );
  }

  // Cas : exemptions de 1er tour (pas assez de 3es pour combler les places manquantes)
  const k = struct.byeCount;
  const exempted = seedList.filter(e => e.bye && e.player);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Badge />
        <span style={{ fontSize: 12, color: t.textSecondary }}>
          Tableau principal de {bracketSize} · {autoQualifiers} qualifiés (1ers + 2es) · {k} exempté{k > 1 ? 's' : ''} de 1er tour
        </span>
      </div>
      <div style={cardStyle}>
        <CardTitle>Tableau principal de {bracketSize} avec exemptions</CardTitle>
        <div style={textStyle}>
          Avec {pools.length} poules, les 1ers et 2es ({autoQualifiers} joueurs) sont tous qualifiés mais ne remplissent pas
          un tableau de {bracketSize} : il manque {missing} joueur{missing > 1 ? 's' : ''}. Aucun 3e n'est repêché — un 3e de poule
          ne complète le tableau que lorsqu'il ne manque que 2 joueurs. Les {k} places manquantes sont donc laissées vides :
          les {k} TS dont l'adversaire de 1er tour n'existe pas sont exemptées de 1er tour, et le tableau retombe
          sur {bracketSize / 2} joueurs au tour suivant. Tous les 3es et 4es vont en consolante.
        </div>
        <SectionTitle>Exemptés de 1er tour</SectionTitle>
        {poolsComplete ? (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {exempted.map(({ seed, player, poolId, poolRank }) => (
              <div key={seed} style={{ background: t.tableHeaderBg, border: `1px solid ${t.tableBorder}`, borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, opacity: .6 }}>TS{seed}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#20bf6b' }}>{poolLabelById[poolId]}{poolRank}</span>
                <span style={{ fontSize: 13, color: t.textPrimary }}>{player.name}</span>
              </div>
            ))}
          </div>
        ) : <Pending />}
      </div>
    </div>
  );
};

Object.assign(window, { QualificationScreen });
