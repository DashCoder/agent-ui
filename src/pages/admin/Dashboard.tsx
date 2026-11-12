import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { AuditEvent, Conversation, Dashboard as DashboardData, Usage } from '../../api/types';
import { AdminIcon } from '../../components/AdminIcons';
import { ChevronRightIcon, GearIcon } from '../../components/Icons';
import type { AdminIconName } from '../../plugins/types';
import { explain, who } from './events';
import { PageHeader } from './PageHeader';
import { ALL, hrefFor, useAgent, type Agent } from './agents';

export const fmtTime = (t: number) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit',
  minute: '2-digit', timeZone: 'Europe/London' }).format(new Date(t * 1000));

/** /admin — the picked agent's dashboard: the core one for All agents, otherwise the agent's own (or a standard one). */
export function Dashboard() {
  const { agent } = useAgent();
  if (agent.id === ALL) return <CoreDashboard />;
  if (agent.plugin?.dashboard) return <>{agent.plugin.dashboard}</>;
  return <AgentDashboard agent={agent} />;
}

const STEP_ICONS: Record<string, AdminIconName> = { widget: 'agent', knowledge: 'knowledge', calendar: 'calendar', phone: 'phone' };
const STEP_ORDER = ['widget', 'knowledge', 'calendar', 'phone'];

function CoreDashboard() {
  const navigate = useNavigate();
  const { agents } = useAgent();
  const [data, setData] = useState<DashboardData | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, u] = await Promise.all([api.dashboard(), api.usage().catch(() => null)]);
      setData(d); setUsage(u);
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const tools = usage?.agents.reduce((n, a) => n + a.today.toolCalls, 0);
  const actions = usage?.agents.reduce((n, a) => n + a.today.actions, 0);
  const steps = [...(data?.checklist ?? [])].sort((a, b) => STEP_ORDER.indexOf(a.id) - STEP_ORDER.indexOf(b.id));

  return (
    <>
      <PageHeader title="Dashboard" status={data ? statusText(data, agents.length) : undefined}
        subtitle="Overview of your AI assistant setup and recent activity."
        actions={<>
          <button type="button" className="btn btn--ghost" onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing…' : '↻ Refresh'}</button>
          <button type="button" className="btn btn--ghost btn--icon" onClick={() => navigate('/admin/settings')}
                  aria-label="Settings"><GearIcon width={16} height={16} /></button>
        </>} />

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="stats">
        <Stat label="Agent interactions" value={data?.stats.messages24h} sub="messages from visitors, last 24 h" />
        <Stat label="Conversations" value={data?.stats.conversations24h} sub="started in the last 24 h" />
        <Stat label="Tool calls" value={tools} sub={`by your agents today${actions ? ` · ${actions} other actions` : ''}`} />
        <Stat label="Knowledge sources" value={data?.stats.knowledgeSources} sub="documents and pages" />
      </div>

      <section className="panel panel--subtle" aria-labelledby="getting-started">
        <h2 id="getting-started" className="panel__title">Getting started</h2>
        <ol className="steps">
          {steps.map((item, i) => (
            <li key={item.id}>
              <Link to={item.id === 'widget' ? '/admin/agent' : item.href} className={`step ${item.done ? 'step--done' : ''}`}
                    data-testid={`step-${item.id}`}>
                <span className="step__lead">
                  <span className="step__num">{item.done ? '✓' : i + 1}</span>
                  <span className="step__icon"><AdminIcon name={STEP_ICONS[item.id] ?? 'docs'} /></span>
                </span>
                <span className="step__body">
                  <span className="step__title">{item.id === 'widget' ? 'Agent personality' : item.title}</span>
                  <span className="step__desc">{item.description}</span>
                </span>
                <ChevronRightIcon className="step__chev" />
              </Link>
            </li>
          ))}
          <li>
            <Link to="/admin/model" className={`step ${data?.agent.reachable ? 'step--done' : ''}`} data-testid="step-model">
              <span className="step__lead">
                <span className="step__num">{data?.agent.reachable ? '✓' : steps.length + 1}</span>
                <span className="step__icon"><AdminIcon name="model" /></span>
              </span>
              <span className="step__body">
                <span className="step__title">Model &amp; tools</span>
                <span className="step__desc">
                  {data?.agent.mode === 'mock' ? 'Running the built-in mock agent. Connect Hermes to use a real model.'
                    : data?.agent.reachable ? 'Hermes is connected. See the model and the tools your agents can use.'
                      : 'Hermes is offline. Check the connection and the tools your agents can use.'}
                </span>
              </span>
              <ChevronRightIcon className="step__chev" />
            </Link>
          </li>
        </ol>
      </section>

      <RecentConversations />
    </>
  );
}

function statusText(d: DashboardData, agents: number): string {
  if (d.agent.mode === 'mock') return 'Mock agent running';
  if (!d.agent.reachable) return '';
  return agents ? `Hermes connected · ${agents} agent${agents === 1 ? '' : 's'}` : 'Hermes connected';
}

export function Stat({ label, value, sub }: { label: string; value: number | string | undefined; sub?: string }) {
  return (
    <div className="stat">
      <span className="stat__value">{value ?? '…'}</span>
      <span className="stat__label">{label}</span>
      {sub && <span className="stat__sub">{sub}</span>}
    </div>
  );
}

export function StatusPill({ status }: { status: Conversation['status'] }) {
  return status === 'answered'
    ? <span className="status status--ok">Answered</span>
    : <span className="status status--muted">No reply</span>;
}

/** The latest five chat conversations, with a link to Agent logs. */
function RecentConversations() {
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api.conversations({ limit: 5 }).then((r) => setItems(r.items)).catch((e) => setError((e as Error).message)); }, []);
  return (
    <section className="panel" aria-labelledby="recent">
      <div className="panel__head">
        <h2 id="recent" className="panel__title">Recent activity</h2>
        <Link to="/admin/logs" className="panel__link">View all →</Link>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {items === null && !error && <p className="muted small">Loading…</p>}
      {items?.length === 0 && <p className="muted small">No activity yet — conversations from your chat assistant will appear here.</p>}
      <ul className="activity">
        {items?.map((c) => (
          <li key={c.id}>
            <span className="activity__time">{fmtTime(c.lastAt)}</span>
            <span className="activity__chan">Chat</span>
            <span className="activity__text"><span>{c.summary ?? '(no message)'}</span>{c.reply && <span>AI: {c.reply}</span>}</span>
            <StatusPill status={c.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The standard dashboard for an agent without its own: its activity, its pages, its latest actions. */
function AgentDashboard({ agent }: { agent: Agent }) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setError(null);
    api.usage(agent.id).then(setUsage).catch((e) => setError((e as Error).message));
    api.activity(agent.id, 5).then((r) => setEvents(r.items)).catch(() => setEvents([]));
  }, [agent.id]);
  useEffect(() => { load(); }, [load]);
  const u = usage?.agents[0];
  const pages = agent.menu.flatMap((s) => s.items).filter((i) => i.to && !['logs', 'usage', 'plugins', 'settings'].includes(i.to));

  return (
    <>
      <PageHeader title={agent.name} subtitle={agent.description ?? `What ${agent.name} has done, and its pages.`}
        actions={<button type="button" className="btn btn--ghost" onClick={load}>↻ Refresh</button>} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="stats">
        <Stat label="Actions today" value={u?.today.actions} sub={`things ${agent.name} did or recorded`} />
        <Stat label="Tool calls today" value={u?.today.toolCalls} sub="from Hermes and assistants" />
        <Stat label="Actions this month" value={u?.month.actions} />
        <Stat label="Tool calls this month" value={u?.month.toolCalls} />
      </div>
      {pages.length > 0 && (
        <section className="panel panel--subtle" aria-labelledby="agent-pages">
          <h2 id="agent-pages" className="panel__title">Getting started</h2>
          <ol className="steps">
            {pages.map((item, i) => (
              <li key={item.to}>
                <Link to={hrefFor(item, agent.id)} className="step">
                  <span className="step__lead">
                    <span className="step__num">{i + 1}</span>
                    <span className="step__icon"><AdminIcon name={item.icon} /></span>
                  </span>
                  <span className="step__body">
                    <span className="step__title">{item.label}</span>
                    {item.description && <span className="step__desc">{item.description}</span>}
                  </span>
                  <ChevronRightIcon className="step__chev" />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
      <section className="panel" aria-labelledby="agent-recent">
        <div className="panel__head">
          <h2 id="agent-recent" className="panel__title">Recent activity</h2>
          <Link to={`/admin/logs?agent=${agent.id}`} className="panel__link">View all →</Link>
        </div>
        {events?.length === 0 && <p className="muted small">Nothing yet — what {agent.name} does will appear here.</p>}
        <ul className="activity">
          {events?.map((e) => (
            <li key={e.id}>
              <span className="activity__time">{fmtTime(e.ts)}</span>
              <span className="activity__chan">{e.action === 'mcp.call' ? 'Tool call' : who(e.actor)}</span>
              <span className="activity__text"><span>{describe(e)}</span></span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/** One line for a log entry (see events.ts: agents can describe their own entries in words). */
export function describe(e: AuditEvent): string {
  const t = explain(e);
  return `${t.what}${t.failed && !t.what.toLowerCase().includes('fail') ? ' (failed)' : ''}`;
}
