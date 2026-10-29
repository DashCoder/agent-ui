import { useEffect, useState, type FormEvent } from 'react';
import { FormFooter } from './AvatarSettings';
import { PageHeader } from './AdminLayout';
import { useSettings } from './useSettings';

export function Calendar() {
  const { settings, save, status, error } = useSettings();
  const [provider, setProvider] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (settings) { setProvider(settings.calendar.provider); setConnected(settings.calendar.connected); }
  }, [settings]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void save({ calendar: { provider, connected } });
  };

  return (
    <>
      <PageHeader title="Calendar" subtitle="Let customers book appointments through chat or phone." />
      <form className="panel form" onSubmit={submit}>
        <label className="field"><span>Booking provider</span>
          <select value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="">Not set</option>
            <option value="google">Google Calendar (via Hermes MCP / Activepieces)</option>
            <option value="builtin">Built-in scheduler</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={connected} onChange={(e) => setConnected(e.target.checked)} />
          Connection tested and working
        </label>
        <p className="muted small">Give the Hermes profile a calendar tool (MCP server or an Activepieces flow),
          then tick the box above once a test booking works.</p>
        <FormFooter status={status} error={error} />
      </form>
    </>
  );
}
