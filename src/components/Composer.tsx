import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { api } from '../api/client';
import {
  AtIcon, BoldIcon, CloseIcon, CodeBlockIcon, CodeIcon, EmojiIcon, ItalicIcon, LinkIcon, MicIcon, OlIcon, PlusIcon,
  QuoteIcon, SendIcon, SlashIcon, StrikeIcon, TypeIcon, UlIcon,
} from './Icons';

export interface Command { label: string; hint?: string; run: () => void }

interface Props {
  assistantName: string;
  disabled?: boolean;
  streaming?: boolean;
  onSend: (text: string, attachmentIds: string[]) => void;
  onStop?: () => void;
  /** The "/" menu: quick replies and actions such as Clear chat. */
  commands?: Command[];
  learn: boolean;
  onLearn: (on: boolean) => void;
  /** Chat without Hermes: which model answers (shown when there's more than one). */
  models?: ('local' | 'openrouter')[];
  model?: 'local' | 'openrouter';
  onModel?: (m: 'local' | 'openrouter') => void;
}

const MODEL_INFO = {
  local: { label: 'Local', title: 'Private: answered on this server (slower)' },
  openrouter: { label: 'OpenRouter', title: 'Faster: answered by a cloud model via OpenRouter (the message leaves this server)' },
} as const;

interface Attachment { id: string; filename: string }

const EMOJI = ['👍', '🙏', '😊', '😂', '🎉', '✅', '👀', '🙌', '❤️', '🔥', '💡', '🤔', '👏', '🚀', '😅', '📌',
  '📅', '📞', '✉️', '💰', '📊', '⚠️', '❌', '⭐'];

type SpeechCtor = new () => {
  lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null;
};
const Speech: SpeechCtor | undefined = typeof window !== 'undefined'
  ? ((window as unknown as Record<string, SpeechCtor>).SpeechRecognition ?? (window as unknown as Record<string, SpeechCtor>).webkitSpeechRecognition)
  : undefined;

/** Slack-style message box: formatting toolbar, the text, then attach · Aa · emoji · @ · voice · / and Send. */
export function Composer({ assistantName, disabled, streaming, onSend, onStop, commands = [], learn, onLearn,
                          models = [], model, onModel }: Props) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Formatting bar: shown on wide screens, behind "Aa" on phones (like Slack's app)
  const [toolbar, setToolbar] = useState(() => typeof window === 'undefined' || !window.matchMedia?.('(max-width: 760px)').matches);
  const [menu, setMenu] = useState<'emoji' | 'slash' | null>(null);
  const [listening, setListening] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<InstanceType<SpeechCtor> | null>(null);

  // grow with the text, up to a limit
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [text]);

  const send = () => {
    if (!text.trim() || disabled || streaming) return;
    onSend(text, attachments.map((a) => a.id));
    setText('');
    setAttachments([]);
    setMenu(null);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
    if (e.key === 'Escape') setMenu(null);
  };

  /** Wrap the selection (or insert at the cursor) — Markdown, which replies already render. */
  const wrap = (before: string, after = before, placeholder = '') => {
    const el = boxRef.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const had = b > a;
    const picked = text.slice(a, b) || placeholder;
    const next = text.slice(0, a) + before + picked + after + text.slice(b);
    setText(next);
    // wrapped a selection: carry on typing after it; inserted a placeholder: select it to type over
    const end = a + before.length + picked.length + after.length;
    requestAnimationFrame(() => {
      el.focus();
      if (had) el.setSelectionRange(end, end); else el.setSelectionRange(a + before.length, a + before.length + picked.length);
    });
  };
  const prefixLines = (make: (i: number) => string) => {
    const el = boxRef.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const start = text.lastIndexOf('\n', a - 1) + 1;
    const block = text.slice(start, b) || '';
    const done = (block || '').split('\n').map((l, i) => make(i) + l).join('\n');
    setText(text.slice(0, start) + done + text.slice(b));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + done.length, start + done.length); });
  };
  const insert = (s: string) => {
    const el = boxRef.current;
    const at = el ? el.selectionEnd : text.length;
    setText(text.slice(0, at) + s + text.slice(at));
    setMenu(null);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + s.length, at + s.length); });
  };

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const f of Array.from(files)) {
        const res = await api.upload(f);
        setAttachments((x) => [...x, { id: res.id, filename: res.filename }]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const voice = () => {
    if (!Speech) return;
    if (listening) { recRef.current?.stop(); return; }
    const rec = new Speech();
    rec.lang = navigator.language || 'en-GB';
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const said = Array.from(e.results).map((r) => r[0]?.transcript ?? '').join(' ').trim();
      if (said) setText((t) => (t ? `${t} ${said}` : said));
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const tools: { label: string; icon: JSX.Element; run: () => void }[] = [
    { label: 'Bold', icon: <BoldIcon />, run: () => wrap('**', '**', 'bold') },
    { label: 'Italic', icon: <ItalicIcon />, run: () => wrap('_', '_', 'italic') },
    { label: 'Strikethrough', icon: <StrikeIcon />, run: () => wrap('~~', '~~', 'text') },
    { label: 'Link', icon: <LinkIcon />, run: () => wrap('[', '](https://)', 'link text') },
    { label: 'Numbered list', icon: <OlIcon />, run: () => prefixLines((i) => `${i + 1}. `) },
    { label: 'Bulleted list', icon: <UlIcon />, run: () => prefixLines(() => '- ') },
    { label: 'Quote', icon: <QuoteIcon />, run: () => prefixLines(() => '> ') },
    { label: 'Code', icon: <CodeIcon />, run: () => wrap('`', '`', 'code') },
    { label: 'Code block', icon: <CodeBlockIcon />, run: () => wrap('```\n', '\n```', 'code') },
  ];
  const filtered = text.startsWith('/')
    ? commands.filter((c) => c.label.toLowerCase().includes(text.slice(1).toLowerCase()))
    : commands;
  const showSlash = menu === 'slash' || (text.startsWith('/') && !text.includes(' ') && filtered.length > 0);

  return (
    <div className="sl-composer" data-testid="composer">
      {showSlash && (
        <ul className="sl-menu" role="menu" aria-label="Shortcuts">
          {filtered.map((c) => (
            <li key={c.label}><button type="button" role="menuitem" onClick={() => { setText(''); setMenu(null); c.run(); }}>
              <span>{c.label}</span>{c.hint && <span className="sl-menu__hint">{c.hint}</span>}</button></li>
          ))}
          {!filtered.length && <li className="sl-menu__empty">No shortcuts match</li>}
        </ul>
      )}
      {menu === 'emoji' && (
        <div className="sl-emoji" role="menu" aria-label="Emoji">
          {EMOJI.map((e) => <button key={e} type="button" role="menuitem" aria-label={`Insert ${e}`} onClick={() => insert(e)}>{e}</button>)}
        </div>
      )}
      <div className={`sl-composer__box ${disabled ? 'is-disabled' : ''}`}>
        {toolbar && (
          <div className="sl-composer__tools" role="toolbar" aria-label="Formatting">
            {tools.map((t, i) => (
              <span key={t.label} style={{ display: 'contents' }}>
                {(i === 4 || i === 6) && <span className="sl-sep" aria-hidden="true" />}
                <button type="button" className="sl-icon" onClick={t.run} aria-label={t.label} title={t.label}>{t.icon}</button>
              </span>
            ))}
          </div>
        )}
        {(attachments.length > 0 || error || uploading) && (
          <div className="sl-composer__files">
            {attachments.map((a) => (
              <span key={a.id} className="sl-file">
                <span className="sl-file__icon" aria-hidden="true">{a.filename.split('.').pop()?.slice(0, 4).toUpperCase()}</span>
                <span className="sl-file__name">{a.filename}</span>
                <button type="button" aria-label={`Remove ${a.filename}`}
                        onClick={() => setAttachments((x) => x.filter((y) => y.id !== a.id))}><CloseIcon width={12} height={12} /></button>
              </span>
            ))}
            {uploading && <span className="sl-file sl-file--busy">Uploading…</span>}
            {error && <span className="sl-composer__error" role="alert">{error}</span>}
          </div>
        )}
        <textarea ref={boxRef} className="sl-composer__input" rows={1} value={text} onKeyDown={onKey}
                  onChange={(e) => setText(e.target.value)} placeholder={`Message ${assistantName}`}
                  aria-label={`Message ${assistantName}`} />
        <div className="sl-composer__foot">
          <input ref={fileRef} type="file" hidden multiple onChange={(e) => void pick(e.target.files)} data-testid="file-input" />
          <button type="button" className="sl-icon sl-icon--round" onClick={() => fileRef.current?.click()}
                  aria-label="Attach a file" title="Attach a file" disabled={uploading}><PlusIcon /></button>
          <button type="button" className={`sl-icon ${toolbar ? 'is-on' : ''}`} onClick={() => setToolbar((v) => !v)}
                  aria-label={toolbar ? 'Hide formatting' : 'Show formatting'} aria-pressed={toolbar} title="Formatting"><TypeIcon /></button>
          <button type="button" className={`sl-icon ${menu === 'emoji' ? 'is-on' : ''}`} aria-label="Emoji" title="Emoji"
                  aria-expanded={menu === 'emoji'} onClick={() => setMenu(menu === 'emoji' ? null : 'emoji')}><EmojiIcon /></button>
          <button type="button" className="sl-icon" aria-label={`Mention ${assistantName}`} title="Mention"
                  onClick={() => insert(`@${assistantName} `)}><AtIcon /></button>
          <span className="sl-sep" aria-hidden="true" />
          <button type="button" className={`sl-icon ${listening ? 'is-live' : ''}`} onClick={voice} disabled={!Speech}
                  aria-label={listening ? 'Stop dictation' : 'Dictate'} aria-pressed={listening}
                  title={Speech ? 'Speak your message' : 'Dictation isn’t available in this browser'}><MicIcon /></button>
          <span className="sl-sep" aria-hidden="true" />
          <button type="button" className={`sl-icon ${showSlash ? 'is-on' : ''}`} aria-label="Shortcuts" title="Shortcuts"
                  aria-expanded={showSlash} onClick={() => setMenu(showSlash ? null : 'slash')}><SlashIcon /></button>
          <span className="sl-composer__spacer" />
          {models.length > 1 && onModel && (
            <div className="sl-model" role="radiogroup" aria-label="Model">
              {models.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={model === m} title={MODEL_INFO[m].title}
                        className={model === m ? 'is-on' : ''} onClick={() => onModel(m)}>{MODEL_INFO[m].label}</button>
              ))}
            </div>
          )}
          <label className="sl-learn" title={learn ? 'On: remembers useful answers' : 'Off: faster replies'}>
            <input type="checkbox" checked={learn} onChange={(e) => onLearn(e.target.checked)} aria-label="Learn and improve" />
            <span className="sl-learn__track" aria-hidden="true" /><span>Learn</span>
          </label>
          {streaming && onStop ? (
            <button type="button" className="sl-send sl-send--stop" onClick={onStop} aria-label="Stop">■</button>
          ) : (
            <button type="button" className="sl-send" onClick={send} disabled={!text.trim() || disabled}
                    aria-label="Send" title="Send (Enter)"><SendIcon /></button>
          )}
        </div>
      </div>
      <p className="sl-composer__tip"><b>Enter</b> to send · <b>Shift + Enter</b> for a new line · <b>/</b> for shortcuts</p>
    </div>
  );
}
