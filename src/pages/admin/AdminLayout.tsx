import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { AdminIcon } from '../../components/AdminIcons';
import { BrandMark } from '../../components/Icons';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { BADGES_EVENT } from './badges';
import { AgentContext, ALL, agentFor, buildAgents, hrefFor, switchTo, type Agent } from './agents';

/**
 * The admin harness (DogRun Command look): dark top bar, light left menu with line icons and section headings, an
 * Agent dropdown that swaps the menu for that agent's own, and white panels on a grey canvas.
 */
export function AdminLayout() {
  const { config } = useSiteConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [collapsed, setCollapsed] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const { all, agents } = useMemo(() => buildAgents(), []);
  const agentId = agentFor(location.pathname, location.search, agents);
  const agent: Agent = agents.find((a) => a.id === agentId) ?? all;

  useEffect(() => {
    api.me()
      .then(({ user }) => {
        if (user?.role === 'admin') setState('ok');
        else navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
      })
      .catch(() => setState('error'));
  }, [navigate, location.pathname, location.search]);

  // Start collapsed on narrow screens so content keeps most of the width.
  useEffect(() => { if (window.matchMedia('(max-width: 760px)').matches) setCollapsed(true); }, []);

  // Counts on menu items (e.g. emails waiting for review): refreshed when the agent or page changes, and when a page
  // calls refreshBadges() after changing something.
  const [badgeTick, setBadgeTick] = useState(0);
  useEffect(() => {
    const bump = () => setBadgeTick((n) => n + 1);
    window.addEventListener(BADGES_EVENT, bump);
    return () => window.removeEventListener(BADGES_EVENT, bump);
  }, []);
  useEffect(() => {
    if (state !== 'ok') return;
    let live = true;
    for (const item of agent.menu.flatMap((s) => s.items)) {
      if (!item.badge) continue;
      item.badge().then((n) => live && setBadges((b) => ({ ...b, [`${agent.id}:${item.to}`]: n }))).catch(() => {});
    }
    return () => { live = false; };
  }, [agent, state, location.pathname, badgeTick]);

  const logout = async () => {
    await api.logout().catch(() => {});
    navigate('/login');
  };

  const isActive = (href: string) => {
    if (agent.id === ALL && href.includes('?agent=')) return false; // links in "Agents" open another agent
    return location.pathname.replace(/\/$/, '') === href.split('?')[0];
  };
  const host = config.brand.adminTitle || window.location.host;
  const product = config.brand.consoleName || 'InAgentic Command';

  return (
    <AgentContext.Provider value={{ agent, agents }}>
      <div className="admin-theme cmd">
        <header className="cmd__top">
          <Link to="/admin" className="cmd__brand">
            <BrandMark width={26} height={26} />
            <span className="cmd__product">{product}</span>
            <span className="cmd__host">{host}</span>
          </Link>
          <span className="cmd__spacer" />
          <button type="button" className="cmd__toplink" onClick={() => void logout()}>Sign out</button>
          <a href={config.brand.landingUrl || '/'} className="cmd__toplink">View site ↗</a>
        </header>
        <div className="cmd__body">
          <aside className={`cmd__side ${collapsed ? 'cmd__side--collapsed' : ''}`}>
            <button type="button" className="cmd__burger" onClick={() => setCollapsed((c) => !c)}
                    aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!collapsed}>
              <svg viewBox="0 0 20 20" width={20} height={20} aria-hidden="true">
                <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
              </svg>
            </button>
            {!collapsed && agents.length > 0 && (
              <div className="cmd__agent">
                <label htmlFor="agent-switcher">Agent</label>
                <select id="agent-switcher" value={agent.id} onChange={(e) => navigate(switchTo(location.pathname, e.target.value))}>
                  <option value={ALL}>All agents</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.id}</option>)}
                </select>
              </div>
            )}
            <nav aria-label="Admin sections" className="cmd__nav">
              {agent.menu.filter((s) => s.items.length).map((section, i) => (
                <div key={section.title ?? `top-${i}`} role="group" aria-label={section.title}>
                  {section.title && (collapsed ? <hr className="cmd__rule" aria-hidden /> : <p className="cmd__navhead">{section.title}</p>)}
                  {section.items.map((item) => {
                    const href = hrefFor(item, agent.id);
                    const active = isActive(href);
                    const badge = badges[`${agent.id}:${item.to}`];
                    return (
                      <Link key={item.to + item.label} to={href} className="cmd__item" aria-current={active ? 'page' : undefined}
                            title={collapsed ? item.label : undefined}>
                        {active && <span className="cmd__bar" aria-hidden />}
                        <AdminIcon name={item.icon} />
                        {!collapsed && <span className="cmd__label">{item.label}</span>}
                        {!!badge && <span className={`cmd__badge ${collapsed ? 'cmd__badge--dot' : ''}`}>{badge}</span>}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>
          <main className="cmd__main">
            <div className="cmd__content">
              {state === 'ok' && <Outlet />}
              {state === 'loading' && <p className="muted">Loading…</p>}
              {state === 'error' && <p className="form-error" role="alert">Can't reach agent-api. Is it running on port 8000?</p>}
              <p className="cmd__footer">{product} · {host} · Powered by agent-api</p>
            </div>
          </main>
        </div>
      </div>
    </AgentContext.Provider>
  );
}

export { PageHeader } from './PageHeader';
