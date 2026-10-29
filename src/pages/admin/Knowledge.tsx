import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { KnowledgeItem } from '../../api/types';
import { CloseIcon } from '../../components/Icons';
import { PageHeader } from './AdminLayout';

export function Knowledge() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [kind, setKind] = useState<KnowledgeItem['kind']>('url');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api.knowledge().then((r) => setItems(r.items)).catch((e) => setError((e as Error).message)); }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    try {
      const item = await api.addKnowledge(kind, value);
      setItems((x) => [item, ...x]);
      setValue('');
    } catch (err) { setError((err as Error).message); }
  };

  const remove = async (id: string) => {
    setItems((x) => x.filter((i) => i.id !== id));
    await api.deleteKnowledge(id).catch(() => {});
  };

  return (
    <>
      <PageHeader title="Knowledge" subtitle="Documents and pages your agents use to answer questions." />
      <form className="panel form form--inline" onSubmit={add}>
        <select value={kind} onChange={(e) => setKind(e.target.value as KnowledgeItem['kind'])} aria-label="Type">
          <option value="url">Website URL</option>
          <option value="text">Text / FAQ</option>
        </select>
        {kind === 'url' ? (
          <input type="url" value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://example.com/faq"
                 aria-label="URL" />
        ) : (
          <textarea rows={2} value={value} onChange={(e) => setValue(e.target.value)} aria-label="Text"
                    placeholder="Q: Do you work weekends? A: Yes, Saturdays 9–1." />
        )}
        <button type="submit" className="btn btn--dark">Add</button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      <ul className="list">
        {items.map((i) => (
          <li key={i.id} className="list__item">
            <span className="tag">{i.kind}</span>
            <span className="list__text">{i.value}</span>
            <button type="button" className="icon-btn" onClick={() => void remove(i.id)} aria-label="Remove">
              <CloseIcon width={12} height={12} />
            </button>
          </li>
        ))}
        {!items.length && <li className="muted">No sources yet.</li>}
      </ul>
      <p className="muted small">Sources are stored by agent-api. Index them for Hermes with a RAG MCP server
        (e.g. LanceDB/Chroma) — see the agent-api README.</p>
    </>
  );
}
