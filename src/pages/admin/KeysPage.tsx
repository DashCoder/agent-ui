import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { OptionGroup, OptionItem, OptionsList } from '../../api/types';
import { PageHeader } from './PageHeader';

/**
 * /admin/keys: API keys and connections (OpenRouter, GitHub, Jira, Slack…), typed here and stored encrypted on this
 * server only. Secret values are never shown again. Saving restarts the agents for a few seconds.
 */
export function KeysPage() {
  const [list, setList] = useState<OptionsList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);

  const load = useCallback(async () => {
    try { setList(await api.options()); setError(null); } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  // after a save, agent-api restarts: wait until it answers again, then show the fresh state
  useEffect(() => {
    if (!restarting) return;
    let stop = false;
    const t = setInterval(async () => {
      try {
        const l = await api.options();
        if (!stop && !l.groups.some((g) => g.items.some((i) => i.pending))) { setList(l); setRestarting(false); }
      } catch { /* still restarting */ }
    }, 2000);
    return () => { stop = true; clearInterval(t); };
  }, [restarting]);

  const saved = (l: OptionsList) => { setList(l); if (l.restarting) setRestarting(true); };
  const done = list?.groups.flatMap((g) => g.items).filter((i) => i.set).length ?? 0;

  return (
    <>
      <PageHeader title="Settings & keys"
        subtitle="Connect your own accounts. Keys are stored encrypted on this server only and are never shown again." />
      {restarting && <p className="panel muted" role="status" data-testid="keys-restarting">Applying your changes: the agents restart for a few seconds…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {list && (
        <p className="muted small" data-testid="keys-summary">
          {done ? `${done} setting${done === 1 ? '' : 's'} in use.` : 'Nothing connected yet: everything works on the local models without keys.'}
          {' '}All of these are optional.
        </p>
      )}
      {list?.groups.map((g) => <Group key={g.id} group={g} onSaved={saved} busy={restarting} />)}
      <PasswordPanel />
    </>
  );
}

function Group({ group, onSaved, busy }: { group: OptionGroup; onSaved: (l: OptionsList) => void; busy: boolean }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(null);
  const changed = Object.keys(form).filter((k) => form[k] !== (group.items.find((i) => i.name === k)?.value ?? ''));
  const tests = [...new Set(group.items.map((i) => i.test).filter((t): t is string => !!t))];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    const values = Object.fromEntries(changed.map((k) => [k, form[k]]));
    try { onSaved(await api.saveOptions(values)); setForm({}); setMsg('Saved.'); } catch (x) { setErr((x as Error).message); }
  };
  const remove = async (i: OptionItem) => {
    setErr(null); setMsg(null);
    try { onSaved(await api.saveOptions({}, [i.name])); setMsg(`${i.label} removed.`); } catch (x) { setErr((x as Error).message); }
  };
  const runTest = async (t: string) => {
    setTest(null);
    try { setTest(await api.testOption(t, form)); } catch (x) { setTest({ ok: false, message: (x as Error).message }); }
  };

  return (
    <form className="panel form" onSubmit={(e) => void submit(e)} aria-labelledby={`grp-${group.id}`} data-testid={`keys-${group.id}`}>
      <fieldset>
        <legend id={`grp-${group.id}`}>{group.title}</legend>
        <div className="grid2">
          {group.items.map((i) => (
            <div key={i.name} className="field">
              <label htmlFor={`opt-${i.name}`}>{i.label}{' '}
                {i.set && <span className="status status--ok" title={i.source === 'server' ? 'Set on the server' : 'Set here'}>✓ set</span>}
              </label>
              <input id={`opt-${i.name}`} type={i.secret ? 'password' : 'text'} autoComplete="off" spellCheck={false}
                     value={form[i.name] ?? (i.secret ? '' : i.value ?? '')}
                     placeholder={i.secret && i.set ? '•••••••• (type to replace)' : i.placeholder}
                     onChange={(e) => setForm({ ...form, [i.name]: e.target.value })} aria-describedby={`h-${i.name}`} />
              <small id={`h-${i.name}`} className="muted" style={{ fontWeight: 400 }}>{i.help}
                {i.secret && i.source === 'admin' && <>{' '}<button type="button" className="linklike" onClick={() => void remove(i)}
                  aria-label={`Remove ${i.label}`}>Remove</button></>}
              </small>
            </div>
          ))}
        </div>
      </fieldset>
      <div className="form__footer">
        {err && <span className="form-error" role="alert">{err}</span>}
        {msg && <span className="muted" role="status">{msg}</span>}
        {test && <span className={test.ok ? 'muted' : 'form-error'} role="status" data-testid="keys-test">{test.ok ? '✓ ' : '✗ '}{test.message}</span>}
        {tests.map((t) => <button key={t} type="button" className="btn" onClick={() => void runTest(t)}>Test{tests.length > 1 ? ` ${t.split(':').pop()?.split('_')[0]?.toLowerCase()}` : ''}</button>)}
        <button type="submit" className="btn btn--dark" disabled={!changed.length || busy}>Save</button>
      </div>
    </form>
  );
}

function PasswordPanel() {
  const [f, setF] = useState({ current: '', next: '', again: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    if (f.next.length < 12) { setErr('Use at least 12 characters.'); return; }
    if (f.next !== f.again) { setErr("The new passwords don't match."); return; }
    try { await api.changePassword(f.current, f.next); setF({ current: '', next: '', again: '' }); setMsg('Password changed.'); }
    catch (x) { setErr((x as Error).message); }
  };
  return (
    <form className="panel form" onSubmit={(e) => void submit(e)} aria-labelledby="pw-title" data-testid="change-password">
      <fieldset>
        <legend id="pw-title">Admin password</legend>
        <div className="grid2">
          <label className="field"><span>Current password</span>
            <input type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></label>
          <span />
          <label className="field"><span>New password</span>
            <input type="password" autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></label>
          <label className="field"><span>New password again</span>
            <input type="password" autoComplete="new-password" value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} /></label>
        </div>
      </fieldset>
      <div className="form__footer">
        {err && <span className="form-error" role="alert">{err}</span>}
        {msg && <span className="muted" role="status">{msg}</span>}
        <button type="submit" className="btn btn--dark">Change password</button>
      </div>
    </form>
  );
}
