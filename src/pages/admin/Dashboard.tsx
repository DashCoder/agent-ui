import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { Dashboard as DashboardData } from '../../api/types';
import { ChevronRightIcon, GearIcon } from '../../components/Icons';
import { PageHeader } from './AdminLayout';

export function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setData(await api.dashboard()); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Overview of your AI assistant setup and recent activity."
        actions={<>
          <button type="button" className="btn btn--soft" onClick={() => void load()} disabled={loading}>↻ Refresh</button>
          <button type="button" className="btn btn--soft btn--icon" onClick={() => navigate('/admin/settings')}
                  aria-label="Settings"><GearIcon width={18} height={18} /></button>
        </>} />

      {error && <p className="form-error" role="alert">{error}</p>}

      <section className="panel" aria-labelledby="getting-started">
        <h2 id="getting-started" className="panel__title">Getting started</h2>
        <ol className="steps">
          {(data?.checklist ?? []).map((item, i) => (
            <li key={item.id}>
              <Link to={item.href} className={`step ${item.done ? 'step--done' : ''}`} data-testid={`step-${item.id}`}>
                <span className="step__num">{item.done ? '✓' : i + 1}</span>
                <span className="step__icon" aria-hidden>{item.icon}</span>
                <span className="step__body">
                  <span className="step__title">{item.title}</span>
                  <span className="step__desc">{item.description}</span>
                </span>
                <ChevronRightIcon className="step__chev" />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {data && (
        <div className="stats">
          <Stat label="Conversations (24h)" value={data.stats.conversations24h} />
          <Stat label="Messages (24h)" value={data.stats.messages24h} />
          <Stat label="Saved replies" value={data.stats.savedReplies} />
          <Stat label="Knowledge sources" value={data.stats.knowledgeSources} />
          <Link to="/admin/hermes" className="stat stat--link">
            <span className="stat__label">Agent</span>
            <span className="stat__value stat__value--sm">
              <span className={`dot ${data.agent.reachable ? 'dot--ok' : 'dot--bad'}`} />
              {data.agent.mode === 'mock' ? 'Mock agent' : data.agent.reachable ? 'Hermes connected' : 'Hermes offline'}
            </span>
          </Link>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  );
}
