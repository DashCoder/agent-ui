import { useEffect, useState, type FormEvent } from 'react';
import type { AvatarConfig } from '../../api/types';
import { AvatarPanel } from '../../components/AvatarPanel';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { useSpeech } from '../../hooks/useSpeech';
import { PageHeader } from './AdminLayout';
import { ClipHelp, ClipUpload } from './AvatarClips';
import { lines, useSettings } from './useSettings';

/** Microsoft Edge neural voices (free). Any other "xx-XX-NameNeural" voice also works. */
export const VOICES: { id: string; label: string }[] = [
  { id: 'en-GB-RyanNeural', label: 'Ryan – British, male' },
  { id: 'en-GB-ThomasNeural', label: 'Thomas – British, male' },
  { id: 'en-GB-SoniaNeural', label: 'Sonia – British, female' },
  { id: 'en-GB-LibbyNeural', label: 'Libby – British, female' },
  { id: 'en-US-AndrewNeural', label: 'Andrew – American, male' },
  { id: 'en-US-AvaNeural', label: 'Ava – American, female' },
  { id: 'en-IE-ConnorNeural', label: 'Connor – Irish, male' },
  { id: 'sv-SE-MattiasNeural', label: 'Mattias – Swedish, male' },
  { id: 'sv-SE-SofieNeural', label: 'Sofie – Swedish, female' },
];

export function AvatarSettings() {
  const { settings, save, status, error } = useSettings();
  const [form, setForm] = useState({ posterUrl: '', idle: '', talk: '', speakReplies: false, voice: 'en-GB-RyanNeural',
    simliEnabled: false, simliFaceId: '', simliFormat: 'square' as NonNullable<AvatarConfig['simliFormat']>,
    simliFaces: {} as Record<string, string> });
  const { config } = useSiteConfig();
  const agents = (config.plugins ?? []).filter((p) => p.agentName);
  const speech = useSpeech(form.voice);
  const [previewTalking, setPreviewTalking] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const a = settings.avatar;
    setForm({ posterUrl: a.posterUrl, idle: a.idleVideos.join('\n'), talk: a.talkVideos.join('\n'),
              speakReplies: a.speakReplies, voice: a.voice || 'en-GB-RyanNeural',
              simliEnabled: !!a.simliEnabled, simliFaceId: a.simliFaceId ?? '', simliFormat: a.simliFormat ?? 'square',
              simliFaces: { ...(a.simliFaces ?? {}) } });
  }, [settings]);

  const preview: AvatarConfig = { posterUrl: form.posterUrl, idleVideos: lines(form.idle),
                                  talkVideos: lines(form.talk), speakReplies: form.speakReplies,
                                  voice: form.voice, simliEnabled: form.simliEnabled,
                                  simliFaceId: form.simliFaceId.trim(), simliFormat: form.simliFormat,
                                  simliFaces: Object.fromEntries(Object.entries(form.simliFaces).map(([k, v]) => [k, v.trim()])) };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void save({ avatar: preview });
  };

  return (
    <>
      <PageHeader title="Avatar" subtitle="The face visitors see. Use looping clips of a real presenter for a professional look." />
      <div className="two-col">
        <form className="panel form" onSubmit={submit}>
          <label className="field"><span>Poster image URL</span>
            <input value={form.posterUrl} onChange={(e) => setForm({ ...form, posterUrl: e.target.value })} />
          </label>
          <div className="clip-help-row"><span className="muted small">Clips are short looping videos of the face.</span>{' '}
            <ClipHelp /></div>
          <label className="field"><span>Idle (listening) clips — one URL per line</span>
            <textarea rows={3} value={form.idle} onChange={(e) => setForm({ ...form, idle: e.target.value })}
                      placeholder="/avatar/idle_1.mp4" />
          </label>
          <label className="field"><span>Talking clips — one URL per line</span>
            <textarea rows={3} value={form.talk} onChange={(e) => setForm({ ...form, talk: e.target.value })}
                      placeholder="/avatar/talk_1.mp4" />
          </label>
          <label className="check">
            <input type="checkbox" checked={form.speakReplies}
                   onChange={(e) => setForm({ ...form, speakReplies: e.target.checked })} />
            Read replies aloud when the visitor presses play
          </label>
          <label className="field"><span>Voice</span>
            <select value={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.value })}>
              {!VOICES.some((v) => v.id === form.voice) && <option value={form.voice}>{form.voice}</option>}
              {VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </label>
          <button type="button" className="btn" onClick={() => void speech.speak(
            `Hi, I'm ${settings?.assistant.name ?? 'your assistant'}. This is how I sound when I read replies aloud.`)}>
            {speech.speaking ? 'Playing…' : '▶ Test voice'}
          </button>
          <fieldset className="field">
            <span>Live avatar (Simli, optional)</span>
            <label className="check">
              <input type="checkbox" checked={form.simliEnabled}
                     onChange={(e) => setForm({ ...form, simliEnabled: e.target.checked })} />
              Let visitors switch on a live lip-synced avatar
            </label>
            <label className="field"><span>Simli face ID (the site's assistant)</span>
              <input value={form.simliFaceId} placeholder="e.g. a face ID from app.simli.com"
                     onChange={(e) => setForm({ ...form, simliFaceId: e.target.value })} />
            </label>
            {agents.map((p) => (
              <label key={p.name} className="field"><span>{p.agentName}'s own face ID (optional)</span>
                <input value={form.simliFaces[p.name] ?? ''} placeholder={`Empty: ${p.agentName} uses the face above`}
                       aria-label={`${p.agentName}'s Simli face ID`}
                       onChange={(e) => setForm({ ...form, simliFaces: { ...form.simliFaces, [p.name]: e.target.value } })} />
              </label>
            ))}
            <label className="field"><span>Shape of the live video (Trinity-2 faces)</span>
              <select value={form.simliFormat} aria-label="Shape of the live video"
                      onChange={(e) => setForm({ ...form, simliFormat: e.target.value as typeof form.simliFormat })}>
                <option value="square">Square, 768 × 768 (fits the round picture)</option>
                <option value="portrait">Portrait, 576 × 1024</option>
                <option value="landscape">Landscape, 1024 × 576</option>
              </select>
            </label>
            <span className="muted small">Also needs <code>SIMLI_API_KEY</code> in agent-api's <code>.env</code>.
              Sessions are capped per day (<code>SIMLI_DAILY_SESSIONS</code>) to control cost.</span>
          </fieldset>
          <p className="muted small">Uploaded clips are added to these lists and saved by themselves: you don't need to
            type anything. To stop using a clip, delete its line and press Save. You can also list any HTTPS video URL.</p>
          <FormFooter status={status} error={error} />
        </form>
        <div className="stack">
        <div className="panel">
          <h2 className="panel__title">Preview</h2>
          <AvatarPanel avatar={preview} talking={previewTalking} compact />
          <label className="check" style={{ marginTop: 12 }}>
            <input type="checkbox" checked={previewTalking} onChange={(e) => setPreviewTalking(e.target.checked)} />
            Preview talking state (press play first)
          </label>
        </div>
        <ClipUpload onAdded={(r) => setForm((f) => {
          const key = r.kind === 'idle' ? 'idle' : 'talk';
          const list = lines(f[key]);
          return { ...f, [key]: (list.includes(r.url) ? list : [...list, r.url]).join('\n'),
                   posterUrl: r.posterUrl ?? f.posterUrl };
        })} />
        </div>
      </div>
    </>
  );
}

export function FormFooter({ status, error, label = 'Save' }: { status: string | null; error: string | null; label?: string }) {
  return (
    <div className="form__footer">
      {error && <span className="form-error" role="alert">{error}</span>}
      {status && <span className="muted" role="status">{status}</span>}
      <button type="submit" className="btn btn--dark">{label}</button>
    </div>
  );
}
