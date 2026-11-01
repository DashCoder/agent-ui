export interface SiteConfig {
  brand: { name: string; adminTitle: string; landingUrl: string };
  assistant: { name: string; greeting: string; learnByDefault: boolean };
  avatar: AvatarConfig;
  quickReplies: string[];
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
