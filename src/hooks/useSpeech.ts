import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { api } from '../api/client';
import type { AudioSink } from '../components/SimliStage';
import { chunks, toPcm16k } from '../lib/pcm';

/** Strip what sounds bad read aloud (code, links, markdown). The server does the same. */
export function speakableText(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " I've put the code in the chat. ")
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, 'the link')
    .replace(/[*_#>|~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Best-sounding browser voice: macOS Premium/Enhanced or Google/Microsoft online voices, British first. */
function pickBrowserVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const score = (v: SpeechSynthesisVoice) =>
    (/premium|enhanced|natural|neural/i.test(v.name) ? 4 : 0) +
    (/google|microsoft/i.test(v.name) ? 2 : 0) +
    (v.lang === 'en-GB' ? 2 : v.lang.startsWith('en') ? 1 : -10);
  return [...voices].sort((a, b) => score(b) - score(a))[0];
}

/**
 * Reads replies aloud. Uses natural neural voices from agent-api (/api/tts) and falls back to the
 * browser's own voices when that is unavailable (offline, service down). When a live avatar is connected
 * (sinkRef), the audio goes to it instead, so the face lip-syncs and plays the sound.
 */
export function useSpeech(voice?: string, sinkRef?: MutableRefObject<AudioSink | null>) {
  const supported = typeof window !== 'undefined' && ('speechSynthesis' in window || 'Audio' in window);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generation = useRef(0);

  const speakWithBrowser = (text: string, gen: number) =>
    new Promise<void>((resolve) => {
      if (!('speechSynthesis' in window) || gen !== generation.current) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      const v = pickBrowserVoice();
      if (v) u.voice = v;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });

  const speak = useCallback(async (raw: string) => {
    const text = speakableText(raw);
    if (!supported || !text) return;
    const gen = ++generation.current;
    audioRef.current?.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(true);
    try {
      const blob = await api.tts(text, voice);
      if (gen !== generation.current) return;
      const sink = sinkRef?.current;
      if (blob && sink) {
        const { pcm, seconds } = await toPcm16k(blob);
        if (gen !== generation.current) return;
        for (const part of chunks(pcm)) sink.send(part);
        await new Promise((r) => setTimeout(r, seconds * 1000 + 400));
      } else if (blob) {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.onpause = () => resolve();
          audio.play().catch(() => resolve());
        });
        URL.revokeObjectURL(url);
      }
    } catch {
      await speakWithBrowser(text, gen);
    } finally {
      if (gen === generation.current) setSpeaking(false);
    }
  }, [supported, voice, sinkRef]);

  const cancel = useCallback(() => {
    generation.current += 1;
    sinkRef?.current?.clear();
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [sinkRef]);

  useEffect(() => cancel, [cancel]);
  return { supported, speaking, speak, cancel };
}
