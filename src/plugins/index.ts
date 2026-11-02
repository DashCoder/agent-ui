import installed from '@agent-ui/plugins';
import { UI_PLUGIN_API, type AgentUIPlugin } from './types';

/** Plugins built into this bundle that support this version of the UI plugin contract. */
export const PLUGINS: AgentUIPlugin[] = installed.filter((p) => {
  const ok = p.apiVersions.includes(UI_PLUGIN_API);
  if (!ok) console.warn(`UI plugin "${p.id}" supports ${p.apiVersions.join(', ')}, this build has ${UI_PLUGIN_API}; skipped`);
  return ok;
});

export const PLUGIN_ADMIN_PAGES = PLUGINS.flatMap((p) => p.adminPages ?? []);
