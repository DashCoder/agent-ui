import { useEffect, useState, type FormEvent } from 'react';
import { FormFooter } from './AvatarSettings';
import { PageHeader } from './AdminLayout';
import { useSettings } from './useSettings';

export function Phone() {
  const { settings, save, status, error } = useSettings();
  const [number, setNumber] = useState('');
  const [script, setScript] = useState('');

  useEffect(() => {
    if (settings) { setNumber(settings.phone.number); setScript(settings.phone.script); }
  }, [settings]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void save({ phone: { number, script } });
  };

  return (
    <>
      <PageHeader title="Phone" subtitle="Let your assistant answer calls." />
      <form className="panel form" onSubmit={submit}>
        <label className="field"><span>Phone number</span>
          <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="+44 20 1234 5678" />
        </label>
        <label className="field"><span>Call script / greeting</span>
          <textarea rows={6} value={script} onChange={(e) => setScript(e.target.value)}
                    placeholder="Thanks for calling! I'm the virtual assistant — how can I help?" />
        </label>
        <p className="muted small">The boilerplate stores these settings. Connect telephony (e.g. Twilio + Pipecat)
          in agent-api to route calls to Hermes.</p>
        <FormFooter status={status} error={error} />
      </form>
    </>
  );
}
