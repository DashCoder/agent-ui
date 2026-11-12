import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { KnowledgeItem } from '../../api/types';
import { PageHeader } from './PageHeader';

/** /admin/knowledge — documents and pages the agents use to answer (DogRun "Knowledge"). */
export function Knowledge() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [showText, setShowText] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.knowledge().then((r) => setItems(r.items)).catch((e) => setError((e as Error).message)).finally(() => setLoading(false));
  }, []);

  const add = async (kind: KnowledgeItem['kind'], value: string) => {
    if (!value.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const item = await api.addKnowledge(kind, value);
      setItems((x) => [item, ...x]);
      if (kind === 'url') setUrl(''); else { setText(''); setShowText(false); }
    } catch (err) { setError((err as Error).message); }
    setBusy(false);
  };
  const addUrl = (e: FormEvent) => { e.preventDefault(); void add('url', url); };

  const remove = async (id: string) => {
    const prev = items;
    setItems((x) => x.filter((i) => i.id !== id));
    await api.deleteKnowledge(id).catch((e) => { setItems(prev); setError((e as Error).message); });
  };

  return (
    <>
      <PageHeader title="Knowledge" subtitle="Reference material your agents use to answer questions." />
      <section className="panel">
        <p className="page-head__sub" style={{ marginTop: 0, marginBottom: 18 }}>
          Add a link (a Google Doc, a page on your website, any URL) or paste text such as FAQs, prices or opening
          hours. You can add as many sources as you like.
        </p>
        <form className="row" onSubmit={addUrl}>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="URL"
                 placeholder="https://docs.google.com/... or any URL" />
          <button type="submit" className="btn btn--dark" disabled={busy || !url.trim()}>Add link</button>
          <button type="button" className="btn btn--ghost" onClick={() => setShowText((s) => !s)} aria-expanded={showText}>
            {showText ? 'Cancel' : 'Add text'}</button>
        </form>
        {showText && (
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} aria-label="Text"
                      placeholder="Q: Do you work weekends? A: Yes, Saturdays 9–1." />
            <div><button type="button" className="btn btn--dark" disabled={busy || !text.trim()} onClick={() => void add('text', text)}>
              Save text</button></div>
          </div>
        )}
        {error && <p className="form-error" role="alert" style={{ marginTop: 12 }}>{error}</p>}
        {loading && <p className="muted small">Loading…</p>}
        {!loading && !items.length && !error && (
          <p className="muted small" style={{ fontStyle: 'italic', marginTop: 16 }}>No knowledge sources yet. Add a link or some text above.</p>
        )}
        {items.length > 0 && (
          <ul className="list" style={{ marginTop: 16 }} data-testid="knowledge">
            {items.map((i) => (
              <li key={i.id} className="list__item">
                <div style={{ minWidth: 0 }}>
                  {i.kind === 'url'
                    ? <a className="list__title" href={i.value} target="_blank" rel="noopener noreferrer">{i.value}</a>
                    : <span className="list__title">{i.value.length > 140 ? `${i.value.slice(0, 139)}…` : i.value}</span>}
                  <p className="list__sub">{i.kind === 'url' ? 'Web page' : `Text · ${i.value.length.toLocaleString()} characters`}
                    {' · added '}{new Date(i.created_at * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                </div>
                <button type="button" className="link-btn" onClick={() => void remove(i.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small" style={{ marginTop: 20 }}>Sources are stored by agent-api. To let Hermes search them,
          index them with a RAG MCP server (e.g. LanceDB or Chroma) — see the agent-api README.</p>
      </section>
    </>
  );
}
