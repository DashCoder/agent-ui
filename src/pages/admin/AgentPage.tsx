import { useEffect, useState, type FormEvent } from 'react';
import { ChatExperience } from '../../components/ChatExperience';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { useAgent } from './agents';
import { PageHeader } from './PageHeader';
import { useSettings } from './useSettings';

const EMPTY = { name: '', greeting: '', learnByDefault: false, services: '', booking: '', rates: '', areas: '' };

/** /admin/agent — the chat assistant: quick-reply pills, its personality, and a live preview (DogRun "Agent"). */
export function AgentPage() {
  const { settings, save, status, error } = useSettings();
  const { config } = useSiteConfig();
  const { agents } = useAgent();
  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? id;
  const suggestions = (config.plugins ?? []).flatMap((p) => (p.quickReplies ?? []).map((q) => ({ q, from: agentName(p.name) })));
  const [f, setF] = useState(EMPTY);
  const [pills, setPills] = useState<string[]>([]);
  const [pill, setPill] = useState('');
  const [pillStatus, setPillStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    setF({ name: settings.assistant.name, greeting: settings.assistant.greeting,
           learnByDefault: settings.assistant.learnByDefault, ...settings.business });
    setPills(settings.quickReplies);
  }, [settings]);

  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const savePills = async (next: string[]) => {
    setPills(next);
    setPillStatus('Saving…');
    await save({ quickReplies: next });
    setPillStatus('✓ Saved');
    setTimeout(() => setPillStatus(null), 2000);
  };
  const addPill = (e: FormEvent) => {
    e.preventDefault();
    const p = pill.trim();
    if (!p || pills.includes(p)) return;
    setPill('');
    void savePills([...pills, p]);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void save({
      assistant: { name: f.name, greeting: f.greeting, learnByDefault: f.learnByDefault },
      business: { services: f.services, booking: f.booking, rates: f.rates, areas: f.areas },
    });
  };
  const name = f.name || 'Your assistant';

  return (
    <>
      <PageHeader title="Agent" subtitle="How your chat assistant talks to visitors: its quick replies, personality and answers." />

      <section className="panel" aria-labelledby="pills">
        <h2 id="pills" className="panel__title">Quick replies</h2>
        <p className="page-head__sub" style={{ marginTop: -8, marginBottom: 16 }}>
          The buttons under the chat that visitors tap instead of typing, in this order. Tapping one sends its text
          as a question.</p>
        <div className="chips" data-testid="pills">
          {pills.map((p) => (
            <span key={p} className="chip">{p}
              <button type="button" aria-label={`Remove ${p}`} onClick={() => void savePills(pills.filter((x) => x !== p))}>×</button>
            </span>
          ))}
          {!pills.length && <span className="muted small">No quick replies yet.</span>}
        </div>
        {suggestions.some((x) => !pills.includes(x.q)) && (
          <div style={{ marginTop: 16 }} data-testid="pill-suggestions">
            <p className="small" style={{ margin: '0 0 8px', fontWeight: 600 }}>Suggested by your agents</p>
            <div className="chips">
              {suggestions.filter((x) => !pills.includes(x.q)).map((x) => (
                <button key={x.q} type="button" className="chip chip--suggest" title={`From ${x.from}`}
                        onClick={() => void savePills([...pills, x.q])}>+ {x.q}</button>
              ))}
            </div>
            <button type="button" className="link-btn" style={{ marginTop: 8 }}
                    onClick={() => void savePills([...new Set(suggestions.map((x) => x.q))])}>
              Replace all quick replies with these suggestions</button>
          </div>
        )}
        <form className="row" style={{ marginTop: 16 }} onSubmit={addPill}>
          <input value={pill} onChange={(e) => setPill(e.target.value)} placeholder="e.g. What are your opening hours?"
                 aria-label="New quick reply" maxLength={80} />
          <button type="submit" className="btn btn--dark" disabled={!pill.trim()}>Add</button>
          {pillStatus && <span className={pillStatus.startsWith('✓') ? 'saved' : 'muted'} role="status">{pillStatus}</span>}
        </form>
      </section>

      <form className="panel form" onSubmit={submit} aria-labelledby="personality">
        <div>
          <h2 id="personality" className="panel__title" style={{ marginBottom: 6 }}>{name}&apos;s personality</h2>
          <p className="page-head__sub" style={{ margin: 0 }}>Its name, greeting, and the answers it gives. {name} uses
            these answers, in its own words, whenever someone asks about them, whether by typing or by tapping a quick
            reply. To change the buttons themselves, edit Quick replies above.</p>
        </div>
        <div className="grid2">
          <label className="field"><span>Name</span><input value={f.name} onChange={set('name')} /></label>
          <label className="check" style={{ alignSelf: 'end', paddingBottom: 6 }}>
            <input type="checkbox" checked={f.learnByDefault} onChange={(e) => setF({ ...f, learnByDefault: e.target.checked })} />
            "Learn and improve" on by default
          </label>
        </div>
        <label className="field"><span>Greeting</span><textarea rows={4} className="mono" value={f.greeting} onChange={set('greeting')} /></label>
        <h3 className="small" style={{ margin: '4px 0 -4px', fontWeight: 700 }}>Answers to common questions</h3>
        <div className="grid2">
          <label className="field"><span>Services: "What do you offer?" / "What can you do?"</span><textarea rows={3} value={f.services} onChange={set('services')} /></label>
          <label className="field"><span>Booking: "How do I book?"</span><textarea rows={3} value={f.booking} onChange={set('booking')} /></label>
          <label className="field"><span>Rates: "What does it cost?"</span><textarea rows={3} value={f.rates} onChange={set('rates')} /></label>
          <label className="field"><span>Areas: "Where do you work?"</span><textarea rows={3} value={f.areas} onChange={set('areas')} /></label>
        </div>
        <div className="row">
          <button type="submit" className="btn btn--dark">Save changes</button>
          {status && <span className={status === 'Saved' ? 'saved' : 'muted'} role="status">{status === 'Saved' ? '✓ Saved' : status}</span>}
          {error && <span className="form-error" role="alert">{error}</span>}
        </div>
      </form>

      <section className="panel" aria-labelledby="try">
        <h2 id="try" className="panel__title">Try it</h2>
        <p className="page-head__sub" style={{ marginTop: -8, marginBottom: 16 }}>Talk to {name} exactly as visitors will see it.</p>
        <div className="builder-frame"><ChatExperience savedPlacement="inline" /></div>
      </section>
    </>
  );
}
