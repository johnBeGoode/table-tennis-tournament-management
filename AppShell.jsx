// AppShell — ERTT Tournament App
// Shared layout: sidebar + top bar + content area

const THEMES = {
  classique: {
    name: 'Classique',
    sidebarBg: '#ffffff',
    sidebarBorder: '1px solid #e8eaed',
    sidebarText: '#444',
    sidebarActiveText: '#20bf6b',
    sidebarActiveBg: 'rgba(32,191,107,0.08)',
    topbarBg: '#ffffff',
    topbarBorder: '1px solid #e8eaed',
    pageBg: '#f4f5f7',
    cardBg: '#ffffff',
    cardShadow: '0 1px 4px rgba(0,0,0,0.08)',
    cardRadius: 12,
    primary: '#20bf6b',
    primaryDark: '#17a35a',
    primaryText: '#ffffff',
    btnRadius: 8,
    tableBorder: '#e8eaed',
    tableHeaderBg: '#f8f9fa',
    inputBorder: '#dde1e7',
    inputBg: '#ffffff',
    tagRadius: 6,
    textPrimary: '#1a1d23',
    textSecondary: '#6b7280',
    divider: '#e8eaed',
  },
  sport: {
    name: 'Sport',
    sidebarBg: '#1b1a1a',
    sidebarBorder: 'none',
    sidebarText: 'rgba(211,211,211,0.75)',
    sidebarActiveText: '#20bf6b',
    sidebarActiveBg: 'rgba(32,191,107,0.12)',
    topbarBg: '#ffffff',
    topbarBorder: '1px solid #e8eaed',
    pageBg: '#f0f4ff',
    cardBg: '#ffffff',
    cardShadow: '0 2px 12px rgba(0,0,0,0.07)',
    cardRadius: 16,
    primary: '#20bf6b',
    primaryDark: '#17a35a',
    primaryText: '#ffffff',
    btnRadius: 24,
    tableBorder: '#e8eaed',
    tableHeaderBg: '#f0f4ff',
    inputBorder: '#c7d2fe',
    inputBg: '#f8faff',
    tagRadius: 20,
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    divider: '#e8eaed',
  },
};

const NAV_ITEMS = [
  { id: 'poules',     label: 'Poules',             icon: 'fas fa-layer-group' },
  { id: 'resultats',  label: 'Résultats',           icon: 'fas fa-table-tennis-paddle-ball' },
  { id: 'brackets',   label: 'Classements',         icon: 'fas fa-sitemap' },
  { id: 'barrage',    label: 'Barrages',            icon: 'fas fa-code-branch' },
  { id: 'principal',  label: 'Tableau principal',   icon: 'fas fa-trophy' },
  { id: 'consolante', label: 'Consolante',          icon: 'fas fa-shield-halved' },
];

const AppShell = ({ theme, screen, onNav, children, tournamentName }) => {
  const t = THEMES[theme];

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Roboto', sans-serif", background: t.pageBg }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: t.sidebarBg,
        borderRight: t.sidebarBorder,
        display: 'flex',
        flexDirection: 'column',
        padding: '0 0 24px',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: theme === 'classique' ? '1px solid #e8eaed' : '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: t.primary, letterSpacing: '-0.3px' }}>TENNIS DE TABLE</div>
          <div style={{ fontSize: 11, color: t.sidebarText, marginTop: 2, opacity: 0.7, fontWeight: 500, letterSpacing: '.3px' }}>GESTION DE TOURNOI</div>
        </div>



        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 10px' }}>
          {NAV_ITEMS.map(item => {
            const active = screen === item.id;
            return (
              <button key={item.id} onClick={() => onNav(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: active ? t.sidebarActiveBg : 'transparent',
                  color: active ? t.sidebarActiveText : t.sidebarText,
                  fontWeight: active ? 700 : 500,
                  fontSize: 14,
                  marginBottom: 2,
                  transition: 'all .15s ease',
                }}>
                <i className={item.icon} style={{ width: 18, textAlign: 'center', fontSize: 15 }}></i>
                {item.label}
              </button>
            );
          })}
        </nav>


      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          height: 56,
          background: t.topbarBg,
          borderBottom: t.topbarBorder,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          flexShrink: 0,
        }}>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
            {NAV_ITEMS.find(n => n.id === screen)?.label}
          </h1>
          <div></div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 28 }}>
          {children}
        </main>
      </div>
    </div>
  );
};

Object.assign(window, { AppShell, THEMES });
