import type { ReactNode } from 'react';

/**
 * Version of the UI plugin contract. Bumped only for breaking changes; plugins list the versions they support.
 */
export const UI_PLUGIN_API = 1;

export interface AdminPage {
  /** Path under /admin, without a leading slash, e.g. "approvals" -> /admin/approvals */
  path: string;
  label: string;
  /** An emoji or short text shown in the sidebar */
  icon: string;
  element: ReactNode;
  /** Sidebar position: after the core page with this path ('' = Dashboard). Default: before Settings. */
  after?: string;
}

/** A UI plugin. Export a list of these as the default export of your plugins entry file. */
export interface AgentUIPlugin {
  id: string;
  apiVersions: number[];
  adminPages?: AdminPage[];
}
