import type { ReactNode } from 'react';

/**
 * Version of the UI plugin contract. Bumped only for breaking changes; plugins list the versions they support.
 * Version 2 adds agents with their own menu and dashboard. Plugins written for version 1 still load.
 */
export const UI_PLUGIN_API = 2;
export const SUPPORTED_UI_PLUGIN_APIS = [1, 2];

/** Line icons drawn by the admin (see components/AdminIcons). A plugin may also pass an emoji. */
export type AdminIconName =
  | 'home' | 'agent' | 'avatar' | 'phone' | 'calendar' | 'knowledge' | 'settings' | 'docs' | 'logs' | 'billing'
  | 'code' | 'model' | 'plugin' | 'slack' | 'pr' | 'idea' | 'content' | 'notes' | 'chart' | 'review' | 'key'
  | 'mail' | 'target' | 'shield' | 'repo' | 'video' | 'bot';

export interface AdminPage {
  /** Path under /admin, without a leading slash, e.g. "approvals" -> /admin/approvals */
  path: string;
  label: string;
  /** A line icon name (version 2) or an emoji (version 1). */
  icon: AdminIconName | string;
  element: ReactNode;
  /** Version 1 only — where the page sat in the single menu. Ignored when the plugin has an agent menu. */
  after?: string;
  /** One line shown on the agent's dashboard under "Getting started". */
  description?: string;
}

/** One link in an agent's left menu. `to` is a page path under /admin ('' = the agent's dashboard), or one of the
 * shared core pages: 'logs' (Agent logs, filtered to the agent), 'usage', 'knowledge', 'settings', 'plugins'. */
export interface MenuItem {
  to: string;
  label: string;
  icon: AdminIconName | string;
  /** A count shown on the right of the item, e.g. items waiting for review. */
  badge?: () => Promise<number>;
  description?: string;
}

/** A group in the left menu. `title` is the small uppercase heading (leave it out for the top group). */
export interface MenuSection {
  title?: string;
  items: MenuItem[];
}

export interface AgentInfo {
  /** Usually the plugin name in agent-api (PLUGINS=…), e.g. "kpi". Activity and usage are looked up by it. */
  id: string;
  /** The agent's name, e.g. "Kai". Shown in the Agent dropdown as "Kai — kpi". */
  name: string;
  /** One line about the agent, shown on its dashboard. */
  description?: string;
}

/** A UI plugin. Export a list of these as the default export of your plugins entry file. */
export interface AgentUIPlugin {
  id: string;
  apiVersions: number[];
  adminPages?: AdminPage[];
  /** Version 2: the plugin is an agent with its own entry in the Agent dropdown. */
  agent?: AgentInfo;
  /** Version 2: the agent's own menu, top to bottom. Agent logs, Usage & costs, Plugins and Settings are added
   * after it. Without a menu the agent gets: Dashboard, its pages, then those shared pages. */
  menu?: MenuSection[];
  /** Version 2: the agent's own dashboard. Without one it gets a standard dashboard (activity, its pages). */
  dashboard?: ReactNode;
}
