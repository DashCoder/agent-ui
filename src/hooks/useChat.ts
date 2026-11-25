import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { Approval, ChatMessage } from '../api/types';

const SESSION_KEY = 'agent-ui.session';
/** One conversation per agent (the main assistant, or ?agent=kpi …), remembered in this browser. */
const keyFor = (agent?: string) => (agent ? `${SESSION_KEY}.${agent}` : SESSION_KEY);

function readSession(agent?: string): string | null {
  try { return localStorage.getItem(keyFor(agent)); } catch { return null; }
}
function writeSession(id: string | null, agent?: string) {
  try { id ? localStorage.setItem(keyFor(agent), id) : localStorage.removeItem(keyFor(agent)); } catch { /* private mode */ }
}

export interface ChatState {
  messages: ChatMessage[];
  /** Text streamed so far for the reply in progress. */
  draft: string;
  streaming: boolean;
  progress: string | null;
  approval: Approval | null;
  error: string | null;
  /** The server said this browser has to sign in (or use a trusted email) to chat. */
  needsSignIn: boolean;
  send: (text: string, opts: { learn: boolean; attachments?: string[] }) => Promise<void>;
  answerApproval: (approve: boolean) => Promise<void>;
  stop: () => void;
  reset: () => Promise<void>;
  /** Remove a question and its answer (or just an answer) from the conversation. */
  remove: (id: string) => Promise<void>;
}

/**
 * @param ready  wait until the visitor cookie exists (first /api/config call) before
 *               creating a session, so parallel first requests don't get different visitors.
 */
export function useChat(ready = true, agent?: string): ChatState {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const startNew = useCallback(async () => {
    const s = await api.createSession(agent);
    writeSession(s.id, agent);
    setSessionId(s.id);
    setMessages(s.messages);
    return s.id;
  }, [agent]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        const existing = readSession(agent);
        if (existing) {
          try {
            const { messages: m } = await api.messages(existing);
            if (!cancelled) { setSessionId(existing); setMessages(m); }
            return;
          } catch { /* expired or other browser: start fresh */ }
        }
        const s = await api.createSession(agent);
        if (cancelled) return;
        writeSession(s.id, agent);
        setSessionId(s.id);
        setMessages(s.messages);
      } catch (e) {
        if (!cancelled) setError(`Can't reach the assistant right now. ${(e as Error).message}`);
      }
    })();
    return () => { cancelled = true; };
  }, [ready, agent]);

  const send = useCallback(async (text: string, opts: { learn: boolean; attachments?: string[] }) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setError(null);
    setNeedsSignIn(false);
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
      await api.stream(sid, { text: trimmed, learn: opts.learn, attachments: opts.attachments ?? [], agent }, (ev) => {
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
      if ((e as Error).name !== 'AbortError') {
        setError((e as Error).message);
        const code = (e as { code?: string }).code;
        if (code === 'sign_in' || code === 'not_trusted') {
          setNeedsSignIn(true);
          setMessages((m) => m.filter((x) => x.id !== optimistic.id));
        }
      } else if (acc) {
        setMessages((m) => [...m, { id: `local-${Date.now()}`, role: 'assistant', text: acc, created_at: Date.now() / 1000 }]);
      }
    } finally {
      setDraft('');
      setProgress(null);
      setStreaming(false);
      abortRef.current = null;
    }
  }, [sessionId, startNew, streaming, agent]);

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
    writeSession(null, agent);
    setApproval(null);
    await startNew();
  }, [startNew]);

  const remove = useCallback(async (id: string) => {
    if (!sessionId) return;
    try {
      const { removed } = await api.deleteMessage(sessionId, id);
      setMessages((m) => m.filter((x) => !removed.includes(x.id)));
    } catch (e) { setError((e as Error).message); }
  }, [sessionId]);

  return { messages, draft, streaming, progress, approval, error, needsSignIn, send, answerApproval, stop, reset, remove };
}
