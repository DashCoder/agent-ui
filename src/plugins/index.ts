import installed from '@agent-ui/plugins';
import { SUPPORTED_UI_PLUGIN_APIS, type AgentUIPlugin } from './types';

/** Plugins built into this bundle that support a version of the UI plugin contract this build runs. */
export const PLUGINS: AgentUIPlugin[] = installed.filter((p) => {
  const ok = p.apiVersions.some((v) => SUPPORTED_UI_PLUGIN_APIS.includes(v));
  if (!ok) console.warn(`UI plugin "${p.id}" supports ${p.apiVersions.join(', ')}, this build runs `
    + `${SUPPORTED_UI_PLUGIN_APIS.join(', ')}; skipped`);
  return ok;
});

export const PLUGIN_ADMIN_PAGES = PLUGINS.flatMap((p) => p.adminPages ?? []);
