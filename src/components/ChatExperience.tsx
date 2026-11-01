import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { SavedReply } from '../api/types';
import { useChat } from '../hooks/useChat';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useSpeech } from '../hooks/useSpeech';
import { ApprovalCard } from './ApprovalCard';
import { AvatarPanel } from './AvatarPanel';
import type { AudioSink } from './SimliStage';
import { Composer } from './Composer';
import { ChevronDownIcon, ChevronUpIcon } from './Icons';
import { MessageBubble } from './MessageBubble';
import { SavedReplies } from './SavedReplies';
import { SaveWorkForm } from './SaveWorkForm';

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
          <div className="transcript" ref={scrollRef} aria-live="polite">
            {chat.messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} text={m.text}
                             saved={saved.some((s) => s.text === m.text)}
                             onSave={() => void saveReply(m.text)} />
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
