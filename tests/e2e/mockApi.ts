import type { Page, Route } from '@playwright/test';

/**
 * In-memory fake of agent-api for UI tests. Mirrors the real endpoints closely enough
 * that the UI can be tested without Python or Hermes running.
 */
export interface MockState {
  loggedIn: boolean;
  saved: { id: string; text: string; created_at: number }[];
  settings: Record<string, any>;
  knowledge: { id: string; kind: string; value: string; created_at: number }[];
  lastSend?: { text: string; learn: boolean };
}

export const SITE = {
  brand: { name: 'Agent UI', adminTitle: 'builder.example.com', landingUrl: '/' },
  assistant: { name: 'Builder', greeting: "Hi! I'm Builder 👋 How can I help you today?", learnByDefault: false },
  avatar: { posterUrl: '/avatar/poster.svg', idleVideos: [], talkVideos: [], speakReplies: false },
  quickReplies: ['What services do you offer?', 'How do I make a booking?', 'What are your rates?', 'What areas do you cover?'],
};

let n = 0;
const id = () => `id${++n}`;
const now = () => Date.now() / 1000;

function sse(events: object[]) {
  return events.map((e: any) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('');
}

export async function mockApi(page: Page, opts: Partial<MockState> = {}): Promise<MockState> {
  const state: MockState = {
    loggedIn: false, saved: [], knowledge: [],
    settings: { ...structuredClone(SITE), business: { services: '', booking: '', rates: '£49/month', areas: '' },
                phone: { number: '', script: '' }, calendar: { provider: '', connected: false } },
    ...opts,
  };
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  // Keep tests offline and fast: skip web fonts.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());

  // Only the API — not Vite modules such as /src/api/client.ts.
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();
    const body = req.postData() ? (() => { try { return JSON.parse(req.postData()!); } catch { return {}; } })() : {};

    if (path === '/api/config') return json(route, { brand: state.settings.brand, assistant: state.settings.assistant,
      avatar: state.settings.avatar, quickReplies: state.settings.quickReplies });
    if (path === '/api/chat/sessions' && method === 'POST')
      return json(route, { id: 's1', messages: [{ id: 'g', role: 'assistant', text: state.settings.assistant.greeting, created_at: now() }] });
    if (path.endsWith('/messages')) return json(route, {}, 404);
    if (path.endsWith('/stream')) {
      state.lastSend = { text: body.text, learn: body.learn };
      const user = { id: id(), role: 'user', text: body.text, created_at: now() };
      if (/delete/i.test(body.text)) {
        return route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse([
          { type: 'start', userMessage: user }, { type: 'delta', text: 'I need your OK first.' },
          { type: 'approval', runId: 'run1', prompt: `Allow the assistant to: ${body.text}` },
          { type: 'done', message: { id: id(), role: 'assistant', text: 'I need your OK first.', created_at: now() } }]) });
      }
      const reply = /rate/i.test(body.text) ? 'Plans start at £49 per month.'
        : /mascot/i.test(body.text)
          ? 'Done! See https://github.com/inagentic/agent-ui for code.\n\nSaved at:\n/Users/aiagents/.hermes/cache/generated/images/mascot.png\n\n```py\nprint("hi")\n```'
          : `You said: ${body.text}`;
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse([
        { type: 'start', userMessage: user }, { type: 'progress', label: 'Thinking…' },
        { type: 'delta', text: reply.slice(0, 10) }, { type: 'delta', text: reply.slice(10) },
        { type: 'done', message: { id: id(), role: 'assistant', text: reply, created_at: now() } }]) });
    }
    if (path === '/api/chat/runs/run1/approval')
      return json(route, { status: body.approve ? 'approved' : 'denied', message: body.approve ? 'Done.' : 'OK, I won\'t.',
        savedMessage: { id: id(), role: 'assistant', text: body.approve ? 'Done.' : "OK, I won't.", created_at: now() } });
    if (path === '/api/saved-replies' && method === 'GET') return json(route, { items: state.saved });
    if (path === '/api/saved-replies' && method === 'POST') {
      const item = { id: id(), text: body.text, created_at: now() };
      state.saved.unshift(item);
      return json(route, item);
    }
    if (path.startsWith('/api/saved-replies/') && method === 'DELETE') {
      state.saved = state.saved.filter((s) => !path.endsWith(s.id));
      return json(route, { ok: true });
    }
    if (path === '/api/files') return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>' });
    if (path === '/api/tts') return route.fulfill({ status: 204 });
    if (path === '/api/simli/token') return json(route, { detail: 'The live avatar is not switched on.' }, 404);
    if (path === '/api/save-work/start') return json(route, { sent: true, devCode: '123456' });
    if (path === '/api/save-work/verify')
      return body.code === '123456' ? json(route, { email: body.email }) : json(route, { detail: 'That code is wrong or has expired' }, 400);

    if (path === '/api/auth/me') return json(route, { user: state.loggedIn ? { username: 'admin', role: 'admin' } : null, email: null });
    if (path === '/api/auth/login') {
      if (body.password !== 'secret') return json(route, { detail: 'Wrong username or password' }, 401);
      state.loggedIn = true;
      return json(route, { user: { username: 'admin', role: 'admin' } });
    }
    if (path === '/api/auth/logout') { state.loggedIn = false; return json(route, { ok: true }); }

    if (path.startsWith('/api/admin/') && !state.loggedIn) return json(route, { detail: 'Admin login required' }, 401);
    if (path === '/api/admin/dashboard') return json(route, {
      checklist: [
        { id: 'phone', icon: '📞', title: 'Phone assistant', description: 'Add your phone number.', href: '/admin/phone', done: !!state.settings.phone.number },
        { id: 'knowledge', icon: '📚', title: 'Knowledge base', description: 'Connect documents.', href: '/admin/knowledge', done: state.knowledge.length > 0 },
        { id: 'calendar', icon: '📅', title: 'Booking & calendar', description: 'Connect a calendar.', href: '/admin/calendar', done: false },
        { id: 'widget', icon: '💬', title: 'Chat widget', description: 'Chat with a face and voice.', href: '/admin/builder', done: true },
      ],
      stats: { conversations24h: 2, messages24h: 5, savedReplies: state.saved.length, knowledgeSources: state.knowledge.length },
      agent: { mode: 'mock', reachable: true },
    });
    if (path === '/api/admin/settings' && method === 'GET') return json(route, state.settings);
    if (path === '/api/admin/settings' && method === 'PUT') {
      for (const [k, v] of Object.entries(body)) state.settings[k] = typeof v === 'object' && !Array.isArray(v) ? { ...state.settings[k], ...v as object } : v;
      return json(route, state.settings);
    }
    if (path === '/api/admin/knowledge' && method === 'GET') return json(route, { items: state.knowledge });
    if (path === '/api/admin/knowledge' && method === 'POST') {
      const item = { id: id(), kind: body.kind, value: body.value, created_at: now() };
      state.knowledge.unshift(item);
      return json(route, item);
    }
    if (path === '/api/admin/hermes') return json(route, {
      mode: 'hermes', status: { mode: 'hermes', reachable: true, authorized: true, models: ['hermes-agent'] },
      skills: [{ name: 'book-appointment', description: 'Books a slot' }], dashboardUrl: 'https://mac-mini.tailnet.ts.net:9119',
    });
    return json(route, { detail: `Not mocked: ${method} ${path}` }, 404);
  });
  return state;
}
