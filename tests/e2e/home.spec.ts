import { test, expect } from '@playwright/test';

test('desktop shell loads AEGIS homepage', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/AEGIS/i);
  await expect(page.getByRole('heading', { name: 'AEGIS' }).first()).toBeVisible();
});
