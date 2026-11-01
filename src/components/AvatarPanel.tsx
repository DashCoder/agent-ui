import { useCallback, useEffect, useRef, useState } from 'react';
import type { AvatarConfig } from '../api/types';
import { load, store } from '../lib/storage';
import { ExpandIcon, PauseIcon, PlayIcon } from './Icons';
import { SimliStage, type AudioSink } from './SimliStage';

export type AvatarMode = 'video' | 'live';

/**
 * Every clip gets its own preloaded <video>; switching clips only crossfades opacity, so there is never a
 * blank frame while a new file loads (which is what made the avatar flicker).
 */
function ClipStack({ clips, active, playing, visible, onEnded, className = '', poster }: {
  clips: string[]; active: number; playing: boolean; visible: boolean; onEnded?: () => void;
  className?: string; poster?: string;
}) {
  const refs = useRef<(HTMLVideoElement | null)[]>([]);
  useEffect(() => {
    refs.current.forEach((v, i) => {
      if (!v) return;
      if (playing && i === active) {
        if (onEnded && v.ended) v.currentTime = 0;
        void v.play().catch(() => {});
      } else if (i !== active || !playing) {
        v.pause();
      }
    });
  }, [active, playing, onEnded, clips.length]);
  return (
    <>
      {clips.map((src, i) => (
        <video key={src + i} ref={(el) => { refs.current[i] = el; }} src={src} poster={i === 0 ? poster : undefined}
               className={`avatar__media avatar__clip ${className} ${visible && i === active ? 'is-visible' : ''}`}
               muted playsInline preload="auto" loop={!onEnded || clips.length === 1}
               onEnded={onEnded} />
      ))}
    </>
  );
}

/** True as soon as `on` is true; stays true until `on` has been false for `ms` (bridges reply → speech gaps). */
function useSticky(on: boolean, ms: number) {
  const [value, setValue] = useState(on);
  useEffect(() => {
    if (on) { setValue(true); return; }
    const t = setTimeout(() => setValue(false), ms);
    return () => clearTimeout(t);
  }, [on, ms]);
  return value;
}
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
  const [playing, setPlaying] = useState(false);
  const [idleIdx, setIdleIdx] = useState(0);
  const [talkIdx, setTalkIdx] = useState(0);
  const [mode, setMode] = useState<AvatarMode>(() => load<AvatarMode>(MODE_KEY, 'video'));
  const [notice, setNotice] = useState<string | null>(null);
  const canLive = !compact && !!avatar.simliAvailable;
  const live = canLive && mode === 'live';
  const hasVideo = avatar.idleVideos.length > 0;
  const hasTalk = avatar.talkVideos.length > 0;
  const talkingSticky = useSticky(talking, 900);
  const showTalk = playing && talkingSticky && hasTalk;

  // Move to a different talking clip after each reply, while it is hidden, so the next one starts cleanly.
  useEffect(() => {
    if (!showTalk && avatar.talkVideos.length > 1) {
      const t = setTimeout(() => setTalkIdx((i) => (i + 1) % avatar.talkVideos.length), 400);
      return () => clearTimeout(t);
    }
  }, [showTalk, avatar.talkVideos.length]);

  const nextIdle = useCallback(
    () => setIdleIdx((i) => (i + 1) % Math.max(1, avatar.idleVideos.length)), [avatar.idleVideos.length]);

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
    <div ref={wrapRef} className={`avatar ${compact ? 'avatar--compact' : ''} ${talkingSticky ? 'is-talking' : ''}`}
         data-testid="avatar">
      <div className="avatar__circle">
        {hasVideo ? (
          <>
            <ClipStack clips={avatar.idleVideos} active={idleIdx} playing={playing} visible poster={avatar.posterUrl}
                       onEnded={avatar.idleVideos.length > 1 ? nextIdle : undefined} />
            {hasTalk && (
              <ClipStack clips={avatar.talkVideos} active={talkIdx} playing={playing && showTalk} visible={showTalk}
                         className="avatar__talk" />
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
