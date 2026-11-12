import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { AgentModel, ModelsOverview } from '../../api/types';

const HELP: Record<string, string> = {
  ollama: 'Runs on this Mac mini: free, private and works offline. Slower and less capable than the big cloud models.',
  openrouter: 'Any model on OpenRouter (Claude, Qwen, DeepSeek, Kimi, Gemini…). Paid per use; the cost is logged.',
  bedrock: 'Claude through your AWS account (Bedrock). Paid per use.',
  anthropic: 'Claude through Anthropic directly (ANTHROPIC_API_KEY in Hermes’ .env).',
};

interface PickerProps {
  title: string;
  intro: string;
  kinds: { id: string; name: string; ready?: boolean; note?: string | null }[];
  current: { provider: string; model: string } | null;
  suggestions: Record<string, string[]>;
  installed: string[];
  warnings?: Record<string, string>;
  onSave: (provider: string, model: string) => Promise<{ ok: boolean; message: string; steps?: string[] }>;
  onTest?: () => Promise<{ ok: boolean; message: string }>;
  saveLabel?: string;
  testid: string;
}

/** One model choice: provider radio cards, a model name, Save as default, and an optional test. */
export function Picker({ title, intro, kinds, current, suggestions, installed, warnings, onSave, onTest, saveLabel, testid }: PickerProps) {
  const [provider, setProvider] = useState(current?.provider ?? kinds[0]?.id ?? '');
  const [models, setModels] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'save' | 'test' | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string; steps?: string[] } | null>(null);
  useEffect(() => {
    if (!current) return;
    setProvider(current.provider);
    setModels((m) => ({ ...m, [current.provider]: current.model }));
  }, [current?.provider, current?.model]); // eslint-disable-line react-hooks/exhaustive-deps

  // what the box shows when nothing has been typed: the current model, else the first installed or suggested one
  const listFor = (id: string) => [...new Set([...(id === 'ollama' ? installed : []), ...(suggestions[id] ?? [])])];
  const shown = (id: string) => models[id] ?? (current?.provider === id ? current.model : listFor(id)[0] ?? '');
  const model = shown(provider).trim();
  const dirty = !current || provider !== current.provider || model !== current.model;
  const run = async (kind: 'save' | 'test') => {
    setBusy(kind); setResult(null);
    try { setResult(kind === 'save' ? await onSave(provider, model) : await onTest!()); }
    catch (e) { setResult({ ok: false, message: (e as Error).message }); }
    setBusy(null);
  };

  return (
    <section className="panel" data-testid={testid}>
      <h2 className="panel__title">{title}</h2>
      <p className="page-head__sub" style={{ margin: '4px 0 14px' }}>{intro}</p>
      <div className="engines" role="radiogroup" aria-label={title}>
        {kinds.map((k) => {
          const list = listFor(k.id);
          return (
            <label key={k.id} className={`engine ${provider === k.id ? 'engine--on' : ''}`} data-testid={`${testid}-${k.id}`}>
              <input type="radio" name={testid} value={k.id} checked={provider === k.id} onChange={() => setProvider(k.id)} />
              <span className="engine__body">
                <span className="engine__title">{k.name}
                  {current?.provider === k.id && <span className="status status--accent" style={{ marginLeft: 8 }}>In use</span>}
                  {k.ready !== undefined && <span className={`status status--${k.ready ? 'ok' : 'warn'}`} style={{ marginLeft: 8 }}>
                    {k.ready ? 'Ready' : 'Not set up'}</span>}</span>
                <span className="engine__text">{HELP[k.id] ?? ''}
                  {provider === k.id && (
                    <span className="engine__field">
                      <input list={`${testid}-${k.id}-models`} value={shown(k.id)}
                             onChange={(e) => setModels((m) => ({ ...m, [k.id]: e.target.value }))} aria-label={`${k.name} model`} />
                      <datalist id={`${testid}-${k.id}-models`}>{list.map((m) => <option key={m} value={m} />)}</datalist>
                    </span>
                  )}
                  {k.id === 'ollama' && installed.length > 0 && <span className="muted small">Installed: {installed.join(', ')}</span>}
                  {k.note && <span className="engine__warn">{k.note}</span>}
                  {provider === k.id && warnings?.[k.id] && <span className="engine__warn" role="note">{warnings[k.id]}</span>}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        <button type="button" className="btn btn--dark" disabled={!dirty || !model || !!busy} onClick={() => void run('save')}>
          {busy === 'save' ? 'Saving…' : saveLabel ?? 'Save as default'}</button>
        {onTest && <button type="button" className="btn" disabled={!!busy || dirty} onClick={() => void run('test')}
                           title={dirty ? 'Save first' : undefined}>{busy === 'test' ? 'Asking…' : 'Test'}</button>}
        {dirty && current && <span className="muted small">Not saved yet: still using {current.model}.</span>}
      </div>
      {result && (
        <div role="status" className={result.ok ? 'saved' : 'form-error'} style={{ marginTop: 10 }}>
          {result.ok ? '✓ ' : ''}{result.message}
          {result.steps && <ul className="small" style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--adm-text-2)' }}>
            {result.steps.map((s) => <li key={s}>{s}</li>)}</ul>}
        </div>
      )}
    </section>
  );
}

/** Model & tools for one agent: its own model (if it has one). */
export function AgentModelPanel({ agentId, data, onSaved }: { agentId: string; data: ModelsOverview; onSaved: () => void }) {
  const a = data.agents.find((x) => x.id === agentId);
  if (!a) return null;
  return (
    <Picker testid="agent-model" title={`${a.name}'s model`} intro={`${a.uses}. Save makes it ${a.name}'s default; every
      call is logged in Agent logs with the model that answered, how long it took and what it cost.`}
      kinds={a.providers.map((p) => ({ id: p, name: data.providerNames[p], ready: data.providers[p]?.ready,
        note: data.providers[p]?.ready ? null : data.providers[p]?.error }))}
      current={a.current} suggestions={data.suggestions} installed={data.providers.ollama?.models ?? []} warnings={a.warnings}
      onSave={async (p, m) => { const r = await api.saveModel(a.id, p, m); onSaved();
        return { ok: true, message: `Saved. ${a.name} now uses ${r.label}.` }; }}
      onTest={async () => { const r = await api.testModel(a.id);
        return r.ok ? { ok: true, message: `${a.current.model} answered “${r.reply}” in ${r.ms} ms.` } : { ok: false, message: r.error ?? 'No answer' }; }} />
  );
}

/** Model & tools (All agents): Hermes' own model, and a list of every agent's model. */
export function HermesModelPanel({ data, onSaved }: { data: ModelsOverview; onSaved: () => void }) {
  const h = data.hermes;
  const kinds = Object.entries(h.kinds).map(([id, name]) => ({ id, name,
    ready: id === 'ollama' ? data.providers.ollama?.ready : undefined,
    note: id === 'ollama' ? 'Hermes needs a model that holds at least 64,000 tokens, e.g. gpt-oss:20b (qwen3:14b stops at 40,960). Pull it first: ollama pull gpt-oss:20b.'
      : id === 'openrouter' || id === 'anthropic' || id === 'bedrock' ? 'Uses the key in Hermes’ own ~/.hermes/.env.' : null }));
  const current = h.current?.model ? { provider: h.current.kind && h.kinds[h.current.kind] ? h.current.kind : 'openrouter', model: h.current.model } : null;
  return (
    <Picker testid="hermes-model-picker" title="Hermes' model" saveLabel="Save and restart Hermes"
      intro={`The model behind chat, Slack and every tool call. Hermes itself always runs on this machine; this is the
        model it thinks with. Saving changes ${h.file} (a backup is kept), restarts Hermes and asks it a test question;
        if it doesn't answer, the previous model is put back.`}
      kinds={kinds} current={current} suggestions={{ ...data.suggestions, ollama: ['gpt-oss:20b', 'qwen3-coder:30b', ...(data.suggestions.ollama ?? [])], anthropic: ['claude-sonnet-4-6', 'claude-haiku-4-5'],
        bedrock: ['eu.anthropic.claude-sonnet-4-5-20250929-v1:0'] }} installed={data.providers.ollama?.models ?? []}
      onSave={async (p, m) => { const r = await api.saveModel('hermes', p, m); onSaved();
        return { ok: !!r.ok, message: r.ok ? `Hermes now uses ${m}.` : `Not changed: ${r.error ?? 'Hermes didn’t answer'}.`, steps: r.steps }; }} />
  );
}

export function ModelsTable({ data }: { data: ModelsOverview }) {
  const rows: { name: string; label: string; to: string | null }[] = [
    { name: 'Hermes (chat, Slack, tool calls)', label: data.hermes.label ?? 'not found in Hermes’ config', to: null },
    ...data.agents.map((a: AgentModel) => ({ name: a.name, label: a.label, to: `/admin/model?agent=${a.id}` })),
  ];
  return (
    <section className="panel">
      <h2 className="panel__title">Models by agent</h2>
      <div className="tbl-wrap">
        <table className="tbl" data-testid="models-table">
          <thead><tr><th scope="col">Agent</th><th scope="col">Model</th><th scope="col" /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}><td>{r.name}</td><td className="mono">{r.label}</td>
                <td>{r.to && <Link to={r.to}>Change</Link>}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small" style={{ margin: '10px 0 0' }}>The coding agent's code engine is chosen on its own Model &amp; tools page.</p>
    </section>
  );
}
