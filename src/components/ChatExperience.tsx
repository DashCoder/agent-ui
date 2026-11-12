import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { ChatMessage, SavedReply } from '../api/types';
import { useChat } from '../hooks/useChat';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useSpeech } from '../hooks/useSpeech';
import { load, store } from '../lib/storage';
import { ApprovalCard } from './ApprovalCard';
import { AvatarPanel } from './AvatarPanel';
import type { AudioSink } from './SimliStage';
import { Composer, type Command } from './Composer';
import { SidebarIcon, TrashIcon } from './Icons';
import { MessageBubble } from './MessageBubble';
import { SavedReplies } from './SavedReplies';
import { SaveWorkForm } from './SaveWorkForm';

interface Props {
  /** "aside": the visitor page (full screen). "inline": a preview inside the admin ("Try it"). */
  savedPlacement?: 'aside' | 'inline';
  /** Talk to one installed agent (/?agent=kpi): its name, greeting and quick replies. */
  agent?: string;
}

const SIDE_KEY = 'agent-ui.sidebar';
const GROUP_S = 5 * 60;

/**
 * The visitor experience, laid out like Slack: the avatar in a dark sidebar on the left, a conversation with square
 * pictures and names on the right, quick replies as message buttons, and Slack's message box.
 */
export function ChatExperience({ savedPlacement = 'aside', agent }: Props) {
  const { config, loaded } = useSiteConfig();
  const one = agent ? config.plugins?.find((p) => p.name === agent) : undefined;
  const chat = useChat(loaded, one ? agent : undefined);
  const sinkRef = useRef<AudioSink | null>(null);
  const speech = useSpeech(config.avatar.voice, sinkRef);
  const onSink = useCallback((sink: AudioSink | null) => { sinkRef.current = sink; }, []);
  const [saved, setSaved] = useState<SavedReply[]>([]);
  const [learn, setLearn] = useState(config.assistant.learnByDefault);
  const [sideOpen, setSideOpen] = useState(() => load(SIDE_KEY, 'open') === 'open');
  const [voiceOn, setVoiceOn] = useState(false);
  const [saveWorkOpen, setSaveWorkOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  // saved replies: open in the sidebar on wide screens, folded away in the strip on phones
  const [savedOpen, setSavedOpen] = useState(() => typeof window === 'undefined' || !window.matchMedia?.('(max-width: 760px)').matches);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSpoken = useRef<string | null>(null);
  const name = one ? one.agentName ?? agent! : config.assistant.name;
  const quick = one?.quickReplies?.length ? one.quickReplies : config.quickReplies;
  const embedded = savedPlacement === 'inline';
  useEffect(() => { if (!embedded) document.title = name; }, [name, embedded]);

  useEffect(() => setLearn(config.assistant.learnByDefault), [config.assistant.learnByDefault]);
  useEffect(() => {
    if (loaded) api.savedReplies().then((r) => setSaved(r.items)).catch(() => {});
  }, [loaded]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages, chat.draft, chat.progress, chat.approval, saveWorkOpen, notice]);

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

  const toggleSide = () => setSideOpen((v) => { store(SIDE_KEY, v ? 'closed' : 'open'); return !v; });

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
  const copy = async (text: string) => {
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
  const lastAgent = [...chat.messages].reverse().find((m) => m.role === 'assistant');
  const status = chat.streaming ? 'Replying…' : speech.speaking ? 'Speaking…' : 'Online';
  const commands: Command[] = [
    ...quick.map((q) => ({ label: q, hint: 'Ask', run: () => send(q) })),
    { label: 'Save my work', hint: 'Link to your email', run: () => setSaveWorkOpen(true) },
    { label: 'Clear chat', hint: 'Start again', run: () => setConfirmClear(true) },
  ];
  const grouped = (m: ChatMessage, i: number) => {
    const prev = chat.messages[i - 1];
    return !!prev && prev.role === m.role && m.created_at - prev.created_at < GROUP_S;
  };

  const quickReplies = !chat.streaming && !chat.approval && (
    <div className="sl-actions" role="group" aria-label="Suggestions">
      <button type="button" className="sl-btn" onClick={() => setSaveWorkOpen(true)}>🔐 Save my work</button>
      {quick.map((q) => (
        <button key={q} type="button" className="sl-btn" onClick={() => send(q)}>{q}</button>
      ))}
    </div>
  );

  return (
    <div className={`sl-wrap ${embedded ? 'sl-wrap--embedded' : ''}`}>
      <div className={`sl ${sideOpen ? '' : 'sl--side-closed'}`}>
        {/* ------------------------------------------------ sidebar: the avatar */}
        <aside className="sl-side" aria-label={`${name}, your assistant`}>
          <div className="sl-side__top">
            <span className="sl-side__brand">{config.brand.name}</span>
            <button type="button" className="sl-side__toggle" onClick={toggleSide}
                    aria-label={sideOpen ? 'Hide avatar' : 'Show avatar'} aria-expanded={sideOpen} title={sideOpen ? 'Hide avatar' : 'Show avatar'}>
              <SidebarIcon width={18} height={18} />
            </button>
          </div>
          {sideOpen ? (
            <>
              <div className="sl-side__stage">
                <AvatarPanel avatar={config.avatar} talking={talking} onPlayingChange={onPlayingChange} onSink={onSink} />
              </div>
              <div className="sl-side__who">
                <span className="sl-side__name">{name}</span>
                <span className={`sl-side__status ${chat.streaming || speech.speaking ? 'is-busy' : ''}`}>
                  <span className="sl-dot" aria-hidden="true" />{status}</span>
                <span className="sl-side__hint">Press ▶ on the picture to hear {name}'s replies.</span>
              </div>
              <details className="sl-side__saved" open={savedOpen} onToggle={(e) => setSavedOpen((e.target as HTMLDetailsElement).open)}>
                <summary className="sl-side__heading">Saved replies{saved.length ? ` (${saved.length})` : ''}</summary>
                {saved.length ? <SavedReplies items={saved} onRemove={removeReply} onUse={copy} />
                  : <p className="sl-side__empty">Save a reply with the bookmark on any of {name}'s messages.</p>}
              </details>
            </>
          ) : (
            <button type="button" className="sl-side__mini" onClick={toggleSide} aria-label={`Show ${name}`}>
              <img src={config.avatar.posterUrl} alt="" />
              <span className={`sl-dot ${chat.streaming ? 'is-busy' : ''}`} aria-hidden="true" />
            </button>
          )}
        </aside>

        {/* ------------------------------------------------ the conversation */}
        <main className="sl-main">
          <header className="sl-head">
            <div className="sl-head__who">
              <img className="sl-head__pic" src={config.avatar.posterUrl} alt="" />
              <h1 className="sl-head__name">{name}</h1>
              <span className="smsg__app">APP</span>
            </div>
            <div className="sl-head__right">
              {confirmClear ? (
                <span className="sl-confirm" role="group" aria-label="Clear chat?">
                  <span>Clear the whole conversation?</span>
                  <button type="button" className="sl-btn sl-btn--danger sl-btn--sm" onClick={() => void clear()}>Yes, clear</button>
                  <button type="button" className="sl-btn sl-btn--sm" onClick={() => setConfirmClear(false)}>Cancel</button>
                </span>
              ) : (
                <button type="button" className="sl-head__btn" onClick={() => setConfirmClear(true)}
                        disabled={chat.messages.length <= 1 && !chat.streaming} title="Clear chat">
                  <TrashIcon width={16} height={16} /><span>Clear chat</span></button>
              )}
              {!embedded && <Link to="/admin" className="sl-head__admin">Admin →</Link>}
            </div>
          </header>
          <nav className="sl-tabs" aria-label="Views"><span className="sl-tab is-on" aria-current="page">Messages</span></nav>

          <div className="sl-list" ref={scrollRef} aria-live="polite" data-testid="transcript-box">
            <div className="sl-day"><span>Today</span></div>
            {chat.messages.map((m, i) => (
              <MessageBubble key={m.id} role={m.role} text={m.text} time={m.created_at} grouped={grouped(m, i)}
                             name={m.role === 'assistant' ? name : 'You'} picture={config.avatar.posterUrl}
                             saved={saved.some((s) => s.text === m.text)}
                             onSave={() => void saveReply(m.text)} onCopy={() => void copy(m.text)}
                             onRemove={i === 0 && m.role === 'assistant' || chat.streaming ? undefined : () => void chat.remove(m.id)}>
                {m === lastAgent && quickReplies}
              </MessageBubble>
            ))}
            {!lastAgent && quickReplies}
            {chat.streaming && chat.draft && (
              <MessageBubble role="assistant" text={chat.draft} name={name} picture={config.avatar.posterUrl}
                             grouped={last?.role === 'assistant'} pending />
            )}
            {chat.approval && <ApprovalCard approval={chat.approval} onAnswer={(a) => void chat.answerApproval(a)} />}
            {saveWorkOpen && (
              <div className="sl-ephemeral">
                <p className="sl-ephemeral__label">Only visible to you</p>
                <SaveWorkForm onCancel={() => setSaveWorkOpen(false)}
                              onDone={(email) => { setSaveWorkOpen(false); setNotice(`Saved — your work is linked to ${email}.`); }} />
              </div>
            )}
            {notice && <p className="sl-notice" role="status">{notice}</p>}
            {chat.error && <p className="chat-error" role="alert">{chat.error}</p>}
          </div>

          <div className="sl-typing" aria-live="polite">
            {chat.streaming && (
              <span data-testid="typing"><span className="typing__dots"><i /><i /><i /></span>
                {chat.progress ?? `${name} is typing…`}</span>
            )}
          </div>
          <Composer assistantName={name} streaming={chat.streaming} onStop={chat.stop} onSend={send}
                    commands={commands} learn={learn} onLearn={setLearn} />
        </main>
      </div>
    </div>
  );
}
