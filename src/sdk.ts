/**
 * The stable surface for UI plugins: import from '@agent-ui/core', never from other files in this repo.
 * Plugins may also import 'react', 'react-dom' and 'react-router-dom' (the core's copies are used).
 */
export { ApiError, request, json, api } from './api/client';
export type * from './api/types';
export { PageHeader } from './pages/admin/PageHeader';
export { FormFooter } from './pages/admin/AvatarSettings';
export { UI_PLUGIN_API } from './plugins/types';
export type { AgentUIPlugin, AdminPage } from './plugins/types';
