/**
 * The stable surface for UI plugins: import from '@agent-ui/core', never from other files in this repo.
 * Plugins may also import 'react', 'react-dom' and 'react-router-dom' (the core's copies are used).
 */
export { ApiError, request, json, api } from './api/client';
export type * from './api/types';
export { PageHeader } from './pages/admin/PageHeader';
export { refreshBadges } from './pages/admin/badges';
export { humanize } from './pages/admin/humanize';
export { FormFooter } from './pages/admin/AvatarSettings';
export { Stat } from './pages/admin/Dashboard';
export { AdminIcon } from './components/AdminIcons';
export { useAgent } from './pages/admin/agents';
export { UI_PLUGIN_API } from './plugins/types';
export type { AgentUIPlugin, AdminPage, AgentInfo, MenuItem, MenuSection, AdminIconName, EventText, MessageExtrasProps } from './plugins/types';
