import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { Usage, UsageCounts } from '../../api/types';
import { PageHeader } from './PageHeader';
import { ALL, useAgent } from './agents';

const num = (n: number) => new Intl.NumberFormat('en-GB').format(Math.round(n));
const monthLabel = (m: string) => new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  .format(new Date(`${m}-01T00:00:00Z`));

/** /admin/usage — what each agent did today, this month and before (DogRun "Billing" → Usage & costs). */
export function UsagePage() {
  const { agent, agents } = useAgent();
  const [data, setData] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await api.usage(agent.id)); } catch (e) { setError((e as Error).message); }
    setLoading(false);
  }, [agent.id]);
  useEffect(() => { void refresh(); }, [refresh]);

  const nameOf = (id: string) => (id === 'assistant' ? 'Chat assistant' : agents.find((a) => a.id === id)?.name ?? id);
  const rows = data?.agents ?? [];
  const totalToday = rows.reduce((n, a) => n + a.today.toolCalls + a.today.actions + a.today.messages, 0);
  const month = data && sum(rows.map((a) => a.month));
  const who = agent.id === ALL ? 'Your agents' : agent.name;

  return (
    <>
      <PageHeader title="Usage & costs"
        subtitle={`${who}${agent.id === ALL ? '' : "'s"} activity today · ${data ? num(totalToday) : '…'} messages, tool calls and actions`}
        actions={<button type="button" className="btn" onClick={() => void refresh()} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>} />
      {error && <p className="form-error" role="alert">{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {rows.map((a) => {
          const share = month && month.toolCalls + month.actions + month.messages
            ? ((a.month.toolCalls + a.month.actions + a.month.messages) / (month.toolCalls + month.actions + month.messages)) * 100 : 0;
          return (
            <div key={a.id} className={`panel ${a.id === agent.id ? 'agent-card--current' : ''}`} style={{ margin: 0, padding: '20px 24px' }}
                 data-testid="usage-agent">
              <div className="agent-card__head">
                <div>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{nameOf(a.id)}</span>
                  <span className="muted small" style={{ marginLeft: 8 }}>{a.id === 'assistant' ? 'core' : a.id}</span>
                </div>
                <span className="mono">{num(a.today.messages + a.today.toolCalls + a.today.actions)} today</span>
              </div>
              <div className="meter" role="progressbar" aria-label={`${nameOf(a.id)}: share of this month's activity`}
                   aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share)}><span style={{ width: `${share}%` }} /></div>
              <p className="small" style={{ margin: 0, color: 'var(--adm-text-2)' }}>
                Today: {line(a.today)} · This month: <strong className="mono">{line(a.month)}</strong>
              </p>
            </div>
          );
        })}
        {data && !rows.length && <p className="muted">No usage data for this agent.</p>}
      </div>

      {data && month && (
        <section className="panel">
          <h2 className="panel__title" style={{ marginBottom: 4 }}>{monthLabel(data.currentMonth)} to date</h2>
          <p className="page-head__sub" style={{ margin: '0 0 14px' }}>All of {who.toLowerCase() === 'your agents' ? 'your agents’' : `${who}’s`} activity this month.</p>
          <dl className="usage-grid">
            <div><dt>AI cost</dt><dd>{data.costTracked ? `$${(month.cost ?? 0).toFixed(2)}` : '—'}</dd>
              <dd>{data.costTracked ? `${num(month.modelCalls ?? 0)} model calls` : 'no model calls logged yet'}</dd></div>
            <div><dt>Messages</dt><dd>{num(month.messages)}</dd><dd>{num(month.conversations)} conversations</dd></div>
            <div><dt>Tool calls</dt><dd>{num(month.toolCalls)}</dd></div>
            <div><dt>Actions</dt><dd>{num(month.actions)}</dd></div>
          </dl>
        </section>
      )}

      {data && (
        <section className="panel">
          <h2 className="panel__title">History</h2>
          <div className="tbl-wrap">
            <table className="tbl tbl--num" style={{ minWidth: 520 }}>
              <thead><tr><th scope="col">Period</th><th scope="col">Messages</th><th scope="col">Conversations</th>
                <th scope="col">Tool calls</th><th scope="col">Actions</th></tr></thead>
              <tbody>
                {data.history.map((h) => (
                  <tr key={h.month}>
                    <td style={{ fontWeight: h.month === data.currentMonth ? 600 : 400 }}>{monthLabel(h.month)}{h.month === data.currentMonth ? ' (current)' : ''}</td>
                    <td className="mono">{num(h.messages)}</td><td className="mono">{num(h.conversations)}</td>
                    <td className="mono">{num(h.toolCalls)}</td><td className="mono">{num(h.actions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="muted small" style={{ margin: 0 }}>
        Messages are what visitors typed to the chat assistant. Tool calls are what Hermes, Copilot and Claude asked an
        agent to do; actions are what an agent recorded itself (drafts, approvals, logins). AI cost adds up what
        OpenRouter reported for each model call made through Model &amp; tools; local models cost nothing; Bedrock and
        Hermes' own model calls show on those providers' billing pages.
      </p>
    </>
  );
}

function line(c: UsageCounts) {
  const parts = [];
  if (c.messages) parts.push(`${num(c.messages)} messages`);
  parts.push(`${num(c.toolCalls)} tool calls`, `${num(c.actions)} actions`);
  return parts.join(' · ');
}

function sum(list: UsageCounts[]): UsageCounts {
  return list.reduce((t, c) => ({ messages: t.messages + c.messages, conversations: t.conversations + c.conversations,
    toolCalls: t.toolCalls + c.toolCalls, actions: t.actions + c.actions, modelCalls: (t.modelCalls ?? 0) + (c.modelCalls ?? 0),
    cost: (t.cost ?? 0) + (c.cost ?? 0) }), { messages: 0, conversations: 0, toolCalls: 0, actions: 0, modelCalls: 0, cost: 0 });
}
