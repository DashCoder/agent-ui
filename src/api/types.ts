export interface SiteConfig {
  brand: { name: string; adminTitle: string; landingUrl: string; consoleName?: string };
  assistant: { name: string; greeting: string; learnByDefault: boolean };
  avatar: AvatarConfig;
  quickReplies: string[];
  /** Installed agents, with what they suggest for the chat. */
  plugins?: { name: string; version: string; quickReplies?: string[]; assistantHint?: string }[];
}

export interface AvatarConfig {
  posterUrl: string;
  idleVideos: string[];
  talkVideos: string[];
  speakReplies: boolean;
  /** Microsoft Edge neural voice, e.g. en-GB-RyanNeural. */
  voice?: string;
  /** Admin switch and face for the optional live Simli avatar. */
  simliEnabled?: boolean;
  simliFaceId?: string;
  /** Set by the server: true when Simli is configured, so visitors may switch it on. */
  simliAvailable?: boolean;
}

/** Full settings document (admin only) — SiteConfig plus private sections. */
export interface SiteSettings extends SiteConfig {
  business: { services: string; booking: string; rates: string; areas: string };
  phone: { number: string; script: string };
  calendar: { provider: string; connected: boolean };
}

export type Role = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  created_at: number;
}

export interface SavedReply {
  id: string;
  text: string;
  created_at: number;
}

export interface Approval {
  runId: string;
  prompt: string;
}

/** Events streamed by POST /api/chat/sessions/:id/stream */
export type StreamEvent =
  | { type: 'start'; userMessage: ChatMessage }
  | { type: 'delta'; text: string }
  | { type: 'progress'; label: string }
  | { type: 'approval'; runId: string; prompt: string }
  | { type: 'error'; message: string }
  | { type: 'done'; message: ChatMessage | null };

export interface AgentStatus {
  mode: 'mock' | 'hermes';
  reachable: boolean;
  authorized?: boolean;
  models?: string[];
  url?: string;
  error?: string;
}

export interface ChecklistItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
}

export interface Dashboard {
  checklist: ChecklistItem[];
  stats: { conversations24h: number; messages24h: number; savedReplies: number; knowledgeSources: number };
  agent: AgentStatus;
}

export interface KnowledgeItem {
  id: string;
  kind: 'url' | 'text';
  value: string;
  created_at: number;
}

export interface HermesInfo {
  mode: 'mock' | 'hermes';
  status: AgentStatus;
  skills: { name: string; description: string }[];
  dashboardUrl: string | null;
}

export interface User {
  username: string;
  role: 'admin';
}

export interface AuditEvent {
  id: string;
  ts: number;
  actor: string;
  action: string;
  target: string;
  detail: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  channel: 'chat';
  contact: string;
  startedAt: number;
  lastAt: number;
  messages: number;
  questions: number;
  summary: string | null;
  reply: string | null;
  status: 'answered' | 'no_reply';
}

export interface ConversationMessage { id: string; role: 'user' | 'assistant'; text: string; created_at: number }

export interface UsageCounts { messages: number; conversations: number; actions: number; toolCalls: number }

export interface Usage {
  agents: { id: string; today: UsageCounts; month: UsageCounts }[];
  history: ({ month: string } & UsageCounts)[];
  currentMonth: string;
  costTracked: boolean;
}

export interface InstalledPlugin {
  key: string; repo: string; plugin: string; title: string; url: string; ref: string; commit: string;
  builtin: boolean; installed: boolean; enabled: boolean; running: boolean; version: string | null;
}
export interface PluginJob {
  id: string; action: 'add' | 'enable' | 'disable' | 'remove'; status: 'queued' | 'running' | 'done' | 'failed';
  name: string; title?: string; url?: string; commit?: string; createdAt: number; finishedAt?: number; exitCode?: number;
  by?: string; log?: string;
}
export interface PluginList { plugins: InstalledPlugin[]; jobs: PluginJob[]; sources: string[]; installerReady: boolean }
export interface PluginSetting { name: string; label?: string; help?: string; secret?: boolean; required?: boolean }
export interface PluginCheck {
  id: string; url: string; ref: string; commit: string; repo: string; name: string; title: string; version?: string;
  description: string; settings: PluginSetting[]; ui: boolean; python?: string; author: string; date: string;
  message: string; warnings: string[]; update: boolean;
}
