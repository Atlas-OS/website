import { expect, test } from '@playwright/test';

test('built docs search can load its WebAssembly and navigate to a match', async ({ page }) => {
  await page.goto('/docs/');
  await page.locator('#navbar-search-button').click();
  await page.getByRole('combobox').fill('install');
  const result = page.getByRole('option').first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/\/docs\/.+/);
});

test('the article and its Markdown rendition share a negotiated URL', async ({ request }) => {
  const path = '/docs/atlas-configuration/atlas-folder/';
  const html = await request.get(path, { headers: { Accept: 'text/html' } });
  expect(html.headers()['content-type']).toContain('text/html');
  expect(html.headers()['vary']).toContain('Accept');
  const md = await request.get(path, { headers: { Accept: 'text/markdown' } });
  expect(md.headers()['content-type']).toContain('text/markdown');
  expect(md.headers()['vary']).toContain('Accept');
  expect(await md.text()).toContain(
    '[our guide to restore the Atlas folder](/docs/faq/post-install/#restoring-the-atlas-folder)',
  );
});
test('branding panels have working targets and support keyboard selection', async ({ page }) => {
  await page.goto('/docs/branding/');
  const tabs = page.getByRole('tab');
  const targetsExist = await tabs.evaluateAll(buttons =>
    buttons.every(button => document.getElementById(button.getAttribute('aria-controls') ?? '')),
  );
  expect(targetsExist).toBe(true);
  await tabs.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', { name: 'Version 2', exact: true })).toBeVisible();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('branding downloads remain available', async ({ page }) => {
    await page.goto('/docs/branding/');
    await expect(
      page.getByRole('heading', { name: 'Version 2', exact: true }).first(),
    ).toBeVisible();
    await expect(page.locator('[data-tab-panel="v2"] a').first()).toBeVisible();
  });
});
