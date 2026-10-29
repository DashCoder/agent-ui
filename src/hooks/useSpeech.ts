import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Browser text-to-speech (Web Speech API). Works offline on macOS with system voices.
 * Swap for your own TTS (Kokoro, ElevenLabs, Pipecat…) by replacing speak().
 */
export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speaking, setSpeaking] = useState(false);
  const queue = useRef(0);

  const speak = useCallback((text: string) => {
    if (!supported || !text.trim()) return;
    const u = new SpeechSynthesisUtterance(text.replace(/[*_#`>]/g, ''));
    queue.current += 1;
    setSpeaking(true);
    const finish = () => {
      queue.current = Math.max(0, queue.current - 1);
      if (queue.current === 0) setSpeaking(false);
    };
    u.onend = finish;
    u.onerror = finish;
    window.speechSynthesis.speak(u);
  }, [supported]);

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    queue.current = 0;
    setSpeaking(false);
  }, [supported]);

  useEffect(() => cancel, [cancel]);
  return { supported, speaking, speak, cancel };
}
