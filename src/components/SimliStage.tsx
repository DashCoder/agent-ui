import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

/** Where speech audio goes when the live avatar is on (PCM16, 16 kHz, mono). */
export interface AudioSink {
  send(pcm: Uint8Array): void;
  clear(): void;
}

interface Props {
  /** Start a session while true; stop it when false or unmounted. */
  active: boolean;
  onSink: (sink: AudioSink | null) => void;
  onError: (message: string) => void;
}

/**
 * Live lip-synced avatar from Simli. The server hands out a short-lived session token (the API key stays
 * on the server); the browser streams the reply audio and Simli streams back the talking face.
 */
export function SimliStage({ active, onSink, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let client: { stop(): Promise<void>; sendAudioData(d: Uint8Array): void; ClearBuffer(): void } | null = null;
    (async () => {
      try {
        const [{ SimliClient, LogLevel }, { sessionToken }] = await Promise.all([
          import('simli-client'), api.simliToken()]);
        if (cancelled || !videoRef.current || !audioRef.current) return;
        const c = new SimliClient(sessionToken, videoRef.current, audioRef.current, null, LogLevel.ERROR, 'livekit');
        client = c;
        c.on('stop', () => { if (!cancelled) { setReady(false); onSink(null); } });
        c.on('startup_error', (m: string) => { if (!cancelled) onError(m || 'The live avatar could not start.'); });
        await c.start();
        if (cancelled) return void c.stop();
        setReady(true);
        onSink({ send: (pcm) => c.sendAudioData(pcm), clear: () => c.ClearBuffer() });
      } catch (e) {
        if (!cancelled) onError(e instanceof Error ? e.message : String(e || 'The live avatar could not start.'));
      }
    })();
    return () => {
      cancelled = true;
      setReady(false);
      onSink(null);
      void client?.stop().catch(() => {});
    };
  }, [active, onSink, onError]);

  return (
    <>
      <video ref={videoRef} className={`avatar__media avatar__live ${ready ? 'is-visible' : ''}`}
             autoPlay playsInline muted data-testid="simli-video" />
      <audio ref={audioRef} autoPlay />
      {active && !ready && <span className="avatar__status" role="status">Connecting live avatar…</span>}
    </>
  );
}
