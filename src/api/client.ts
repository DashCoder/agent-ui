import type {
  Approval, ChatMessage, Dashboard, HermesInfo, KnowledgeItem, SavedReply, SiteConfig, SiteSettings,
  StreamEvent, User,
} from './types';

/** Base URL of agent-api. Empty = same origin (Vite dev proxy or Caddy in production). */
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const res = await fetch(BASE + path, { ...init, headers, credentials: 'include' });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail ?? body);
    } catch { /* keep statusText */ }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

const json = (body: unknown) => JSON.stringify(body);

/** Parses a text/event-stream body and calls onEvent for each JSON event. */
export async function readEventStream(body: ReadableStream<Uint8Array>, onEvent: (e: StreamEvent) => void) {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('\n');
      if (data) {
        try { onEvent(JSON.parse(data) as StreamEvent); } catch { /* ignore malformed */ }
      }
    }
  }
}

export const api = {
  config: () => request<SiteConfig>('/api/config'),

  // chat
  createSession: () => request<{ id: string; messages: ChatMessage[] }>('/api/chat/sessions', { method: 'POST' }),
  messages: (sessionId: string) => request<{ messages: ChatMessage[] }>(`/api/chat/sessions/${sessionId}/messages`),
  async stream(sessionId: string, body: { text: string; learn: boolean; attachments: string[] },
               onEvent: (e: StreamEvent) => void, signal?: AbortSignal) {
    const res = await fetch(`${BASE}/api/chat/sessions/${sessionId}/stream`, {
      method: 'POST', credentials: 'include', signal,
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: json(body),
    });
    if (!res.ok || !res.body) throw new ApiError(res.status, `Chat failed (${res.status})`);
    await readEventStream(res.body, onEvent);
  },
  approve: (approval: Approval, approve: boolean, sessionId: string) =>
    request<{ status: string; message: string | null; savedMessage?: ChatMessage }>(
      `/api/chat/runs/${approval.runId}/approval`, { method: 'POST', body: json({ approve, sessionId }) }),
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ id: string; filename: string; size: number }>('/api/chat/uploads', { method: 'POST', body: form });
  },

  // saved replies + save my work
  savedReplies: () => request<{ items: SavedReply[] }>('/api/saved-replies'),
  saveReply: (text: string) => request<SavedReply>('/api/saved-replies', { method: 'POST', body: json({ text }) }),
  deleteReply: (id: string) => request<{ ok: true }>(`/api/saved-replies/${id}`, { method: 'DELETE' }),
  saveWorkStart: (email: string) =>
    request<{ sent: boolean; devCode?: string }>('/api/save-work/start', { method: 'POST', body: json({ email }) }),
  saveWorkVerify: (email: string, code: string) =>
    request<{ email: string }>('/api/save-work/verify', { method: 'POST', body: json({ email, code }) }),

  // auth
  me: () => request<{ user: User | null; email: string | null }>('/api/auth/me'),
  login: (username: string, password: string) =>
    request<{ user: User }>('/api/auth/login', { method: 'POST', body: json({ username, password }) }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),

  // admin
  dashboard: () => request<Dashboard>('/api/admin/dashboard'),
  settings: () => request<SiteSettings>('/api/admin/settings'),
  updateSettings: (patch: Partial<Record<keyof SiteSettings, unknown>>) =>
    request<SiteSettings>('/api/admin/settings', { method: 'PUT', body: json(patch) }),
  knowledge: () => request<{ items: KnowledgeItem[] }>('/api/admin/knowledge'),
  addKnowledge: (kind: KnowledgeItem['kind'], value: string) =>
    request<KnowledgeItem>('/api/admin/knowledge', { method: 'POST', body: json({ kind, value }) }),
  deleteKnowledge: (id: string) => request<{ ok: true }>(`/api/admin/knowledge/${id}`, { method: 'DELETE' }),
  hermes: () => request<HermesInfo>('/api/admin/hermes'),

  simliToken: () => request<{ sessionToken: string; maxSessionSeconds: number }>('/api/simli/token', { method: 'POST' }),

  /** Natural voice (MP3) from agent-api. Returns null when there is nothing to say. */
  async tts(text: string, voice?: string): Promise<Blob | null> {
    const res = await fetch(BASE + '/api/tts', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: json({ text, voice }),
    });
    if (res.status === 204) return null;
    if (!res.ok) throw new ApiError(res.status, res.statusText);
    return res.blob();
  },
};
