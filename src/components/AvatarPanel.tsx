import { useEffect, useRef, useState } from 'react';
import type { AvatarConfig } from '../api/types';
import { ExpandIcon, PauseIcon, PlayIcon } from './Icons';

interface Props {
  avatar: AvatarConfig;
  /** True while the assistant is replying or speaking — switches to talking clips. */
  talking: boolean;
  /** Called when the visitor turns voice + motion on/off with the play button. */
  onPlayingChange?: (playing: boolean) => void;
  compact?: boolean;
}

/**
 * Video avatar with idle/talking loops (same idea as the offline "video loop" fallback):
 *  - idleVideos play while listening, talkVideos while the assistant replies
 *  - with no videos configured, the poster image is shown with a subtle breathing motion
 * Replace this component to use Simli, MuseTalk or another live avatar.
 */
export function AvatarPanel({ avatar, talking, onPlayingChange, compact }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const idleRef = useRef<HTMLVideoElement>(null);
  const talkRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [idleIdx, setIdleIdx] = useState(0);
  const [talkIdx, setTalkIdx] = useState(0);
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
  }, [playing, idleIdx, talkIdx, showTalk]);

  const toggle = () => {
    const next = !playing;
    setPlaying(next);
    onPlayingChange?.(next);
  };

  const fullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => {});
  };

  return (
    <div ref={wrapRef} className={`avatar ${compact ? 'avatar--compact' : ''} ${talking ? 'is-talking' : ''}`}
         data-testid="avatar">
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
