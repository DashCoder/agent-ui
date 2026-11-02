import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { HermesInfo } from '../../api/types';
import { PageHeader } from './AdminLayout';

const GUIDE_URL = 'https://github.com/DashCoder/agent-ui/blob/main/docs/HERMES_MAC_MINI_SETUP.md';

export function Hermes() {
  const [info, setInfo] = useState<HermesInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try { setInfo(await api.hermes()); } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const s = info?.status;
  return (
    <>
      <PageHeader title="Hermes Agent" subtitle="Connection to the agent runtime on this machine."
        actions={<>
          <button type="button" className="btn btn--soft" onClick={() => void load()}>↻ Check again</button>
          {info?.dashboardUrl && (
            <a className="btn btn--dark" href={info.dashboardUrl} target="_blank" rel="noreferrer">Open full Hermes dashboard ↗</a>
          )}
        </>} />
      {error && <p className="form-error" role="alert">{error}</p>}

      {s && (
        <div className="stats">
          <div className="stat"><span className="stat__label">Mode</span>
            <span className="stat__value stat__value--sm">{info!.mode === 'mock' ? 'Mock agent (no Hermes)' : 'Hermes'}</span></div>
          <div className="stat"><span className="stat__label">Reachable</span>
            <span className="stat__value stat__value--sm"><span className={`dot ${s.reachable ? 'dot--ok' : 'dot--bad'}`} />
              {s.reachable ? 'Yes' : `No${s.error ? ` (${s.error})` : ''}`}</span></div>
          <div className="stat"><span className="stat__label">API key</span>
            <span className="stat__value stat__value--sm">{s.authorized === false ? 'Rejected' : 'OK'}</span></div>
          <div className="stat"><span className="stat__label">Model</span>
            <span className="stat__value stat__value--sm">{s.models?.join(', ') || '—'}</span></div>
        </div>
      )}

      <section className="panel">
        <h2 className="panel__title">Skills</h2>
        <ul className="list">
          {(info?.skills ?? []).map((k) => (
            <li key={k.name} className="list__item"><strong>{k.name}</strong><span className="list__text muted">{k.description}</span></li>
          ))}
          {info && !info.skills.length && <li className="muted">No skills reported.</li>}
        </ul>
      </section>

      <section className="panel">
        <h2 className="panel__title">Connect Hermes in 5 steps</h2>
        <ol className="howto">
          <li>Install Hermes as the <code>aiagents</code> user:
            <pre>curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash{'\n'}hermes setup</pre></li>
          <li>Enable the API server in <code>~/.hermes/.env</code>:
            <pre>API_SERVER_ENABLED=true{'\n'}API_SERVER_HOST=127.0.0.1{'\n'}API_SERVER_PORT=8642{'\n'}API_SERVER_KEY=&lt;long random secret&gt;</pre></li>
          <li>Start it: <code>hermes gateway</code> (or the launchd service from agent-api/deploy).</li>
          <li>In agent-api's <code>.env</code>: <code>HERMES_MODE=hermes</code> and <code>HERMES_API_KEY</code> = the same secret. Restart agent-api.</li>
          <li>Press <em>Check again</em> — “Reachable: Yes” means the chat now talks to Hermes.</li>
        </ol>
        <p className="muted small">Full guide for a Mac mini (accounts, FileVault, Tailscale, services, backups):{' '}
          <a href={GUIDE_URL} target="_blank" rel="noreferrer">docs/HERMES_MAC_MINI_SETUP.md</a></p>
      </section>
    </>
  );
}
