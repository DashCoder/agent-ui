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
    // Slack-style: the agent's name with an APP badge, and quick replies as buttons under its message
    const greeting = page.getByTestId('msg-assistant').first();
    await expect(greeting.locator('.smsg__name')).toHaveText('Builder');
    await expect(greeting.locator('.smsg__app')).toHaveText('APP');
    await expect(greeting.getByRole('group', { name: 'Suggestions' })).toBeVisible();
  });

  test('a quick reply streams an answer that can be saved and removed', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'What are your rates?' }).click();
    const reply = page.getByTestId('msg-assistant').nth(1);
    await expect(reply).toHaveText(/Plans start at £49 per month\./);
    await reply.locator('.smsg__text').click();
    await reply.getByRole('button', { name: 'Save reply' }).click();
    const fold = page.locator('summary', { hasText: 'Saved replies' });
    if (!(await page.getByTestId('saved-item').first().isVisible().catch(() => false))) await fold.click();
    const saved = page.getByTestId('saved-item');
    await expect(saved).toHaveCount(1);
    await expect(saved).toContainText('£49');
    await saved.getByRole('button', { name: 'Remove saved reply' }).click();
    await expect(saved).toHaveCount(0);
  });

  test('typing a message sends the learn flag', async ({ page }) => {
    const state = await mockApi(page);
    await page.goto('/');
    const learn = page.getByLabel('Learn and improve');
    await expect(learn).not.toBeChecked();
    await learn.check({ force: true });
    await expect(learn).toBeChecked();
    await page.getByLabel('Message Builder').fill('hello there');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByTestId('msg-user').locator('.smsg__text')).toHaveText('hello there');
    await expect(page.getByTestId('msg-assistant').nth(1).locator('.smsg__text')).toHaveText('You said: hello there');
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
    await expect(page.getByTestId('msg-assistant').last().locator('.smsg__text')).toHaveText('Done.');
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

test('every avatar clip is preloaded once, so switching clips never reloads a video', async ({ page }) => {
  const settings = structuredClone(SITE) as any;
  settings.avatar.idleVideos = ['/avatar/idle_1.mp4', '/avatar/idle_2.mp4'];
  settings.avatar.talkVideos = ['/avatar/talk_1.mp4', '/avatar/talk_2.mp4', '/avatar/talk_3.mp4'];
  await mockApi(page, { settings });
  await page.goto('/');
  const clips = page.getByTestId('avatar').locator('video.avatar__clip');
  await expect(clips).toHaveCount(5);
  await expect(page.getByTestId('avatar').locator('video.avatar__clip.is-visible')).toHaveCount(1);
  await expect(clips.first()).toHaveAttribute('preload', 'auto');
});

test('links show as short labels and agent files become downloads', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByPlaceholder(/Message/).fill('make a mascot');
  await page.getByRole('button', { name: 'Send' }).click();
  const reply = page.getByTestId('msg-assistant').nth(1);
  const site = reply.getByRole('link', { name: 'Go to github.com' });
  await expect(site).toHaveAttribute('title', 'https://github.com/inagentic/agent-ui');
  const dl = reply.getByRole('link', { name: 'Download image' });
  await expect(dl).toHaveAttribute('href', /\/api\/files\?path=%2FUsers%2Faiagents%2F.*mascot\.png&download=true/);
  await expect(dl).toHaveAttribute('title', '/Users/aiagents/.hermes/cache/generated/images/mascot.png');
  await expect(reply.getByRole('img', { name: 'mascot.png' })).toBeVisible();
  await expect(reply.locator('pre code')).toHaveText('print("hi")');
  await expect(reply).not.toContainText('/Users/aiagents');
});

test('replies read cleanly: lists, and tool names in plain words', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByPlaceholder(/Message/).fill('List your tools');
  await page.getByRole('button', { name: 'Send' }).click();
  const reply = page.getByTestId('msg-assistant').last();
  await expect(reply.locator('ol li')).toHaveText(['Get Jira ticket: Reads a Jira ticket.', 'Propose pull request: Opens a pull request.']);
  await expect(reply.locator('ul li')).toHaveCount(2);
  await expect(reply).toContainText('the Inagentic tools');
  await expect(reply).not.toContainText('mcp__');
});

test('remove one question and its answer, then clear the whole chat', async ({ page }) => {
  const state = await mockApi(page);
  await page.goto('/');
  const box = page.getByPlaceholder(/Message/);
  for (const q of ['What are your rates?', 'Hello there']) {
    await box.fill(q);
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByTestId('msg-assistant')).toHaveCount(q === 'Hello there' ? 3 : 2);
  }
  const first = page.getByTestId('msg-user').filter({ hasText: 'What are your rates?' });
  await first.locator('.smsg__text').click();
  await first.getByRole('button', { name: 'Remove this question and its answer' }).click();
  await expect(page.getByTestId('msg-user').locator('.smsg__text')).toHaveText(['Hello there']);
  await expect(page.getByText('Plans start at £49 per month.')).toHaveCount(0);
  expect(state.log).toHaveLength(2);
  await expect(page.getByTestId('msg-assistant').first().getByRole('button', { name: /Remove/ })).toHaveCount(0); // greeting stays
  await page.getByRole('button', { name: 'Clear chat' }).click();
  await page.getByRole('button', { name: 'Yes, clear' }).click();
  await expect(page.getByTestId('msg-user')).toHaveCount(0);
  await expect(page.getByTestId('msg-assistant')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Clear chat' })).toBeDisabled();
});

test('the avatar sidebar collapses for a wider conversation, and the choice is remembered', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  const list = page.getByTestId('transcript-box');
  const before = (await list.boundingBox())!.width;
  await page.getByRole('button', { name: 'Hide avatar' }).click();
  await expect(page.getByTestId('avatar')).toHaveCount(0);
  const isPhone = (page.viewportSize()?.width ?? 1000) < 760;
  if (!isPhone) expect((await list.boundingBox())!.width).toBeGreaterThan(before + 150);
  await page.reload();
  await expect(page.getByTestId('avatar')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show avatar' }).first().click();
  await expect(page.getByTestId('avatar')).toBeVisible();
});

test('Slack-style message box: formatting, emoji, mention, shortcuts and Enter to send', async ({ page }) => {
  const state = await mockApi(page);
  await page.goto('/');
  const box = page.getByLabel('Message Builder');
  if (await page.getByRole('button', { name: 'Show formatting' }).isVisible()) {
    await page.getByRole('button', { name: 'Show formatting' }).click();
  }
  await box.fill('important');
  await box.selectText();
  await page.getByRole('button', { name: 'Bold' }).click();
  await expect(box).toHaveValue('**important**');
  await page.getByRole('button', { name: 'Emoji' }).click();
  await page.getByRole('menuitem', { name: 'Insert 👍' }).click();
  await page.getByRole('button', { name: 'Mention Builder' }).click();
  await expect(box).toHaveValue(/\*\*important\*\*👍@Builder $/);
  await box.press('Enter');
  await expect(page.getByTestId('msg-user').last().locator('strong')).toHaveText('important');
  expect(state.lastSend?.text).toContain('@Builder');
  await box.fill('/rat');
  await page.getByRole('menuitem', { name: /What are your rates\?/ }).click();
  await expect(page.getByText('Plans start at £49 per month.')).toBeVisible();
  await box.fill('line one');
  await box.press('Shift+Enter');
  await box.type('line two');
  await expect(box).toHaveValue('line one\nline two');
});

test("an agent's own chat (View site from Kai): its name, greeting and quick replies, and tables like Slack", async ({ page }) => {
  const state = await mockApi(page);
  await page.goto('/?agent=kpi');
  await expect(page.getByRole('heading', { level: 1, name: 'Kai' })).toBeVisible();
  await expect(page).toHaveTitle('Kai');
  const greeting = page.getByTestId('msg-assistant').first();
  await expect(greeting.locator('.smsg__name')).toHaveText('Kai');
  await expect(greeting).toContainText("Hi! I'm Kai");
  expect(state.sessionAgent).toBe('kpi');
  await expect(greeting.getByRole('button', { name: 'This week' })).toBeVisible();
  await greeting.getByRole('button', { name: 'Show my scorecard' }).click();
  expect(state.lastSend?.agent).toBe('kpi');
  const table = page.getByTestId('chat-table');
  await expect(table.locator('th')).toHaveText(['KPI', 'Actual / target', 'Status']);
  await expect(table.locator('tbody tr')).toHaveCount(3);
  await expect(table.locator('tbody tr').first().locator('strong').first()).toHaveText('Communications (last 7 days)');
  await expect(table.locator('tbody tr').nth(1)).toContainText('↳ Calls (last 7 days)0 / 10🔴');
  await expect(page.getByTestId('msg-assistant').last()).toContainText('Keep going!');
});

test('numbered lists count 1, 2, 3 even when the agent writes "1." for every item with blank lines between', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('textbox').fill('Give me content ideas');
  await page.keyboard.press('Enter');
  const reply = page.getByTestId('msg-assistant').nth(1);
  const lists = reply.locator('ol');
  await expect(lists).toHaveCount(2);
  await expect(lists.first().locator('li')).toHaveCount(3);
  await expect(lists.first().locator('li').nth(1)).toHaveText("I tested 47 AI tools so you don't have to.");
  await expect(lists.nth(1)).toHaveAttribute('start', '4');
  await expect(reply).toContainText('Then a paragraph.');
});
