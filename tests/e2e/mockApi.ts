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
  lastSend?: { text: string; learn: boolean; agent?: string };
  sessionAgent?: string;
  plugins: any[];
  jobs: any[];
  installerReady: boolean;
  /** Messages in the chat, oldest first (for removing a question and its answer). */
  log: { id: string; role: string }[];
  models: any[];
  hermes: any;
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
    loggedIn: false, saved: [], knowledge: [], jobs: [], installerReady: true, log: [],
    models: [{ id: 'demo', name: 'Demo agent', uses: 'Writes demo things', default: { provider: 'bedrock', model: 'eu.claude' },
               providers: ['ollama', 'openrouter', 'bedrock'], warnings: { openrouter: 'Demo text is sent to OpenRouter.' },
               current: { provider: 'bedrock', model: 'eu.claude' }, label: 'eu.claude (AWS Bedrock)' }],
    hermes: { current: { model: 'anthropic/claude-sonnet-4.5', provider: 'openrouter', kind: 'openrouter' },
              kinds: { openrouter: 'OpenRouter', ollama: 'Local model (Ollama)', anthropic: 'Anthropic (Claude API)', bedrock: 'Claude on AWS Bedrock' },
              mode: 'hermes', file: '/Users/aiagents/.hermes/config.yaml', label: 'anthropic/claude-sonnet-4.5 (OpenRouter)' },
    plugins: [
      { key: 'demo', repo: 'demo-agent', plugin: 'demo', title: 'Demo agent', url: '', ref: '', commit: '', builtin: true,
        installed: true, enabled: true, running: true, version: '1.0.0' },
      { key: 'myext', repo: 'my-ext', plugin: 'myext', title: 'My extension', url: 'https://github.com/DashCoder/my-ext',
        ref: 'main', commit: 'abc1234def', builtin: false, installed: true, enabled: false, running: false, version: '0.1.0' },
    ],
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
      avatar: state.settings.avatar, quickReplies: state.settings.quickReplies,
      plugins: [{ name: 'demo', version: '1.0.0', quickReplies: ['List my last 5 Jira tickets', 'What are your rates?'] },
                { name: 'kpi', version: '2.0.0', agentName: 'Kai', quickReplies: ['Last 7 days', 'This week', 'Show my scorecard'] }] });
    if (path.startsWith('/api/chat/sessions/s1/messages/') && method === 'DELETE') {
      const mid = path.split('/').pop()!;
      const i = state.log.findIndex((m) => m.id === mid);
      if (i < 0) return json(route, { detail: 'Message not found' }, 404);
      const removed = [mid];
      if (state.log[i].role === 'user' && state.log[i + 1]?.role === 'assistant') removed.push(state.log[i + 1].id);
      state.log = state.log.filter((m) => !removed.includes(m.id));
      return json(route, { removed });
    }
    if (path === '/api/chat/sessions' && method === 'POST') {
      state.sessionAgent = body.agent;
      return json(route, { id: 's1', messages: [{ id: 'g', role: 'assistant', created_at: now(),
        text: body.agent === 'kpi' ? "Hi! I'm Kai 👋 I show KPI scorecards. What would you like to do?" : state.settings.assistant.greeting }] });
    }
    if (path.endsWith('/messages')) return json(route, {}, 404);
    if (path.endsWith('/stream')) {
      state.lastSend = { text: body.text, learn: body.learn, agent: body.agent };
      const user = { id: id(), role: 'user', text: body.text, created_at: now() };
      const answerId = id();
      state.log.push({ id: user.id, role: 'user' }, { id: answerId, role: 'assistant' });
      if (/delete/i.test(body.text)) {
        return route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse([
          { type: 'start', userMessage: user }, { type: 'delta', text: 'I need your OK first.' },
          { type: 'approval', runId: 'run1', prompt: `Allow the assistant to: ${body.text}` },
          { type: 'done', message: { id: id(), role: 'assistant', text: 'I need your OK first.', created_at: now() } }]) });
      }
      const reply = /tools/i.test(body.text)
        ? 'I have six tools whose names start with `mcp__inagentic__` (two underscores):\n\n1. mcp__inagentic__get_jira_ticket: Reads a Jira ticket.\n2. `mcp__inagentic__propose_pull_request`: Opens a pull request.\n\n- one\n- two'
        : /scorecard/i.test(body.text)
          ? "Here's your scorecard for **the last 7 days (6–12 Nov)**:\n\n**Outreach** 🔴 3% of target\n\n| KPI | Actual / target | Status |\n|---|---|---|\n| **Communications (last 7 days)** | **2 / 75** | 🔴 |\n| ↳ Calls (last 7 days) | 0 / 10 | 🔴 |\n| ↳ Emails (last 7 days) | 2 / 25 | 🔴 |\n\nKeep going!"
        : /preview of/i.test(body.text)
          ? 'INA-25 is ready to look at:\n\nhttp://127.0.0.1:8088/v020/\n\nTests: 64 passed. Press Accept to open the pull request, or Rebuild.'
        : /content ideas/i.test(body.text)
          ? 'Here are three content ideas:\n\n1. Your AI startup is failing because you explain it like an engineer.\n\n1. I tested 47 AI tools\n   so you don\'t have to.\n\n1. Stop building AI features nobody asked for.\n\nThen a paragraph.\n\n4. Restarted at four.\n5. Five.'
        : /long/i.test(body.text) ? Array.from({ length: 40 }, (_, n) => `Line ${n + 1} of a long answer.`).join('\n\n')
        : /rate/i.test(body.text) ? 'Plans start at £49 per month.'
        : /mascot/i.test(body.text)
          ? 'Done! See https://github.com/inagentic/agent-ui for code.\n\nSaved at:\n/Users/aiagents/.hermes/cache/generated/images/mascot.png\n\n```py\nprint("hi")\n```'
          : `You said: ${body.text}`;
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse([
        { type: 'start', userMessage: user }, { type: 'progress', label: 'Thinking…' },
        { type: 'delta', text: reply.slice(0, 10) }, { type: 'delta', text: reply.slice(10) },
        { type: 'done', message: { id: answerId, role: 'assistant', text: reply, created_at: now() } }]) });
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
        { id: 'widget', icon: '💬', title: 'Chat widget', description: 'Chat with a face and voice.', href: '/admin/agent', done: true },
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
    if (path === '/api/admin/audit') return json(route, { items: [
      { id: 'e1', ts: now(), actor: 'agent', action: 'pr.proposed', target: 'DashCoder/agent-api#7', detail: {} }] });
    if (path === '/api/admin/hermes') return json(route, {
      mode: 'hermes', status: { mode: 'hermes', reachable: true, authorized: true, models: ['hermes-agent'] },
      skills: [{ name: 'book-appointment', description: 'Books a slot' }], dashboardUrl: 'https://mac-mini.tailnet.ts.net:9119',
      configured: { model: 'anthropic/claude-sonnet-4.5', provider: 'openrouter' },
    });
    if (path === '/api/admin/activity') return json(route, { items: [
      { id: 'e2', ts: now() - 60, actor: 'hermes', action: 'mcp.call', target: 'add_note', detail: { plugin: 'demo' } },
      { id: 'e1', ts: now() - 120, actor: 'agent', action: 'pr.proposed', target: 'DashCoder/agent-api#7', detail: { files: 2 } }] });
    if (path === '/api/admin/conversations') return json(route, { hasMore: false, items: [
      { id: 'c1', channel: 'chat', contact: 'Visitor 4f2a91', startedAt: now() - 3600, lastAt: now() - 3500, messages: 2, questions: 1,
        summary: 'What are your rates?', reply: 'Plans start at £49 per month.', status: 'answered' }] });
    if (path === '/api/admin/conversations/c1') return json(route, { messages: [
      { id: 'm1', role: 'user', text: 'What are your rates?', created_at: now() - 3600 },
      { id: 'm2', role: 'assistant', text: 'Plans start at £49 per month.', created_at: now() - 3590 }] });
    if (path === '/api/admin/usage') {
      const c = (m: number, t: number) => ({ messages: m, conversations: m ? 1 : 0, actions: t, toolCalls: t });
      const agents = [{ id: 'assistant', today: c(2, 0), month: c(20, 1) }, { id: 'demo', today: c(0, 3), month: c(0, 12) }]
        .filter((a) => ['all', null, a.id].includes(url.searchParams.get('agent')));
      return json(route, { agents, currentMonth: '2026-11', costTracked: false,
        history: [{ month: '2026-11', ...c(20, 13) }, { month: '2026-10', ...c(8, 4) }] });
    }
    if (path === '/api/admin/models' && method === 'GET') return json(route, {
      agents: state.models, providerNames: { ollama: 'Local model (Ollama)', openrouter: 'OpenRouter', bedrock: 'Claude on AWS Bedrock' },
      providers: { ollama: { ready: true, models: ['qwen3:14b', 'qwen3:8b'] }, openrouter: { ready: true }, bedrock: { ready: false, error: "Bedrock keys aren't set in agent-api's .env" } },
      suggestions: { ollama: ['qwen3:14b'], openrouter: ['anthropic/claude-sonnet-4.5', 'qwen/qwen3-coder'], bedrock: ['eu.anthropic.claude-sonnet-4-5-20250929-v1:0'] },
      hermes: state.hermes });
    const mm = path.match(/^\/api\/admin\/models\/(\w+)(\/test)?$/);
    if (mm && mm[2]) return json(route, { ok: true, reply: 'OK', ms: 812 });
    if (mm && method === 'PUT') {
      const label = (p: string, m: string) => `${m} (${p === 'ollama' ? 'local, Ollama' : p === 'openrouter' ? 'OpenRouter' : 'AWS Bedrock'})`;
      if (mm[1] === 'hermes') {
        if (body.model === 'no/such-model') return json(route, { ok: false, error: 'model not found', steps: ['Saved', 'Restarted Hermes', "Hermes didn't answer (model not found). Put the previous model back and restarted Hermes."], hermes: state.hermes });
        state.hermes = { ...state.hermes, current: { model: body.model, provider: body.provider === 'ollama' ? 'custom' : body.provider, kind: body.provider }, label: `${body.model} (${state.hermes.kinds[body.provider]})` };
        return json(route, { ok: true, steps: ['Saved in ~/.hermes/config.yaml; backup config.yaml.bak-1', 'Restarted Hermes', `Hermes answered with ${body.model}: “OK”`], hermes: state.hermes });
      }
      const a = state.models.find((x: any) => x.id === mm[1]);
      a.current = { provider: body.provider, model: body.model }; a.label = label(body.provider, body.model);
      return json(route, { current: a.current, label: a.label });
    }
    if (path === '/api/admin/plugins') return json(route, { plugins: state.plugins, jobs: state.jobs,
      sources: ['github.com/DashCoder'], installerReady: state.installerReady });
    if (path === '/api/admin/plugins/check') {
      if (!String(body.url).startsWith('https://github.com/DashCoder/'))
        return json(route, { detail: 'Plugins can only come from: github.com/DashCoder.' }, 403);
      return json(route, { id: 'chk1', url: body.url, ref: body.ref, commit: '9f8e7d6c5b4a39281706f5e4d3c2b1a098765432',
        repo: 'ina-sales-agent', name: 'sales', title: 'Sam', version: '0.3.0', description: 'Sales pipeline from your CRM.',
        settings: [{ name: 'SALES_CRM_TOKEN', label: 'CRM token', secret: true, required: true, help: 'Read-only token' }],
        ui: true, python: 'api/sales', author: 'Axel', date: '2026-11-10', message: 'Add pipeline view', warnings: [], update: false });
    }
    const queue = (action: string, name: string, extra: object = {}) => {
      const job = { id: `job${state.jobs.length + 1}`, action, name, status: 'running', createdAt: now(), by: 'admin',
                    log: `${action} ${name}\n→ Code\n`, polls: 0, ...extra };
      state.jobs.unshift(job);
      return job;
    };
    if (path === '/api/admin/plugins/install') {
      if (!body.settings?.SALES_CRM_TOKEN) return json(route, { detail: 'missing setting' }, 400);
      return json(route, queue('add', 'sales', { title: 'Sam', commit: '9f8e7d6c5b4a39281706f5e4d3c2b1a098765432' }));
    }
    const toggle = path.match(/^\/api\/admin\/plugins\/(\w+)\/(toggle|remove)$/);
    if (toggle) return json(route, queue(toggle[2] === 'remove' ? 'remove' : body.enabled ? 'enable' : 'disable', toggle[1]));
    const jobm = path.match(/^\/api\/admin\/plugins\/jobs\/(\w+)$/);
    if (jobm) {
      const job = state.jobs.find((j) => j.id === jobm[1]);
      if (job && job.status === 'running' && ++job.polls >= 2) {
        job.status = 'done'; job.log += '✓ Done. Backup: 2026-11-12_101500\n';
        if (job.action === 'add') state.plugins.push({ key: 'sales', repo: 'ina-sales-agent', plugin: 'sales', title: 'Sam',
          url: 'https://github.com/DashCoder/ina-sales-agent', ref: 'main', commit: job.commit, builtin: false, installed: true,
          enabled: true, running: true, version: '0.3.0' });
        const p = state.plugins.find((x) => x.key === job.name);
        if (p && job.action === 'enable') Object.assign(p, { enabled: true, running: true });
        if (p && job.action === 'disable') Object.assign(p, { enabled: false, running: false });
        if (job.action === 'remove') state.plugins = state.plugins.filter((x) => x.key !== job.name);
      }
      return job ? json(route, job) : json(route, { detail: 'No such job' }, 404);
    }
    return json(route, { detail: `Not mocked: ${method} ${path}` }, 404);
  });
  return state;
}
