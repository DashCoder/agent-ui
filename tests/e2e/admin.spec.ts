import { expect, test } from '@playwright/test';
import { mockApi } from './mockApi';

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
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Getting started')).toBeVisible();
    for (const id of ['phone', 'knowledge', 'calendar', 'widget']) await expect(page.getByTestId(`step-${id}`)).toBeVisible();
    await expect(page.getByRole('link', { name: '← Landing page' })).toBeVisible();
  });

  test('sidebar navigation reaches every page', async ({ page }) => {
    await mockApi(page, { loggedIn: true });
    await page.goto('/admin');
    const nav = page.getByRole('navigation', { name: 'Admin' });
    for (const [label, heading] of [['Builder', 'Builder'], ['Avatar', 'Avatar'], ['Phone', 'Phone'],
      ['Calendar', 'Calendar'], ['Knowledge', 'Knowledge'], ['Hermes', 'Hermes Agent'], ['Settings', 'Settings']]) {
      await nav.getByRole('link', { name: label }).click();
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    }
  });

  test('adding a phone number completes the checklist step', async ({ page }) => {
    await mockApi(page, { loggedIn: true });
    await page.goto('/admin/phone');
    await page.getByLabel('Phone number').fill('+44 20 1234 5678');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveText('Saved');
    await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Dashboard' }).click();
    await expect(page.getByTestId('step-phone')).toContainText('✓');
  });

  test('settings change the assistant name shown in chat', async ({ page }) => {
    await mockApi(page, { loggedIn: true });
    await page.goto('/admin/settings');
    await page.getByLabel('Name', { exact: true }).fill('Ava');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveText('Saved');
    await page.goto('/');
    await expect(page.getByPlaceholder('Ask Ava anything…')).toBeVisible();
  });

  test('knowledge sources can be added', async ({ page }) => {
    await mockApi(page, { loggedIn: true });
    await page.goto('/admin/knowledge');
    await page.getByLabel('URL').fill('https://example.com/faq');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('https://example.com/faq')).toBeVisible();
  });

  test('Hermes page shows status and the dashboard link', async ({ page }) => {
    await mockApi(page, { loggedIn: true });
    await page.goto('/admin/hermes');
    await expect(page.getByText('hermes-agent', { exact: true })).toBeVisible();
    await expect(page.getByText('book-appointment')).toBeVisible();
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
