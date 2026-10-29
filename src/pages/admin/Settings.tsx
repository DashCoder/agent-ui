import { useEffect, useState, type FormEvent } from 'react';
import { FormFooter } from './AvatarSettings';
import { PageHeader } from './AdminLayout';
import { lines, useSettings } from './useSettings';

const EMPTY = {
  brandName: '', adminTitle: '', landingUrl: '/', name: '', greeting: '', quickReplies: '', learnByDefault: false,
  services: '', booking: '', rates: '', areas: '',
};

export function Settings() {
  const { settings, save, status, error } = useSettings();
  const [f, setF] = useState(EMPTY);
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (!settings) return;
    setF({
      brandName: settings.brand.name, adminTitle: settings.brand.adminTitle, landingUrl: settings.brand.landingUrl,
      name: settings.assistant.name, greeting: settings.assistant.greeting,
      quickReplies: settings.quickReplies.join('\n'), learnByDefault: settings.assistant.learnByDefault,
      ...settings.business,
    });
  }, [settings]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void save({
      brand: { name: f.brandName, adminTitle: f.adminTitle, landingUrl: f.landingUrl },
      assistant: { name: f.name, greeting: f.greeting, learnByDefault: f.learnByDefault },
      quickReplies: lines(f.quickReplies),
      business: { services: f.services, booking: f.booking, rates: f.rates, areas: f.areas },
    });
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Branding, assistant personality and quick replies." />
      <form className="panel form" onSubmit={submit}>
        <fieldset><legend>Branding</legend>
          <div className="grid2">
            <label className="field"><span>Brand name</span><input value={f.brandName} onChange={set('brandName')} /></label>
            <label className="field"><span>Admin title (top bar)</span><input value={f.adminTitle} onChange={set('adminTitle')} /></label>
          </div>
          <label className="field"><span>Landing page URL</span><input value={f.landingUrl} onChange={set('landingUrl')} /></label>
        </fieldset>
        <fieldset><legend>Assistant</legend>
          <label className="field"><span>Name</span><input value={f.name} onChange={set('name')} /></label>
          <label className="field"><span>Greeting</span><textarea rows={4} value={f.greeting} onChange={set('greeting')} /></label>
          <label className="field"><span>Quick replies — one per line</span>
            <textarea rows={4} value={f.quickReplies} onChange={set('quickReplies')} /></label>
          <label className="check">
            <input type="checkbox" checked={f.learnByDefault} onChange={(e) => setF({ ...f, learnByDefault: e.target.checked })} />
            "Learn and improve" on by default
          </label>
        </fieldset>
        <fieldset><legend>Business answers (used by the mock agent and as context)</legend>
          <div className="grid2">
            <label className="field"><span>Services</span><textarea rows={3} value={f.services} onChange={set('services')} /></label>
            <label className="field"><span>Booking</span><textarea rows={3} value={f.booking} onChange={set('booking')} /></label>
            <label className="field"><span>Rates</span><textarea rows={3} value={f.rates} onChange={set('rates')} /></label>
            <label className="field"><span>Areas</span><textarea rows={3} value={f.areas} onChange={set('areas')} /></label>
          </div>
        </fieldset>
        <FormFooter status={status} error={error} />
      </form>
    </>
  );
}
