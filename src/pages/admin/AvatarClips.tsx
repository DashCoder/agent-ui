import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { api } from '../../api/client';

/** A small "?" style button that opens a panel next to it; closes on Esc or a click outside. */
export function InfoPopover({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <span className="info-pop" ref={box}>
      <button type="button" className="info-pop__btn" aria-expanded={open} aria-haspopup="dialog"
              onClick={() => setOpen(!open)}>ⓘ {label}</button>
      {open && (
        <div className="info-pop__panel" role="dialog" aria-label={title}>
          <div className="info-pop__head">
            <strong>{title}</strong>
            <button type="button" className="info-pop__close" aria-label="Close" onClick={() => setOpen(false)}>×</button>
          </div>
          {children}
        </div>
      )}
    </span>
  );
}

const IDLE_PROMPT = `Animate this exact photo. Locked-off camera, no zoom, no pan, no cuts. Head and shoulders, face centred in the frame, with space above the head and on both sides. The person stays in the same position, framing, lighting and background throughout. They are listening attentively: natural blinking, slight breathing, a small occasional nod and a subtle friendly expression. Mouth closed, not speaking. The last frame returns to the exact pose of the first frame so the clip loops seamlessly. 8 seconds. No audio, no music, no text.`;

const TALK_PROMPT = `Animate this exact photo. Locked-off camera, no zoom, no pan, no cuts. Head and shoulders, face centred in the frame, with space above the head and on both sides. The person stays in the same position, framing, lighting and background throughout. They are talking to the viewer in a calm, friendly way: natural mouth movement as if speaking, occasional blinks, small head movements, no hand gestures. Start and end with the mouth closed in the exact pose of the first frame so the clip loops seamlessly. 8 seconds. No audio, no music, no subtitles.`;

function CopyPrompt({ name, text }: { name: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="info-pop__prompt">
      <div className="info-pop__prompt-head">
        <span>{name}</span>
        <button type="button" className="btn btn--soft btn--tiny" onClick={() => {
          void navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
        }}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <p>{text}</p>
    </div>
  );
}

/** How to make clips: with Gemini (Veo) from a photo, or by recording yourself. */
export function ClipHelp() {
  return (
    <InfoPopover label="How to make clips" title="Making avatar clips">
      <p>The avatar plays <b>idle</b> clips while it listens and <b>talking</b> clips while it replies. Make 2–3 of
        each, all with the same framing and light, so the switch between them can't be seen. Upload them with <b>Upload a clip</b>:
        the server makes each one loop smoothly, square, without sound.</p>
      <h4>With Gemini, from a photo</h4>
      <ol>
        <li>Start from a front-facing head-and-shoulders photo, plain background, mouth closed.</li>
        <li>In Gemini choose <b>Video</b> (Veo), 16:9, 720p, and add the photo.</li>
        <li>Paste a prompt below. Change one small thing per clip for variety (e.g. "a brief smile midway").</li>
        <li>Download the video and upload it with <b>Upload a clip</b>: it's added to the Idle or Talking list for you,
          nothing to type. Regenerate any clip whose face or light drifts from the photo.</li>
      </ol>
      <CopyPrompt name="Idle (listening)" text={IDLE_PROMPT} />
      <CopyPrompt name="Talking" text={TALK_PROMPT} />
      <h4>Recording yourself</h4>
      <ol>
        <li>Phone on a stand at eye level, landscape, face in the middle, light from the front.</li>
        <li>Idle: 10–15 s listening, nodding slightly. Talking: 10–15 s speaking naturally. Start and end in the same pose.</li>
        <li>Upload each recording. Sound is removed; the voice comes from the Voice setting.</li>
      </ol>
      <p className="muted small">Only use a face you have the right to use. Gemini won't animate public figures or children.</p>
    </InfoPopover>
  );
}

type Shape = 'square' | 'wide' | 'tall';

/** Upload a video; the server turns it into a seamless loop and adds it to the avatar. */
export function ClipUpload({ onAdded }: { onAdded: (r: { url: string; kind: 'idle' | 'talk'; posterUrl: string | null }) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<'idle' | 'talk'>('idle');
  const [shape, setShape] = useState<Shape>('square');
  const [skipStart, setSkipStart] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const busy = progress !== null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError(null); setStatus(null); setProgress(0);
    try {
      const r = await api.avatarClip(file, { kind, shape, skip: skipStart ? 0.5 : 0 }, setProgress);
      setStatus(`Added a ${r.seconds} s ${kind === 'idle' ? 'idle' : 'talking'} clip.`);
      onAdded(r);
      setFile(null);
      if (input.current) input.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setProgress(null);
    }
  };

  return (
    <form className="panel form clip-upload" onSubmit={submit} aria-label="Upload a clip">
      <h2 className="panel__title">Upload a clip</h2>
      <p className="muted small">A video from Gemini or your phone (up to 300 MB). It's made into a smooth loop and
        added to the lists on the left.</p>
      <label className="field"><span>Video file</span>
        <input ref={input} type="file" accept="video/*" disabled={busy}
               onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <fieldset className="field">
        <span>This clip is</span>
        <label className="check"><input type="radio" name="clip-kind" checked={kind === 'idle'} disabled={busy}
                                        onChange={() => setKind('idle')} /> Idle (listening)</label>
        <label className="check"><input type="radio" name="clip-kind" checked={kind === 'talk'} disabled={busy}
                                        onChange={() => setKind('talk')} /> Talking</label>
      </fieldset>
      <label className="field"><span>Shape</span>
        <select value={shape} disabled={busy} onChange={(e) => setShape(e.target.value as Shape)}>
          <option value="square">Square 720 × 720 (fits the round avatar)</option>
          <option value="wide">Wide 1280 × 720</option>
          <option value="tall">Tall 720 × 1280</option>
        </select>
      </label>
      <label className="check">
        <input type="checkbox" checked={skipStart} disabled={busy} onChange={(e) => setSkipStart(e.target.checked)} />
        Skip the first half-second (where Gemini videos often still settle)
      </label>
      <div className="form__footer">
        {error && <span className="form-error" role="alert">{error}</span>}
        {busy && <span className="muted" role="status">
          {progress! < 100 ? `Uploading ${progress}%…` : 'Making the loop… (up to a minute)'}</span>}
        {!busy && status && <span className="muted" role="status">{status}</span>}
        <button type="submit" className="btn btn--dark" disabled={!file || busy}>Upload</button>
      </div>
    </form>
  );
}
