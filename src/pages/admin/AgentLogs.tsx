import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { AuditEvent, Conversation, ConversationMessage } from '../../api/types';
import { StatusPill, describe, fmtTime } from './Dashboard';
import { PageHeader } from './PageHeader';
import { ALL, useAgent } from './agents';

const fmtClock = (t: number) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit',
  timeZone: 'Europe/London' }).format(new Date(t * 1000));
const dayStart = (d: string) => (d ? new Date(`${d}T00:00:00`).getTime() / 1000 : 0);

/** /admin/logs — every conversation and every action, newest first (DogRun "Agent logs"). With an agent picked,
 * only that agent's actions. */
export function AgentLogs() {
  const { agent } = useAgent();
  const [params, setParams] = useSearchParams();
  const conversationsShown = agent.id === ALL;
  const tab = conversationsShown && params.get('tab') !== 'actions' ? 'conversations' : 'actions';
  const pick = (t: string) => { const p = new URLSearchParams(params); p.set('tab', t); setParams(p, { replace: true }); };
  const name = agent.id === ALL ? 'your agents' : agent.name;

  return (
    <>
      <PageHeader title="Agent logs" subtitle={tab === 'conversations'
        ? 'Every conversation on the chat assistant — newest first. Open a row to read it.'
        : `Everything ${name} did: tool calls, drafts, approvals, sign-ins — newest first. Entries are never edited.`} />
      <section className="panel">
        {conversationsShown && (
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'conversations'} onClick={() => pick('conversations')}>Conversations</button>
            <button type="button" role="tab" aria-selected={tab === 'actions'} onClick={() => pick('actions')}>Actions</button>
          </div>
        )}
        {tab === 'conversations' ? <Conversations /> : <Actions agentId={agent.id} name={name} />}
      </section>
    </>
  );
}

function Conversations() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [items, setItems] = useState<Conversation[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const latest = useRef(0);
  const filtered = !!(from || to);
  const query = useCallback((offset: number) => api.conversations({
    offset, limit: 25, since: dayStart(from), until: to ? dayStart(to) + 86400 : undefined }), [from, to]);

  useEffect(() => {
    const id = ++latest.current;
    setLoading(true); setError(null);
    query(0).then((r) => { if (id === latest.current) { setItems(r.items); setHasMore(r.hasMore); } })
      .catch((e) => id === latest.current && setError((e as Error).message))
      .finally(() => id === latest.current && setLoading(false));
  }, [query]);
  const more = async () => {
    setLoading(true);
    try { const r = await query(items.length); setItems((x) => [...x, ...r.items]); setHasMore(r.hasMore); }
    catch (e) { setError((e as Error).message); }
    setLoading(false);
  };

  return (
    <>
      <form role="search" aria-label="Filter logs" className="filters" onSubmit={(e) => e.preventDefault()}>
        <label>Channel<select value="chat" disabled aria-label="Channel"><option value="chat">Chat</option></select></label>
        <label>From<input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>To<input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label>
        {filtered && <button type="button" className="btn" onClick={() => { setFrom(''); setTo(''); }}>Clear filters</button>}
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="tbl-wrap">
        <table className="tbl" style={{ minWidth: 640, tableLayout: 'fixed' }}>
          <colgroup><col style={{ width: 112 }} /><col style={{ width: 90 }} /><col style={{ width: 132 }} /><col /><col style={{ width: 120 }} /></colgroup>
          <thead><tr><th scope="col">Time</th><th scope="col">Channel</th><th scope="col">Contact</th><th scope="col">Summary</th><th scope="col">Status</th></tr></thead>
          <tbody>
            {items.map((c) => {
              const isOpen = open === c.id;
              return (
                <Fragment key={c.id}>
                  <tr className={isOpen ? 'open' : undefined} data-testid="conversation-row">
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtTime(c.lastAt)}</td>
                    <td>Chat</td>
                    <td style={{ overflowWrap: 'anywhere' }}>{c.contact}</td>
                    <td style={{ overflowWrap: 'anywhere' }}>
                      <button type="button" className="linklike" aria-expanded={isOpen} style={{ textAlign: 'left', fontWeight: 400 }}
                              onClick={() => setOpen(isOpen ? null : c.id)}>{c.summary ?? '(no message)'}</button>
                      {c.reply && <span className="clamp2 muted" style={{ display: 'block', marginTop: 4 }}>AI: {c.reply}</span>}
                      {c.questions > 1 && <span className="muted small" style={{ display: 'block', marginTop: 2 }}>{c.questions} messages</span>}
                    </td>
                    <td><StatusPill status={c.status} /></td>
                  </tr>
                  {isOpen && <tr className="open"><td colSpan={5} style={{ padding: '14px 16px' }}><Transcript id={c.id} /></td></tr>}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {!loading && !items.length && !error && (
        <p className="muted" style={{ margin: '16px 0 0' }}>{filtered ? 'No conversations match these filters.'
          : 'No conversations yet — when people talk to your assistant, they appear here.'}</p>
      )}
      <div className="row" style={{ marginTop: 16 }}>
        {hasMore && <button type="button" className="btn" onClick={() => void more()} disabled={loading}>{loading ? 'Loading…' : 'Load more'}</button>}
        {loading && !hasMore && <span className="muted small">Loading…</span>}
      </div>
      <p className="muted small" style={{ margin: '16px 0 0' }}>Times are UK time. Slack conversations stay in Slack; each agent's
        actions are under Actions.</p>
    </>
  );
}

function Transcript({ id }: { id: string }) {
  const [messages, setMessages] = useState<ConversationMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api.conversation(id).then((r) => setMessages(r.messages)).catch((e) => setError((e as Error).message)); }, [id]);
  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (!messages) return <p className="muted small">Loading conversation…</p>;
  return (
    <div className="transcript" data-testid="transcript">
      {messages.map((m) => (
        <div key={m.id} className="transcript__row">
          <span className={`transcript__who ${m.role === 'user' ? 'transcript__who--user' : ''}`}>{m.role === 'user' ? 'Visitor' : 'AI'}</span>
          <span className="transcript__text">{m.text}</span>
          <span className="transcript__time">{fmtClock(m.created_at)}</span>
        </div>
      ))}
    </div>
  );
}

function Actions({ agentId, name }: { agentId: string; name: string }) {
  const [items, setItems] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setItems(null);
    api.activity(agentId, 300).then((r) => setItems(r.items)).catch((e) => setError((e as Error).message));
  }, [agentId]);
  return (
    <>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="tbl-wrap">
        <table className="tbl" style={{ minWidth: 640 }}>
          <thead><tr><th scope="col">Time</th><th scope="col">Who</th><th scope="col">What</th><th scope="col">Details</th></tr></thead>
          <tbody>
            {items?.map((e) => (
              <tr key={e.id} data-testid="audit-row">
                <td style={{ whiteSpace: 'nowrap' }}>{fmtTime(e.ts)}</td>
                <td>{e.actor}</td>
                <td>{e.action === 'mcp.call' ? <span className="status status--accent">Tool call</span> : e.action}<div className="small" style={{ marginTop: 2 }}>{describe(e)}</div></td>
                <td className="muted" style={{ overflowWrap: 'anywhere' }}>
                  {Object.entries(e.detail).filter(([k]) => k !== 'plugin').map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items === null && !error && <p className="muted small">Loading…</p>}
      {items?.length === 0 && <p className="muted" style={{ margin: '16px 0 0' }}>Nothing yet — what {name} does will appear here.</p>}
    </>
  );
}
