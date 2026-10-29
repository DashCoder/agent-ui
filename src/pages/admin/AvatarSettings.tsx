import { useEffect, useState, type FormEvent } from 'react';
import type { AvatarConfig } from '../../api/types';
import { AvatarPanel } from '../../components/AvatarPanel';
import { PageHeader } from './AdminLayout';
import { lines, useSettings } from './useSettings';

export function AvatarSettings() {
  const { settings, save, status, error } = useSettings();
  const [form, setForm] = useState({ posterUrl: '', idle: '', talk: '', speakReplies: false });
  const [previewTalking, setPreviewTalking] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const a = settings.avatar;
    setForm({ posterUrl: a.posterUrl, idle: a.idleVideos.join('\n'), talk: a.talkVideos.join('\n'),
              speakReplies: a.speakReplies });
  }, [settings]);

  const preview: AvatarConfig = { posterUrl: form.posterUrl, idleVideos: lines(form.idle),
                                  talkVideos: lines(form.talk), speakReplies: form.speakReplies };

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
          <p className="muted small">Tip: put clips in <code>public/avatar/</code> or any HTTPS URL. Make them with
            <code> prepare_clips.py</code> so they loop seamlessly.</p>
          <FormFooter status={status} error={error} />
        </form>
        <div className="panel">
          <h2 className="panel__title">Preview</h2>
          <AvatarPanel avatar={preview} talking={previewTalking} compact />
          <label className="check" style={{ marginTop: 12 }}>
            <input type="checkbox" checked={previewTalking} onChange={(e) => setPreviewTalking(e.target.checked)} />
            Preview talking state (press play first)
          </label>
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
