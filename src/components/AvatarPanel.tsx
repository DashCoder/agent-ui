import { useCallback, useEffect, useRef, useState } from 'react';
import type { AvatarConfig } from '../api/types';
import { load, store } from '../lib/storage';
import { ExpandIcon, PauseIcon, PlayIcon } from './Icons';
import { SimliStage, type AudioSink } from './SimliStage';

export type AvatarMode = 'video' | 'live';
const MODE_KEY = 'agent-ui.avatarMode';

interface Props {
  avatar: AvatarConfig;
  /** True while the assistant is replying or speaking — switches to talking clips. */
  talking: boolean;
  /** Called when the visitor turns voice + motion on/off with the play button. */
  onPlayingChange?: (playing: boolean) => void;
  /** Receives the live avatar's audio input while it is connected (null otherwise). */
  onSink?: (sink: AudioSink | null) => void;
  compact?: boolean;
}

/**
 * The assistant's face, shown in a circle on a soft gradient.
 *  - Video mode: idleVideos loop while listening, talkVideos while replying (poster image if none).
 *  - Live mode (optional): a Simli lip-synced avatar, when the admin has switched it on.
 * The visitor's choice is remembered in this browser.
 */
export function AvatarPanel({ avatar, talking, onPlayingChange, onSink, compact }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const idleRef = useRef<HTMLVideoElement>(null);
  const talkRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [idleIdx, setIdleIdx] = useState(0);
  const [talkIdx, setTalkIdx] = useState(0);
  const [mode, setMode] = useState<AvatarMode>(() => load<AvatarMode>(MODE_KEY, 'video'));
  const [notice, setNotice] = useState<string | null>(null);
  const canLive = !compact && !!avatar.simliAvailable;
  const live = canLive && mode === 'live';
  const hasVideo = avatar.idleVideos.length > 0;
  const hasTalk = avatar.talkVideos.length > 0;
  const showTalk = playing && talking && hasTalk;

  // Pick a fresh talking clip each time the assistant starts a reply.
  useEffect(() => {
    if (talking && avatar.talkVideos.length > 1) setTalkIdx((i) => (i + 1) % avatar.talkVideos.length);
  }, [talking, avatar.talkVideos.length]);

  useEffect(() => {
    for (const v of [idleRef.current, talkRef.current]) {
      if (!v) continue;
      if (playing) void v.play().catch(() => {});
      else v.pause();
    }
  }, [playing, idleIdx, talkIdx, showTalk, live]);

  const toggle = () => {
    const next = !playing;
    setPlaying(next);
    onPlayingChange?.(next);
  };

  const switchMode = () => {
    const next: AvatarMode = mode === 'live' ? 'video' : 'live';
    setMode(next);
    store(MODE_KEY, next);
    setNotice(null);
  };

  const handleSink = useCallback((sink: AudioSink | null) => onSink?.(sink), [onSink]);
  const handleLiveError = useCallback((message: string) => {
    setNotice(`Live avatar unavailable (${message}). Showing video instead.`);
    setMode('video');
  }, []);

  const fullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => {});
  };

  return (
    <div ref={wrapRef} className={`avatar ${compact ? 'avatar--compact' : ''} ${talking ? 'is-talking' : ''}`}
         data-testid="avatar">
      <div className="avatar__circle">
        {hasVideo ? (
          <>
            <video ref={idleRef} className="avatar__media" src={avatar.idleVideos[idleIdx]} poster={avatar.posterUrl}
                   muted playsInline loop={avatar.idleVideos.length === 1}
                   onEnded={() => setIdleIdx((i) => (i + 1) % avatar.idleVideos.length)} />
            {hasTalk && (
              <video ref={talkRef} className={`avatar__media avatar__talk ${showTalk ? 'is-visible' : ''}`}
                     src={avatar.talkVideos[talkIdx]} muted playsInline loop />
            )}
          </>
        ) : (
          <img className={`avatar__media ${playing ? 'avatar__breathe' : ''}`} src={avatar.posterUrl} alt="" />
        )}
        {live && <SimliStage active={playing} onSink={handleSink} onError={handleLiveError} />}
      </div>
      {canLive && (
        <button type="button" className={`avatar__mode ${live ? 'is-on' : ''}`} onClick={switchMode}
                aria-pressed={live} title="Switch between the recorded video and a live lip-synced avatar">
          <span className="avatar__mode-dot" aria-hidden="true" /> Live avatar
        </button>
      )}
      {notice && <span className="avatar__status avatar__status--warn" role="status">{notice}</span>}
      <button type="button" className="avatar__btn avatar__btn--play" onClick={toggle}
              aria-label={playing ? 'Pause avatar and voice' : 'Play avatar and voice'} aria-pressed={playing}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button type="button" className="avatar__btn avatar__btn--full" onClick={fullscreen} aria-label="Full screen">
        <ExpandIcon />
      </button>
    </div>
  );
}
