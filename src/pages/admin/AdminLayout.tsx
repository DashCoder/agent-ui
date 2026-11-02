import { useEffect, useState } from 'react';
import { PLUGIN_ADMIN_PAGES } from '../../plugins';
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
  { to: '/admin/audit', label: 'Audit', icon: '📜' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

type NavItem = { to: string; label: string; icon: string; end?: boolean };

/** Core pages plus plugin pages, each plugin page placed after the page it names (default: before Settings). */
export function navItems(): NavItem[] {
  const items: NavItem[] = [...NAV];
  for (const pg of PLUGIN_ADMIN_PAGES) {
    const item = { to: `/admin/${pg.path}`, label: pg.label, icon: pg.icon };
    const anchor = pg.after === undefined ? -1 : items.findIndex((n) => n.to === (pg.after ? `/admin/${pg.after}` : '/admin'));
    if (anchor >= 0) items.splice(anchor + 1, 0, item);
    else items.splice(items.length - 1, 0, item);
  }
  return items;
}

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
          {navItems().map((n) => (
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

export { PageHeader } from './PageHeader';
