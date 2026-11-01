import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

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
 * browser's own voices when that is unavailable (offline, service down).
 */
export function useSpeech(voice?: string) {
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
      if (blob) {
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
  }, [supported, voice]);

  const cancel = useCallback(() => {
    generation.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => cancel, [cancel]);
  return { supported, speaking, speak, cancel };
}
