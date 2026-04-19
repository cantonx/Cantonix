import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import logo from './assets/logo.png';
import './styles/layout.css';

/* ── Icons ───────────────────────────────────────────────────────────────── */
const IconDashboard = () => (
  <svg className="sidebar-link-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="1" width="6" height="6" rx="1" />
    <rect x="9" y="1" width="6" height="6" rx="1" />
    <rect x="1" y="9" width="6" height="6" rx="1" />
    <rect x="9" y="9" width="6" height="6" rx="1" />
  </svg>
);
const IconSwap = () => (
  <svg className="sidebar-link-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 5h12M10 2l4 3-4 3M14 11H2M6 8l-4 3 4 3" />
  </svg>
);
const IconOnboard = () => (
  <svg className="sidebar-link-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="5" r="3" />
    <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <path d="M11 9l2 2 3-3" />
  </svg>
);
const IconNetwork = () => (
  <svg className="sidebar-link-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6" />
    <path d="M8 2a9 9 0 0 1 0 12M8 2a9 9 0 0 0 0 12M2 8h12" />
  </svg>
);
const IconHistory = () => (
  <svg className="sidebar-link-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6" />
    <path d="M8 5v3l2 2" />
  </svg>
);
const IconLogout = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    <path d="M11 11l3-3-3-3" />
    <path d="M14 8H6" />
  </svg>
);

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
type NavPage = 'dashboard' | 'onboarding' | 'swap' | 'network' | 'history';

interface SidebarProps {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const { user, logout } = useAuth();
  const network = (import.meta.env.VITE_NETWORK || 'DevNet');
  const networkLabel = network.charAt(0).toUpperCase() + network.slice(1).toLowerCase();

  const navItems: { id: NavPage; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard',  label: 'Dashboard',    icon: <IconDashboard /> },
    { id: 'onboarding', label: 'Onboarding',   icon: <IconOnboard /> },
    { id: 'swap',       label: 'CC Swap',      icon: <IconSwap /> },
    { id: 'network',    label: 'Network Info', icon: <IconNetwork /> },
    { id: 'history',    label: 'History',      icon: <IconHistory /> },
  ];

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '??';
  const shortParty = user?.partyId
    ? user.partyId.replace('party-', 'p-').slice(0, 14) + '…'
    : user?.onboardingStatus === 'pending' ? 'pending approval…'
    : user?.onboardingStatus === 'rejected' ? 'rejected'
    : 'no party assigned';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img src={logo} alt="Cantonix" className="sidebar-logo-img" />
        <div className="sidebar-logo-sub">Validator Hub</div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-link ${activePage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Network badge */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-label">Network</div>
        <span className="sidebar-badge info">{networkLabel}</span>
      </div>

      {/* User pill + logout */}
      {user && (
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-email">{user.email}</div>
            <div className="sidebar-user-party">{shortParty}</div>
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
          >
            <IconLogout />
          </button>
        </div>
      )}
    </aside>
  );
};

/* ── Placeholder pages ───────────────────────────────────────────────────── */
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <>
    <div className="main-header">
      <div className="main-header-left">
        <span className="main-header-title">{title}</span>
      </div>
    </div>
    <div className="main-body">
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '3rem 2rem' }}>
          <div style={{ fontSize: 32, marginBottom: '0.5rem' }}>🚧</div>
          <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{title}</div>
          <div style={{ fontSize: 12 }}>This section is coming soon.</div>
        </div>
      </div>
    </div>
  </>
);

/* ── App Shell (authenticated) ───────────────────────────────────────────── */
function AppShell() {
  const [activePage, setActivePage] = useState<NavPage>('dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':  return <Dashboard />;
      case 'onboarding': return <OnboardingPage />;
      case 'swap':       return <PlaceholderPage title="CC Swap" />;
      case 'network':    return <PlaceholderPage title="Network Info" />;
      case 'history':    return <PlaceholderPage title="History" />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="main-content">{renderPage()}</main>
    </div>
  );
}

/* ── Root — gates on auth state ──────────────────────────────────────────── */
function AppRoot() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--color-background-primary)',
      }}>
        <span className="spinner" style={{ width: 20, height: 20, borderWidth: 3 }} />
      </div>
    );
  }

  return user ? <AppShell /> : <AuthPage />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="*" element={<AppRoot />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
