# agent-ui

Open-source **React + TypeScript** boilerplate for AI agent products: a visitor chat with a talking avatar, plus an
admin console. Built to sit in front of **[Hermes Agent](https://hermes-agent.nousresearch.com)** through
[agent-api](https://github.com/YOUR-ORG/agent-api), and reusable across projects.

| Chat | Admin |
|---|---|
| ![Chat](docs/screenshots/chat.png) | ![Admin dashboard](docs/screenshots/admin-dashboard.png) |

**Visitor chat (`/`)**
- Video avatar with play/voice and full-screen buttons; idle and talking clip loops, or a poster image
- Streaming replies with friendly progress ("Checking the calendar…") and approval cards for risky actions
- Save any reply to the **Saved replies** side panel; **🔐 Save my work** links saved work to an email
- Quick-reply chips, a **Learn and improve** toggle, file attachments, and replies read aloud (Web Speech API)

**Admin console (`/admin`)**
- Dashboard with a *Getting started* checklist and stats
- Builder (chat preview), Avatar, Phone, Calendar, Knowledge, **Hermes** (status, skills, setup steps, link to the full
  Hermes dashboard), and Settings (branding, greeting, quick replies, business answers)

## Quick start

```bash
npm install
cp .env.example .env          # VITE_API_PROXY=http://127.0.0.1:8000
npm run dev                   # http://localhost:5173
```
Run [agent-api](https://github.com/YOUR-ORG/agent-api) on port 8000 (its mock agent works without Hermes). The dev
server proxies `/api` there, so cookies stay same-origin. Admin login with the mock setup: `admin` / `admin`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run typecheck` | TypeScript only |
| `npm run test:e2e` | Playwright tests (desktop + mobile), against a mocked API, no backend needed |

First Playwright run on a new machine: `npx playwright install chromium`.

## Customise

- **Look:** colours, fonts and radii are tokens in `src/styles/tokens.css` (chat and admin themes are separate).
- **Text and quick replies:** Admin → Settings (stored by agent-api), no code changes needed.
- **Avatar:** Admin → Avatar. Add looping clips (idle and talking) or a poster image. To use Simli, MuseTalk or another
  live avatar, replace `src/components/AvatarPanel.tsx`. Its `talking` prop tells you when the assistant is replying.
- **Voice:** `src/hooks/useSpeech.ts` uses the browser's speech; swap `speak()` for your own TTS.
- **Admin pages:** add a page in `src/pages/admin/`, a route in `src/App.tsx`, and an entry in `NAV` in
  `src/pages/admin/AdminLayout.tsx`.
- **API:** all calls are in `src/api/client.ts`; types in `src/api/types.ts`.

## Structure

```
src/
  api/            client (fetch + SSE parser) and types
  components/     ChatExperience, AvatarPanel, MessageBubble, Composer, SavedReplies, SaveWorkForm, ApprovalCard
  hooks/          useChat (sessions + streaming), useSiteConfig, useSpeech
  pages/          ChatPage, LoginPage, admin/*
  styles/         tokens.css, base.css, chat.css, admin.css
tests/e2e/        Playwright specs + an in-memory mock of agent-api
docs/             HERMES_MAC_MINI_SETUP.md: install Hermes on a Mac mini and connect this UI
```

## Deploy

Build (`npm run build`) and serve `dist/` from the same origin as agent-api. agent-api's `deploy/Caddyfile` does
this on a Mac mini. Full walkthrough: [docs/HERMES_MAC_MINI_SETUP.md](docs/HERMES_MAC_MINI_SETUP.md)
(or open `docs/HERMES_MAC_MINI_SETUP.html` in a browser).

## License

MIT
