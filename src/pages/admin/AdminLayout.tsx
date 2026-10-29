import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { BrandMark } from '../../components/Icons';
import { useSiteConfig } from '../../hooks/useSiteConfig';

/** Sidebar entries. Add a page: create it, add a route in App.tsx and an entry here. */
export const NAV = [
  { to: '/admin', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/admin/builder', label: 'Builder', icon: '💬' },
  { to: '/admin/avatar', label: 'Avatar', icon: '🐾' },
  { to: '/admin/phone', label: 'Phone', icon: '📞' },
  { to: '/admin/calendar', label: 'Calendar', icon: '📅' },
  { to: '/admin/knowledge', label: 'Knowledge', icon: '📚' },
  { to: '/admin/hermes', label: 'Hermes', icon: '🤖' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export function AdminLayout() {
  const { config } = useSiteConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    api.me()
      .then(({ user }) => {
        if (user?.role === 'admin') setState('ok');
        else navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true });
      })
      .catch(() => setState('error'));
  }, [navigate, location.pathname]);

  const logout = async () => {
    await api.logout().catch(() => {});
    navigate('/login');
  };

  return (
    <div className="admin-theme admin">
      <header className="admin__top">
        <Link to="/admin" className="admin__brand"><BrandMark /> {config.brand.adminTitle}</Link>
        <div className="admin__top-links">
          <button type="button" className="linklike" onClick={() => void logout()}>Sign out</button>
          <Link to={config.brand.landingUrl || '/'} className="admin__landing">← Landing page</Link>
        </div>
      </header>
      <div className="admin__body">
        <nav className="admin__nav" aria-label="Admin">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="navbtn">
              <span className="navbtn__icon" aria-hidden>{n.icon}</span>{n.label}
            </NavLink>
          ))}
        </nav>
        <main className="admin__main">
          {state === 'ok' && <Outlet />}
          {state === 'loading' && <p className="muted">Loading…</p>}
          {state === 'error' && <p className="form-error" role="alert">Can't reach agent-api. Is it running on port 8000?</p>}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-head__title">{title}</h1>
        {subtitle && <p className="page-head__sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </div>
  );
}
