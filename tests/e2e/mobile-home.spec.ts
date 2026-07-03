import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test('mobile shell renders the AEGIS command surface', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/AEGIS/i);
  await expect(page.getByRole('heading', { name: 'AEGIS' }).first()).toBeVisible();
  await expect(page.getByText('CORTEX').first()).toBeVisible();
});
