import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const here = path.dirname(fileURLToPath(import.meta.url));
const mod = (name: string) => path.join(here, 'node_modules', name);

/**
 * UI plugins: set AGENT_UI_PLUGINS to a file whose default export is a list of AgentUIPlugin, e.g.
 *   AGENT_UI_PLUGINS=../inagentic/ui/plugins/index.ts npm run build
 * Plugin files may live outside this folder; they import '@agent-ui/core' and use this repo's React.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const pluginsEntry = process.env.AGENT_UI_PLUGINS || env.AGENT_UI_PLUGINS;
  const pluginsFile = pluginsEntry ? path.resolve(process.cwd(), pluginsEntry) : path.join(here, 'src/plugins/empty.ts');
  return {
    plugins: [react()],
    resolve: {
      alias: [
        { find: '@agent-ui/plugins', replacement: pluginsFile },
        { find: '@agent-ui/core', replacement: path.join(here, 'src/sdk.ts') },
        // One copy of React for the core and every plugin, wherever the plugin files live.
        { find: /^react$/, replacement: mod('react') },
        { find: /^react\/(.*)$/, replacement: `${mod('react')}/$1` },
        { find: /^react-dom$/, replacement: mod('react-dom') },
        { find: /^react-dom\/(.*)$/, replacement: `${mod('react-dom')}/$1` },
        { find: /^react-router-dom$/, replacement: mod('react-router-dom') },
      ],
    },
    server: {
      port: 5173,
      fs: { allow: [here, path.dirname(pluginsFile)] },
      proxy: { '/api': { target: env.VITE_API_PROXY ?? 'http://127.0.0.1:8000', changeOrigin: false } },
    },
  };
});
