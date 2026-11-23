import { expect, test } from '@playwright/test';

test('only the saved theme preview loads on entry and the image follows theme changes', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'light');
  });
  const requested = new Set<string>();
  page.on('request', request => {
    const theme = request.url().match(/atlas-manager-home-(light|dark)\./)?.[1];
    if (theme) requested.add(theme);
  });
  await page.goto('/');
  const preview = page.getByRole('link', { name: 'Read the Atlas Manager guide' }).getByRole('img');
  await expect(preview).toHaveJSProperty('complete', true);
  await expect(preview).toHaveAttribute('src', /atlas-manager-home-light/);
  expect(await preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(
    0,
  );
  expect([...requested]).toEqual(['light']);

  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(preview).toHaveAttribute('src', /atlas-manager-home-dark/);
  await expect.poll(() => [...requested]).toEqual(['light', 'dark']);

  await page.getByRole('link', { name: 'Read the Atlas Manager guide' }).click();
  await expect(page).toHaveURL(/\/docs\/install\/manager\/$/);
  await page.getByRole('link', { name: 'AtlasOS Home', exact: true }).click();
  await expect(preview).toHaveAttribute('src', /atlas-manager-home-dark/);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the homepage displays a preview and a download link', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Download Atlas Manager' })).toBeVisible();
    const preview = page
      .getByRole('link', { name: 'Read the Atlas Manager guide' })
      .getByRole('img');
    await expect(preview).toHaveAttribute('src', /atlas-manager-home-dark/);
    await expect(preview).toHaveJSProperty('complete', true);
    expect(await preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(
      0,
    );
  });
});
