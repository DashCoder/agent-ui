import { useEffect, useState, type FormEvent } from 'react';
import { FormFooter } from './AvatarSettings';
import { PageHeader } from './AdminLayout';
import { useSettings } from './useSettings';

const EMPTY = { consoleName: '', brandName: '', adminTitle: '', landingUrl: '/' };

/** /admin/settings — branding of this install. The assistant's own settings are on the Agent page. */
export function Settings() {
  const { settings, save, status, error } = useSettings();
  const [f, setF] = useState(EMPTY);
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (!settings) return;
    setF({ consoleName: settings.brand.consoleName ?? '', brandName: settings.brand.name,
           adminTitle: settings.brand.adminTitle, landingUrl: settings.brand.landingUrl });
  }, [settings]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void save({ brand: { consoleName: f.consoleName, name: f.brandName, adminTitle: f.adminTitle, landingUrl: f.landingUrl } });
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Branding for this install. The assistant's name, greeting and quick replies are on the Agent page." />
      <form className="panel form" onSubmit={submit}>
        <fieldset><legend>Branding</legend>
          <div className="grid2">
            <label className="field"><span>Product name (top bar)</span>
              <input value={f.consoleName} onChange={set('consoleName')} placeholder="InAgentic Command" /></label>
            <label className="field"><span>Host name (top bar)</span>
              <input value={f.adminTitle} onChange={set('adminTitle')} placeholder="ina-mini-01" /></label>
            <label className="field"><span>Brand name (chat page)</span><input value={f.brandName} onChange={set('brandName')} /></label>
            <label className="field"><span>Landing page URL ("View site")</span><input value={f.landingUrl} onChange={set('landingUrl')} /></label>
          </div>
        </fieldset>
        <FormFooter status={status} error={error} />
      </form>
    </>
  );
}
