// Screenshots of the main pages for the coding agent's preview before a pull request (see .inagentic/preview.json).
// The agent runs this before and after it changes the code and shows both side by side; it writes into $PREVIEW_DIR.
// Run by hand: PREVIEW_DIR=/tmp/shots AGENT_UI_TEST_DIR=tests/preview npx playwright test --project desktop
import { test } from '@playwright/test';
import { mockApi } from '../e2e/mockApi';

const DIR = process.env.PREVIEW_DIR ?? 'test-results/preview';

const PAGES: { name: string; path: string; admin?: boolean; ready?: string }[] = [
  { name: 'chat', path: '/', ready: 'transcript-box' },
  { name: 'admin-dashboard', path: '/admin', admin: true },
  { name: 'admin-chat-settings', path: '/admin/agent', admin: true },
  { name: 'admin-model', path: '/admin/model', admin: true },
  { name: 'admin-plugins', path: '/admin/plugins', admin: true },
  { name: 'admin-logs', path: '/admin/logs', admin: true },
];

for (const p of PAGES) {
  test(`screenshot: ${p.name}`, async ({ page }) => {
    await mockApi(page, { loggedIn: !!p.admin });
    await page.goto(p.path);
    if (p.ready) await page.getByTestId(p.ready).waitFor();
    await page.waitForLoadState('networkidle');
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
    await page.screenshot({ path: `${DIR}/${p.name}-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${DIR}/${p.name}-phone.png`, fullPage: true });
  });
}
