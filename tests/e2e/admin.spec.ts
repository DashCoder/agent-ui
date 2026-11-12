import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './mockApi';

/** On phones the menu starts collapsed to icons; open it so labels and the Agent dropdown show. */
async function openNav(page: Page) {
  const expand = page.getByRole('button', { name: 'Expand navigation' });
  if (await expand.isVisible()) await expand.click();
  return page.getByRole('navigation', { name: 'Admin sections' });
}

test.describe('admin console', () => {
  test('redirects to login, rejects a wrong password, then shows the dashboard', async ({ page }) => {
    await mockApi(page);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
    await page.getByLabel('Password').fill('nope');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toHaveText('Wrong username or password');
    await page.getByLabel('Password').fill('secret');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { level: 1, name: /Dashboard/ })).toBeVisible();
    await expect(page.getByText('Getting started')).toBeVisible();
    for (const id of ['phone', 'knowledge', 'calendar', 'widget', 'model']) await expect(page.getByTestId(`step-${id}`)).toBeVisible();
    await expect(page.getByText('InAgentic Command').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'View site ↗' })).toBeVisible();
    await expect(page.getByText('What are your rates?')).toBeVisible();   // recent conversations
  });

  test('the menu reaches every core page', async ({ page }) => {
    await mockApi(page, { loggedIn: true });
    await page.goto('/admin');
    const nav = await openNav(page);
    for (const [label, heading] of [['Agent', 'Agent'], ['Avatar', 'Avatar'], ['Knowledge', 'Knowledge'],
      ['Model & tools', 'Model & tools'], ['Phone', 'Phone'], ['Calendar', 'Calendar'], ['Agent logs', 'Agent logs'],
      ['Usage & costs', 'Usage & costs'], ['Plugins', 'Plugins'], ['Settings', 'Settings']]) {
      await nav.getByRole('link', { name: label, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
    }
  });

  test('old addresses still work', async ({ page }) => {
    await mockApi(page, { loggedIn: true });
    for (const [old, now] of [['builder', 'agent'], ['hermes', 'model'], ['audit', 'logs']]) {
      await page.goto(`/admin/${old}`);
      await expect(page).toHaveURL(new RegExp(`/admin/${now}`));
    }
  });

  test('the Agent dropdown swaps the menu for that agent, with its badge', async ({ page }) => {
    await mockApi(page, { loggedIn: true });
    await page.goto('/admin');
    await openNav(page);
    const pick = page.getByLabel('Agent', { exact: true });
    await expect(pick.locator('option')).toHaveText(['All agents', 'Demo agent — demo', 'Legacy — legacy']);
    await pick.selectOption('demo');
    await expect(page).toHaveURL(/\/admin\?agent=demo$/);
    await expect(page).toHaveTitle('Dashboard · Demo agent');
    await expect(page.getByRole('link', { name: "View Demo agent's chat ↗" })).toHaveAttribute('href', '/?agent=demo');
    await expect(page.getByRole('heading', { level: 1, name: 'Demo agent' })).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Admin sections' });
    await expect(nav.getByRole('link', { name: /^Demo\s*3$/ })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Phone' })).toHaveCount(0);       // not on this agent's menu
    await expect(nav.getByRole('link', { name: 'Knowledge' })).toHaveAttribute('href', '/admin/knowledge?agent=demo');
    await nav.getByRole('link', { name: /^Demo/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Demo plugin' })).toBeVisible();
    await page.getByRole('button', { name: 'Clicked 0' }).click();
    await expect(page.getByRole('button', { name: 'Clicked 1' })).toBeVisible();
    await expect(pick).toHaveValue('demo');                                       // the page's owner stays picked
    // shared pages keep the agent when switching
    await nav.getByRole('link', { name: 'Agent logs' }).click();
    await pick.selectOption('all');
    await expect(page).toHaveURL(/\/admin\/logs$/);
    await expect(page.getByRole('tab', { name: 'Conversations' })).toBeVisible();
  });

  test('an API 1 plugin gets a default menu; incompatible plugins are skipped', async ({ page }) => {
    await mockApi(page, { loggedIn: true });
    await page.goto('/admin?agent=legacy');
    const nav = await openNav(page);
    await expect(nav.getByRole('link', { name: 'Legacy page' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Plugins' })).toBeVisible();
    await nav.getByRole('link', { name: 'Legacy page' }).click();
    await expect(page.getByText('Old style')).toBeVisible();
    await page.goto('/admin');
    await openNav(page);
    await expect(page.getByLabel('Agent', { exact: true }).locator('option', { hasText: 'Future' })).toHaveCount(0);
  });

  test('adding a phone number completes the checklist step', async ({ page }) => {
    await mockApi(page, { loggedIn: true });
    await page.goto('/admin/phone');
    await page.getByLabel('Phone number').fill('+44 20 1234 5678');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveText('Saved');
    await (await openNav(page)).getByRole('link', { name: 'Dashboard' }).click();
    await expect(page.getByTestId('step-phone')).toHaveClass(/step--done/);
  });

  test('the Agent page changes the assistant name shown in chat', async ({ page }) => {
    await mockApi(page, { loggedIn: true });
    await page.goto('/admin/agent');
    const name = page.getByLabel('Name', { exact: true });
    await expect(name).toHaveValue('Builder');   // settings loaded
    await name.fill('Ava');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status').first()).toHaveText('✓ Saved');
    await page.goto('/');
    await expect(page.getByPlaceholder('Message Ava')).toBeVisible();
  });

  test('quick replies: add one suggested by an installed agent', async ({ page }) => {
    await mockApi(page, { loggedIn: true });
    await page.goto('/admin/agent');
    const sugg = page.getByTestId('pill-suggestions');
    await expect(sugg.getByRole('button', { name: '+ What are your rates?' })).toHaveCount(0);   // already a quick reply
    await sugg.getByRole('button', { name: '+ List my last 5 Jira tickets' }).click();
    await expect(page.getByTestId('pills')).toContainText('List my last 5 Jira tickets');
    await expect(page.getByTestId('pill-suggestions').getByRole('button', { name: '+ List my last 5 Jira tickets' })).toHaveCount(0);
    await expect(page.locator('.builder-frame').getByRole('button', { name: 'List my last 5 Jira tickets' })).toBeVisible();
  });

  test('knowledge sources can be added', async ({ page }) => {
    await mockApi(page, { loggedIn: true });
    await page.goto('/admin/knowledge');
    await page.getByLabel('URL').fill('https://example.com/faq');
    await page.getByRole('button', { name: 'Add link' }).click();
    await expect(page.getByRole('link', { name: 'https://example.com/faq' })).toBeVisible();
  });

  test('Model & tools shows status and the dashboard link', async ({ page }) => {
    await mockApi(page, { loggedIn: true });
    await page.goto('/admin/model');
    await expect(page.getByText('book-appointment')).toBeVisible();
    await expect(page.getByTestId('hermes-model')).toContainText('anthropic/claude-sonnet-4.5');
    await expect(page.getByTestId('hermes-model')).toContainText('via openrouter');
    await expect(page.getByRole('link', { name: 'Open full Hermes dashboard ↗' }))
      .toHaveAttribute('href', 'https://mac-mini.tailnet.ts.net:9119');
  });
});

test('avatar page lets the admin pick and test a natural voice', async ({ page }) => {
  await mockApi(page, { loggedIn: true });
  await page.goto('/admin/avatar');
  const voice = page.getByRole('combobox', { name: 'Voice' });
  await expect(voice).toHaveValue('en-GB-RyanNeural');
  await voice.selectOption('en-GB-SoniaNeural');
  await page.getByRole('button', { name: '▶ Test voice' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toHaveText('Saved');
});

test('agent logs: conversations open into a transcript; actions per agent', async ({ page }) => {
  await mockApi(page, { loggedIn: true });
  await page.goto('/admin/logs');
  await expect(page.getByRole('heading', { level: 1, name: 'Agent logs' })).toBeVisible();
  await page.getByRole('button', { name: 'What are your rates?' }).click();
  await expect(page.getByTestId('transcript')).toContainText('Plans start at £49 per month.');
  await page.getByRole('tab', { name: 'Actions' }).click();
  await expect(page.getByTestId('audit-row')).toHaveCount(2);
  await page.goto('/admin/logs?agent=demo');
  await expect(page.getByRole('tab')).toHaveCount(0);           // one agent: its actions only
  await expect(page.getByTestId('audit-row').first()).toContainText('Tool call');
});

test('usage & costs shows each agent and the month', async ({ page }) => {
  await mockApi(page, { loggedIn: true });
  await page.goto('/admin/usage');
  await expect(page.getByTestId('usage-agent')).toHaveCount(2);
  await expect(page.getByText('November 2026 to date')).toBeVisible();
  await expect(page.getByText('no model calls logged yet')).toBeVisible();
  await page.goto('/admin/usage?agent=demo');
  await expect(page.getByTestId('usage-agent')).toHaveCount(1);
});

test('plugins: check a repo, install it with its settings, follow the job', async ({ page }) => {
  await mockApi(page, { loggedIn: true });
  await page.goto('/admin/plugins');
  await expect(page.getByTestId('plugin-row')).toHaveCount(2);
  await expect(page.getByTestId('plugin-row').nth(1)).toContainText('From git');

  await page.getByLabel('Git repo URL').fill('https://github.com/someone/else');
  await page.getByRole('button', { name: 'Check repo' }).click();
  await expect(page.getByRole('alert')).toContainText('only come from');

  await page.getByLabel('Git repo URL').fill('https://github.com/DashCoder/ina-sales-agent');
  await page.getByRole('button', { name: 'Check repo' }).click();
  const card = page.getByTestId('plugin-check');
  await expect(card).toContainText('Sam');
  await expect(card).toContainText('9f8e7d6');
  await expect(card).toContainText('Add pipeline view');
  const install = page.getByRole('button', { name: 'Install Sam @9f8e7d6' });
  await expect(install).toBeDisabled();
  await page.getByLabel('CRM token *').fill('tok');
  await expect(install).toBeDisabled();                         // still needs the trust box
  await page.getByLabel(/I trust this code/).check();
  await install.click();
  const job = page.getByTestId('plugin-job');
  await expect(job).toContainText('Install Sam');
  await expect(job).toContainText('Done', { timeout: 10_000 });
  await expect(job).toContainText('Backup: 2026-11-12_101500');
  await expect(page.getByTestId('plugin-row')).toHaveCount(3);
  await expect(page.getByRole('cell', { name: /Install Sam/ })).toBeVisible();
});

test('plugins: turn one on, and removing asks to confirm', async ({ page }) => {
  await mockApi(page, { loggedIn: true });
  await page.goto('/admin/plugins');
  const mine = page.getByTestId('plugin-row').filter({ hasText: 'My extension' });
  await mine.getByRole('button', { name: 'Turn on' }).click();
  await expect(page.getByTestId('plugin-job')).toContainText('Done', { timeout: 10_000 });
  await expect(mine).toContainText('Running');
  await page.getByRole('button', { name: 'Close' }).click();
  await mine.getByRole('button', { name: 'Remove' }).click();
  await mine.getByRole('button', { name: 'Confirm remove' }).click();
  await expect(page.getByTestId('plugin-job')).toContainText('Done', { timeout: 10_000 });
  await expect(page.getByTestId('plugin-row')).toHaveCount(1);
});

test('plugins: warns when the installer is not set up', async ({ page }) => {
  await mockApi(page, { loggedIn: true, installerReady: false });
  await page.goto('/admin/plugins');
  await expect(page.getByText("The installer isn't set up on this machine yet.")).toBeVisible();
});

test('Model & tools: change Hermes\' model (with rollback) and an agent\'s model', async ({ page }) => {
  await mockApi(page, { loggedIn: true });
  await page.goto('/admin/model');
  await expect(page.getByTestId('models-table')).toContainText('anthropic/claude-sonnet-4.5 (OpenRouter)');
  await expect(page.getByTestId('models-table')).toContainText('eu.claude (AWS Bedrock)');
  const h = page.getByTestId('hermes-model-picker');
  await expect(h.getByTestId('hermes-model-picker-openrouter')).toContainText('In use');
  await h.getByTestId('hermes-model-picker-ollama').getByRole('radio').check();
  await expect(h).toContainText('gpt-oss:20b');
  await h.getByLabel('Local model (Ollama) model').fill('qwen3:14b');
  await h.getByRole('button', { name: 'Save and restart Hermes' }).click();
  await expect(h.getByRole('status')).toContainText('Hermes now uses qwen3:14b');
  await expect(h.getByRole('status')).toContainText('Hermes answered with qwen3:14b');
  await expect(page.getByTestId('models-table')).toContainText('qwen3:14b (Local model (Ollama))');
  await h.getByTestId('hermes-model-picker-openrouter').getByRole('radio').check();
  await h.getByLabel('OpenRouter model').fill('no/such-model');
  await h.getByRole('button', { name: 'Save and restart Hermes' }).click();
  await expect(h.getByRole('status')).toContainText('Not changed: model not found');
  await expect(h.getByRole('status')).toContainText('Put the previous model back');

  await page.getByTestId('models-table').getByRole('link', { name: 'Change' }).click();
  await expect(page).toHaveURL(/\/admin\/model\?agent=demo/);
  const a = page.getByTestId('agent-model');
  await expect(a).toContainText("Demo agent's model");
  await expect(a.getByTestId('agent-model-bedrock')).toContainText('Not set up');
  await a.getByTestId('agent-model-openrouter').getByRole('radio').check();
  await expect(a).toContainText('Demo text is sent to OpenRouter.');
  await a.getByLabel('OpenRouter model').fill('qwen/qwen3-coder');
  await a.getByRole('button', { name: 'Save as default' }).click();
  await expect(a.getByRole('status')).toContainText('Demo agent now uses qwen/qwen3-coder (OpenRouter)');
  await a.getByRole('button', { name: 'Test' }).click();
  await expect(a.getByRole('status')).toContainText('answered “OK” in 812 ms');
});
