import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { InstalledPlugin, PluginCheck, PluginJob, PluginList } from '../../api/types';
import { fmtTime } from './Dashboard';
import { PageHeader } from './PageHeader';

const ACTION: Record<PluginJob['action'], string> = { add: 'Install', enable: 'Turn on', disable: 'Turn off', remove: 'Remove' };
const active = (j?: PluginJob | null) => !!j && (j.status === 'queued' || j.status === 'running');

/** /admin/plugins — what is installed, and add your own extension from a git repo (installed by update.sh with a
 * backup first and an automatic rollback if the health check fails). */
export function PluginsPage() {
  const [list, setList] = useState<PluginList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<PluginJob | null>(null);
  const [prefill, setPrefill] = useState<{ url: string; ref: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const l = await api.plugins();
      setList(l);
      const running = l.jobs.find(active);
      if (running) setJob((j) => (j && j.id === running.id ? j : running));
    } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  // follow a job until it finishes, then refresh the list
  const jobId = job?.id;
  const jobActive = active(job);
  useEffect(() => {
    if (!jobId || !jobActive) return;
    const t = setInterval(async () => {
      try {
        const j = await api.pluginJob(jobId);
        setJob(j);
        if (!active(j)) void load();
      } catch { /* keep polling */ }
    }, 2000);
    return () => clearInterval(t);
  }, [jobId, jobActive, load]);

  const run = async (p: Promise<PluginJob>) => {
    setError(null);
    try { setJob(await p); } catch (e) { setError((e as Error).message); }
  };
  const busy = active(job);

  return (
    <>
      <PageHeader title="Plugins" subtitle="Agents and extensions on this machine. Add your own from a git repo, like ina-kpi-agent." />
      {error && <p className="form-error" role="alert">{error}</p>}
      {list && !list.installerReady && (
        <div className="panel panel--subtle" role="note">
          <strong>The installer isn't set up on this machine yet.</strong>
          <p className="muted small" style={{ margin: '6px 0 0' }}>Changes are queued but nothing installs them until an
            admin runs <code>allow-restart.sh</code> once and one normal <code>update.sh</code> has run.</p>
        </div>
      )}

      {job && <JobPanel job={job} onClose={active(job) ? undefined : () => setJob(null)} />}

      <section className="panel">
        <div className="panel__head"><h2 className="panel__title">Installed</h2></div>
        {!list && <p className="muted small">Loading…</p>}
        {list && !list.plugins.length && <p className="muted">No agents or plugins yet.</p>}
        <ul className="list" data-testid="plugins">
          {list?.plugins.map((p) => (
            <PluginRow key={p.key} p={p} busy={busy}
              onToggle={() => void run(api.togglePlugin(p.key, !p.enabled))}
              onRemove={() => void run(api.removePlugin(p.key))}
              onUpdate={() => setPrefill({ url: p.url, ref: p.ref || 'main' })} />
          ))}
        </ul>
      </section>

      <AddPlugin sources={list?.sources ?? []} busy={busy} prefill={prefill}
        onInstall={(checkId, settings) => run(api.installPlugin(checkId, settings))} />

      {list && list.jobs.length > 0 && (
        <section className="panel">
          <h2 className="panel__title">Recent changes</h2>
          <div className="tbl-wrap">
            <table className="tbl" style={{ minWidth: 560 }}>
              <thead><tr><th scope="col">Time</th><th scope="col">Change</th><th scope="col">By</th><th scope="col">Result</th></tr></thead>
              <tbody>
                {list.jobs.map((j) => (
                  <tr key={j.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtTime(j.createdAt)}</td>
                    <td>{ACTION[j.action]} {j.title ?? j.name}{j.commit ? <span className="mono muted"> @{j.commit.slice(0, 7)}</span> : null}</td>
                    <td>{j.by ?? 'admin'}</td>
                    <td><JobStatus j={j} /> <button type="button" className="link-btn" onClick={() => void api.pluginJob(j.id).then(setJob)}>Log</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function PluginRow({ p, busy, onToggle, onRemove, onUpdate }: { p: InstalledPlugin; busy: boolean; onToggle: () => void;
  onRemove: () => void; onUpdate: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const state = p.running ? <span className="status status--ok">Running</span>
    : p.enabled ? <span className="status status--warn">On, not loaded</span> : <span className="status status--muted">Off</span>;
  return (
    <li className="list__item" data-testid="plugin-row">
      <div style={{ minWidth: 0 }}>
        <span className="list__title">{p.title}</span> {state}{!p.builtin && <span className="status status--accent" style={{ marginLeft: 6 }}>From git</span>}
        <p className="list__sub">
          <span className="mono">{p.key}</span>
          {p.version && <> · v{p.version}</>}
          {p.commit && <> · <span className="mono">{p.commit.slice(0, 7)}</span></>}
          {p.url && <> · <a href={p.url} target="_blank" rel="noopener noreferrer">{p.url.replace(/^https:\/\//, '')}</a></>}
        </p>
      </div>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        {!p.builtin && p.url && <button type="button" className="btn" disabled={busy} onClick={onUpdate}>Update…</button>}
        <button type="button" className="btn" disabled={busy || (!p.installed && !p.builtin)} onClick={onToggle}>
          {p.enabled ? 'Turn off' : 'Turn on'}</button>
        {!p.builtin && (confirm
          ? <button type="button" className="btn btn--danger" disabled={busy} onClick={() => { setConfirm(false); onRemove(); }}>Confirm remove</button>
          : <button type="button" className="link-btn" disabled={busy} onClick={() => setConfirm(true)}>Remove</button>)}
      </div>
    </li>
  );
}

function AddPlugin({ sources, busy, prefill, onInstall }: { sources: string[]; busy: boolean;
  prefill: { url: string; ref: string } | null; onInstall: (checkId: string, settings: Record<string, string>) => Promise<void> }) {
  const [url, setUrl] = useState('');
  const [ref, setRef] = useState('main');
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<PluginCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [trusted, setTrusted] = useState(false);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!prefill) return;
    setUrl(prefill.url); setRef(prefill.ref); setCheck(null);
    panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [prefill]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setChecking(true); setError(null); setCheck(null); setTrusted(false); setValues({});
    try { setCheck(await api.checkPlugin(url.trim(), ref.trim() || 'main')); } catch (err) { setError((err as Error).message); }
    setChecking(false);
  };
  const missing = check?.settings.filter((s) => s.required && !values[s.name]?.trim()) ?? [];

  return (
    <section className="panel" ref={panel}>
      <h2 className="panel__title">Add a plugin from git</h2>
      <p className="page-head__sub" style={{ margin: '4px 0 16px' }}>
        Give the address of a repo built like ina-kpi-agent (a Python package in <code>api/</code>, optional pages in
        <code> ui/plugins/</code>, and an <code>inagentic-plugin.json</code>). We read it first and show you what it is
        before anything is installed.
      </p>
      <form className="row" onSubmit={submit} aria-label="Check a plugin repo">
        <input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Git repo URL"
               placeholder="https://github.com/DashCoder/my-agent" style={{ flex: '3 1 260px' }} />
        <input value={ref} onChange={(e) => setRef(e.target.value)} aria-label="Branch or tag" placeholder="main"
               style={{ flex: '1 1 100px' }} />
        <button type="submit" className="btn btn--dark" disabled={checking || !url.trim()}>{checking ? 'Checking…' : 'Check repo'}</button>
      </form>
      {sources.length > 0 && <p className="muted small" style={{ margin: '8px 0 0' }}>Allowed sources: {sources.join(', ')}</p>}
      {error && <p className="form-error" role="alert" style={{ marginTop: 12 }}>{error}</p>}

      {check && (
        <div className="panel panel--subtle" style={{ margin: '18px 0 0' }} data-testid="plugin-check">
          <div className="panel__head">
            <h3 className="panel__title" style={{ fontSize: 15 }}>{check.title} <span className="mono muted small">{check.name}</span></h3>
            {check.update && <span className="status status--accent">Update</span>}
          </div>
          {check.description && <p style={{ margin: '0 0 10px' }}>{check.description}</p>}
          <dl className="usage-grid" style={{ marginBottom: 12 }}>
            <div><dt>Version</dt><dd>{check.version ?? '—'}</dd></div>
            <div><dt>Commit</dt><dd className="mono">{check.commit.slice(0, 7)}</dd><dd>{check.ref}</dd></div>
            <div><dt>Last change</dt><dd style={{ fontSize: 14, fontFamily: 'inherit', fontWeight: 600 }}>{check.message}</dd><dd>{check.author} · {check.date}</dd></div>
            <div><dt>Adds</dt><dd style={{ fontSize: 14, fontFamily: 'inherit', fontWeight: 600 }}>{check.python ? 'API tools' : 'API'}{check.ui ? ' + admin pages' : ''}</dd></div>
          </dl>
          {check.warnings.map((w) => <p key={w} className="status status--warn" style={{ display: 'block', margin: '0 0 8px' }}>{w}</p>)}
          {check.settings.length > 0 && (
            <div style={{ display: 'grid', gap: 12, margin: '8px 0 12px' }}>
              {check.settings.map((s) => (
                <label key={s.name} className="field">{s.label ?? s.name}{s.required ? ' *' : ''}
                  <input type={s.secret ? 'password' : 'text'} autoComplete="off" value={values[s.name] ?? ''}
                         onChange={(e) => setValues((v) => ({ ...v, [s.name]: e.target.value }))} />
                  <span className="muted small" style={{ fontWeight: 400 }}>{s.help ?? s.name}{s.secret ? ' · saved only in agent-api’s .env on this machine' : ''}</span>
                </label>
              ))}
            </div>
          )}
          <label className="row" style={{ alignItems: 'flex-start', gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={trusted} onChange={(e) => setTrusted(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
            <span>I trust this code. A plugin runs inside agent-api with full access to its data, settings and tools.</span>
          </label>
          <div className="row" style={{ marginTop: 14 }}>
            <button type="button" className="btn btn--dark" disabled={busy || !trusted || missing.length > 0}
                    onClick={() => void onInstall(check.id, values).then(() => { setCheck(null); setUrl(''); setRef('main'); })}>
              {check.update ? 'Update' : 'Install'} {check.title} @{check.commit.slice(0, 7)}</button>
            <button type="button" className="btn btn--ghost" onClick={() => setCheck(null)}>Cancel</button>
          </div>
          <p className="muted small" style={{ margin: '10px 0 0' }}>Installs exactly this commit. A backup is taken first; if
            agent-api doesn't come back healthy, the backup is put back automatically. Takes a few minutes (the web app is rebuilt).</p>
        </div>
      )}
    </section>
  );
}

function JobStatus({ j }: { j: PluginJob }) {
  const cls = { queued: 'muted', running: 'accent', done: 'ok', failed: 'bad' }[j.status];
  const label = { queued: 'Waiting', running: 'Working…', done: 'Done', failed: 'Failed' }[j.status];
  return <span className={`status status--${cls}`}>{label}</span>;
}

function JobPanel({ job, onClose }: { job: PluginJob; onClose?: () => void }) {
  const pre = useRef<HTMLPreElement>(null);
  useEffect(() => { if (pre.current) pre.current.scrollTop = pre.current.scrollHeight; }, [job.log]);
  return (
    <section className="panel" aria-live="polite" data-testid="plugin-job">
      <div className="panel__head">
        <h2 className="panel__title">{ACTION[job.action]} {job.title ?? job.name} <JobStatus j={job} /></h2>
        {onClose && <button type="button" className="link-btn" onClick={onClose}>Close</button>}
      </div>
      {job.status === 'queued' && <p className="muted small" style={{ margin: 0 }}>Waiting for the installer…</p>}
      {job.status === 'failed' && <p className="form-error" style={{ margin: '0 0 8px' }}>It didn't work. Nothing was left half-installed: see the log below.</p>}
      {job.log && <pre ref={pre} className="mono" style={{ maxHeight: 280, overflow: 'auto', background: '#1F1F1F', color: '#EDEDED',
        padding: 14, borderRadius: 6, fontSize: 12, margin: 0, whiteSpace: 'pre-wrap' }}>{job.log}</pre>}
    </section>
  );
}
