import { defineConfig, devices } from '@playwright/test';

// E2E tests mock the API with page.route (see tests/e2e/mockApi.ts),
// so they run without agent-api or Hermes.
export default defineConfig({
  // Plugin repos run their own specs with this config: AGENT_UI_TEST_DIR=../my-plugins/tests
  testDir: process.env.AGENT_UI_TEST_DIR ?? 'tests/e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    // The example plugin in tests/fixtures checks that plugin pages load; the real build ships without it.
    command: `AGENT_UI_PLUGINS=${process.env.AGENT_UI_PLUGINS ?? 'tests/fixtures/demo-plugin.tsx'} npm run dev -- --host 127.0.0.1 --strictPort`,
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
});
