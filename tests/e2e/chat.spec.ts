import { expect, test } from '@playwright/test';
import { mockApi, SITE } from './mockApi';

test.describe('visitor chat', () => {
  test('shows the avatar, greeting, quick replies and composer', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await expect(page.getByTestId('avatar')).toBeVisible();
    await expect(page.getByTestId('msg-assistant').first()).toContainText("Hi! I'm Builder");
    for (const q of ['🔐 Save my work', 'What services do you offer?', 'What areas do you cover?']) {
      await expect(page.getByRole('button', { name: q })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled();
    await expect(page.getByRole('link', { name: 'Admin →' })).toBeVisible();
  });

  test('a quick reply streams an answer that can be saved and removed', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'What are your rates?' }).click();
    const reply = page.getByTestId('msg-assistant').nth(1);
    await expect(reply).toHaveText(/Plans start at £49 per month\./);
    await reply.getByRole('button', { name: 'Save reply' }).click();
    const saved = page.getByTestId('saved-item');
    await expect(saved).toHaveCount(1);
    await expect(saved).toContainText('£49');
    await saved.getByRole('button', { name: 'Remove saved reply' }).click();
    await expect(saved).toHaveCount(0);
  });

  test('typing a message sends the learn flag', async ({ page }) => {
    const state = await mockApi(page);
    await page.goto('/');
    await expect(page.getByText('(off — faster replies)')).toBeVisible();
    await page.getByLabel('Learn and improve').check();
    await expect(page.getByText('(on — remembers useful answers)')).toBeVisible();
    await page.getByLabel('Message Builder').fill('hello there');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByTestId('msg-user')).toHaveText('hello there');
    await expect(page.getByTestId('msg-assistant').nth(1)).toHaveText('You said: hello there');
    expect(state.lastSend).toEqual({ text: 'hello there', learn: true });
  });

  test('risky actions ask for approval', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await page.getByLabel('Message Builder').fill('delete old logs');
    await page.keyboard.press('Enter');
    const card = page.getByTestId('approval');
    await expect(card).toContainText('Allow the assistant to: delete old logs');
    await card.getByRole('button', { name: 'Approve' }).click();
    await expect(card).toHaveCount(0);
    await expect(page.getByTestId('msg-assistant').last()).toHaveText('Done.');
  });

  test('save my work links an email with a code', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await page.getByRole('button', { name: '🔐 Save my work' }).click();
    await page.getByPlaceholder('you@example.com').fill('jo@example.com');
    await page.getByRole('button', { name: 'Send code' }).click();
    await expect(page.getByText('Dev mode — your code is 123456')).toBeVisible();
    await page.getByPlaceholder('6-digit code').fill('123456');
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page.getByRole('status')).toHaveText('Saved — your work is linked to jo@example.com.');
  });

  test('the chevron hides and shows the avatar', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Hide avatar' }).click();
    await expect(page.getByTestId('avatar')).toHaveCount(0);
    await page.getByRole('button', { name: 'Show avatar' }).click();
    await expect(page.getByTestId('avatar')).toBeVisible();
  });

  test('no horizontal scrolling', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await expect(page.getByTestId('msg-assistant').first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('live avatar switch', () => {
  const withSimli = () => {
    const settings = structuredClone(SITE) as any;
    settings.avatar.simliAvailable = true;
    return settings;
  };

  test('is hidden unless the admin has switched Simli on', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await expect(page.getByTestId('avatar')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Live avatar' })).toHaveCount(0);
  });

  test('remembers the choice and falls back to video when Simli fails', async ({ page }) => {
    await mockApi(page, { settings: withSimli() });
    await page.goto('/');
    const live = page.getByRole('button', { name: 'Live avatar' });
    await expect(live).toHaveAttribute('aria-pressed', 'false');
    await live.click();
    await expect(live).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Live avatar' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Play avatar and voice' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Live avatar unavailable' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Live avatar' })).toHaveAttribute('aria-pressed', 'false');
  });
});
