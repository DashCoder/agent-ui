import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { Approval, ChatMessage } from '../api/types';

const SESSION_KEY = 'agent-ui.session';

function readSession(): string | null {
  try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
}
function writeSession(id: string | null) {
  try { id ? localStorage.setItem(SESSION_KEY, id) : localStorage.removeItem(SESSION_KEY); } catch { /* private mode */ }
}

export interface ChatState {
  messages: ChatMessage[];
  /** Text streamed so far for the reply in progress. */
  draft: string;
  streaming: boolean;
  progress: string | null;
  approval: Approval | null;
  error: string | null;
  send: (text: string, opts: { learn: boolean; attachments?: string[] }) => Promise<void>;
  answerApproval: (approve: boolean) => Promise<void>;
  stop: () => void;
  reset: () => Promise<void>;
}

/**
 * @param ready  wait until the visitor cookie exists (first /api/config call) before
 *               creating a session, so parallel first requests don't get different visitors.
 */
export function useChat(ready = true): ChatState {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startNew = useCallback(async () => {
    const s = await api.createSession();
    writeSession(s.id);
    setSessionId(s.id);
    setMessages(s.messages);
    return s.id;
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        const existing = readSession();
        if (existing) {
          try {
            const { messages: m } = await api.messages(existing);
            if (!cancelled) { setSessionId(existing); setMessages(m); }
            return;
          } catch { /* expired or other browser: start fresh */ }
        }
        const s = await api.createSession();
        if (cancelled) return;
        writeSession(s.id);
        setSessionId(s.id);
        setMessages(s.messages);
      } catch (e) {
        if (!cancelled) setError(`Can't reach the assistant right now. ${(e as Error).message}`);
      }
    })();
    return () => { cancelled = true; };
  }, [ready]);

  const send = useCallback(async (text: string, opts: { learn: boolean; attachments?: string[] }) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setError(null);
    setApproval(null);
    setStreaming(true);
    setDraft('');
    setProgress(null);
    const optimistic: ChatMessage = { id: `local-${Date.now()}`, role: 'user', text: trimmed, created_at: Date.now() / 1000 };
    setMessages((m) => [...m, optimistic]);
    const controller = new AbortController();
    abortRef.current = controller;
    let acc = '';
    try {
      const sid = sessionId ?? (await startNew());
      await api.stream(sid, { text: trimmed, learn: opts.learn, attachments: opts.attachments ?? [] }, (ev) => {
        switch (ev.type) {
          case 'start':
            setMessages((m) => m.map((x) => (x.id === optimistic.id ? ev.userMessage : x)));
            break;
          case 'delta':
            acc += ev.text;
            setDraft(acc);
            setProgress(null);
            break;
          case 'progress':
            setProgress(ev.label);
            break;
          case 'approval':
            setApproval({ runId: ev.runId, prompt: ev.prompt });
            break;
          case 'error':
            setError(ev.message);
            break;
          case 'done':
            if (ev.message) setMessages((m) => [...m, ev.message!]);
            setDraft('');
            break;
        }
      }, controller.signal);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
      else if (acc) {
        setMessages((m) => [...m, { id: `local-${Date.now()}`, role: 'assistant', text: acc, created_at: Date.now() / 1000 }]);
      }
    } finally {
      setDraft('');
      setProgress(null);
      setStreaming(false);
      abortRef.current = null;
    }
  }, [sessionId, startNew, streaming]);

  const answerApproval = useCallback(async (approve: boolean) => {
    if (!approval || !sessionId) return;
    const current = approval;
    setApproval(null);
    try {
      const res = await api.approve(current, approve, sessionId);
      if (res.savedMessage) setMessages((m) => [...m, res.savedMessage!]);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [approval, sessionId]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(async () => {
    writeSession(null);
    setApproval(null);
    await startNew();
  }, [startNew]);

  return { messages, draft, streaming, progress, approval, error, send, answerApproval, stop, reset };
}
