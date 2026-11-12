import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent, type RefObject } from 'react';
import { api } from '../api/client';
import type { SavedReply } from '../api/types';
import { useChat } from '../hooks/useChat';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useSpeech } from '../hooks/useSpeech';
import { ApprovalCard } from './ApprovalCard';
import { AvatarPanel } from './AvatarPanel';
import type { AudioSink } from './SimliStage';
import { Composer } from './Composer';
import { ChevronDownIcon, ChevronUpIcon, ExpandIcon, GripIcon, TrashIcon } from './Icons';
import { MessageBubble } from './MessageBubble';
import { SavedReplies } from './SavedReplies';
import { SaveWorkForm } from './SaveWorkForm';

const HEIGHT_KEY = 'agent-ui.chatHeight';
const MIN_H = 160;
const maxH = () => Math.round(window.innerHeight * 0.85);
const clampH = (h: number) => Math.max(MIN_H, Math.min(maxH(), Math.round(h)));
function readHeight(): number | null {
  try { const v = Number(localStorage.getItem(HEIGHT_KEY)); return v > 0 ? v : null; } catch { return null; }
}
function writeHeight(h: number | null) {
  try { h ? localStorage.setItem(HEIGHT_KEY, String(h)) : localStorage.removeItem(HEIGHT_KEY); } catch { /* private mode */ }
}

/** The conversation's height: drag the bar under it, use the arrow keys on it, or "Taller" for most of the screen.
 * Remembered in this browser. */
function useTranscriptHeight(ref: RefObject<HTMLDivElement>) {
  const [height, setHeightState] = useState<number | null>(() => readHeight());
  const setHeight = useCallback((h: number | null) => {
    const v = h === null ? null : clampH(h);
    setHeightState(v); writeHeight(v);
  }, []);
  const startDrag = (e: RPointerEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    e.preventDefault();
    const startY = e.clientY;
    const startH = el.getBoundingClientRect().height;
    const move = (ev: PointerEvent) => setHeight(startH + ev.clientY - startY);
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const onKey = (e: KeyboardEvent) => {
    const cur = height ?? ref.current?.getBoundingClientRect().height ?? 300;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHeight(cur + 40); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHeight(cur - 40); }
  };
  const tall = height !== null && height >= maxH() - 4;
  return { height, setHeight, startDrag, onKey, tall };
}

interface Props {
  /** Where saved replies render: beside the chat ("aside") or under it ("inline", used in admin). */
  savedPlacement?: 'aside' | 'inline';
}

/** The whole visitor experience: avatar, transcript, quick replies, learn toggle and composer. */
export function ChatExperience({ savedPlacement = 'aside' }: Props) {
  const { config, loaded } = useSiteConfig();
  const chat = useChat(loaded);
  const sinkRef = useRef<AudioSink | null>(null);
  const speech = useSpeech(config.avatar.voice, sinkRef);
  const onSink = useCallback((sink: AudioSink | null) => { sinkRef.current = sink; }, []);
  const [saved, setSaved] = useState<SavedReply[]>([]);
  const [learn, setLearn] = useState(config.assistant.learnByDefault);
  const [avatarOpen, setAvatarOpen] = useState(true);
  const [voiceOn, setVoiceOn] = useState(false);
  const [saveWorkOpen, setSaveWorkOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const size = useTranscriptHeight(scrollRef);
  const [confirmClear, setConfirmClear] = useState(false);
  const lastSpoken = useRef<string | null>(null);

  useEffect(() => setLearn(config.assistant.learnByDefault), [config.assistant.learnByDefault]);
  useEffect(() => {
    if (loaded) api.savedReplies().then((r) => setSaved(r.items)).catch(() => {});
  }, [loaded]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages, chat.draft, chat.progress, chat.approval]);

  // Speak each finished assistant reply when voice is on.
  const last = chat.messages[chat.messages.length - 1];
  useEffect(() => {
    if (!voiceOn || !last || last.role !== 'assistant' || last.id === lastSpoken.current) return;
    lastSpoken.current = last.id;
    if (chat.messages.length > 1) speech.speak(last.text);
  }, [last, voiceOn, speech, chat.messages.length]);

  const onPlayingChange = (on: boolean) => {
    setVoiceOn(on && (config.avatar.speakReplies || speech.supported));
    if (!on) speech.cancel();
    if (on && last) lastSpoken.current = last.id; // don't re-read the current message
  };

  const saveReply = useCallback(async (text: string) => {
    if (saved.some((s) => s.text === text)) return;
    try {
      const item = await api.saveReply(text);
      setSaved((s) => [item, ...s]);
    } catch (e) {
      setNotice((e as Error).message);
    }
  }, [saved]);

  const removeReply = async (id: string) => {
    setSaved((s) => s.filter((x) => x.id !== id));
    await api.deleteReply(id).catch(() => {});
  };

  const copyReply = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setNotice('Copied to clipboard'); } catch { /* ignore */ }
  };

  const send = (text: string, attachments: string[] = []) => {
    setNotice(null);
    void chat.send(text, { learn, attachments });
  };

  const clear = async () => {
    setConfirmClear(false);
    setNotice(null);
    chat.stop();
    await chat.reset();
  };

  const talking = chat.streaming || speech.speaking;
  const savedPanel = <SavedReplies items={saved} onRemove={removeReply} onUse={copyReply} />;

  return (
    <div className={`chat-layout chat-layout--${savedPlacement}`}>
      <div className="chat-main">
        {avatarOpen && (
          <AvatarPanel avatar={config.avatar} talking={talking} onPlayingChange={onPlayingChange} onSink={onSink} />
        )}

        <div className="transcript-card">
          <button type="button" className="transcript-card__toggle" onClick={() => setAvatarOpen((v) => !v)}
                  aria-label={avatarOpen ? 'Hide avatar' : 'Show avatar'} aria-expanded={avatarOpen}>
            {avatarOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </button>
          <div className="transcript-bar">
            {confirmClear ? (
              <>
                <span className="transcript-bar__confirm">Clear the whole conversation?</span>
                <button type="button" className="transcript-bar__btn transcript-bar__btn--danger" onClick={() => void clear()}>
                  Yes, clear</button>
                <button type="button" className="transcript-bar__btn" onClick={() => setConfirmClear(false)}>Cancel</button>
              </>
            ) : (
              <button type="button" className="transcript-bar__btn" onClick={() => setConfirmClear(true)}
                      disabled={chat.messages.length <= 1 && !chat.streaming}>
                <TrashIcon width={14} height={14} /> Clear chat</button>
            )}
            <span className="transcript-bar__spacer" />
            <button type="button" className="transcript-bar__btn" aria-pressed={size.tall}
                    onClick={() => size.setHeight(size.tall ? null : maxH())}>
              <ExpandIcon width={14} height={14} /> {size.tall ? 'Normal size' : 'Taller'}</button>
          </div>
          <div className={`transcript ${size.height ? 'transcript--sized' : ''}`} ref={scrollRef} aria-live="polite"
               style={size.height ? { height: size.height } : undefined} data-testid="transcript-box">
            {chat.messages.map((m, i) => (
              <MessageBubble key={m.id} role={m.role} text={m.text}
                             saved={saved.some((s) => s.text === m.text)}
                             onSave={() => void saveReply(m.text)}
                             onRemove={i === 0 && m.role === 'assistant' || chat.streaming ? undefined : () => void chat.remove(m.id)} />
            ))}
            {chat.streaming && (chat.draft ? (
              <MessageBubble role="assistant" text={chat.draft} pending />
            ) : (
              <div className="typing" data-testid="typing">
                <span className="typing__dots"><i /><i /><i /></span>
                {chat.progress ?? `${config.assistant.name} is thinking…`}
              </div>
            ))}
            {chat.streaming && chat.draft && chat.progress && <div className="typing">{chat.progress}</div>}
            {chat.approval && <ApprovalCard approval={chat.approval} onAnswer={(a) => void chat.answerApproval(a)} />}
            {chat.error && <p className="chat-error" role="alert">{chat.error}</p>}
          </div>
          <button type="button" className="transcript-resize" role="separator" aria-orientation="horizontal"
                  aria-valuemin={MIN_H} aria-valuemax={typeof window === 'undefined' ? 800 : maxH()}
                  aria-valuenow={Math.round(size.height ?? scrollRef.current?.getBoundingClientRect().height ?? 300)}
                  aria-label="Resize the conversation (drag, or use the up and down arrow keys)"
                  title="Drag to make the conversation taller or shorter; double-click to reset"
                  onPointerDown={size.startDrag} onKeyDown={size.onKey} onDoubleClick={() => size.setHeight(null)}>
            <GripIcon width={18} height={18} />
          </button>
        </div>

        {saveWorkOpen ? (
          <SaveWorkForm onCancel={() => setSaveWorkOpen(false)}
                        onDone={(email) => { setSaveWorkOpen(false); setNotice(`Saved — your work is linked to ${email}.`); }} />
        ) : (
          <div className="chips" role="group" aria-label="Suggestions">
            <button type="button" className="chip chip--save" onClick={() => setSaveWorkOpen(true)}>
              🔐 Save my work
            </button>
            {config.quickReplies.map((q) => (
              <button key={q} type="button" className="chip" onClick={() => send(q)} disabled={chat.streaming}>
                {q}
              </button>
            ))}
          </div>
        )}

        <label className="learn">
          <input type="checkbox" checked={learn} onChange={(e) => setLearn(e.target.checked)} />
          <span>Learn and improve</span>
          <span className="learn__hint">{learn ? '(on — remembers useful answers)' : '(off — faster replies)'}</span>
        </label>
        {notice && <p className="notice" role="status">{notice}</p>}

        <Composer assistantName={config.assistant.name} streaming={chat.streaming} onStop={chat.stop}
                  onSend={send} />

        {savedPlacement === 'inline' && savedPanel}
      </div>
      {savedPlacement === 'aside' && <aside className="chat-aside">{savedPanel}</aside>}
    </div>
  );
}
