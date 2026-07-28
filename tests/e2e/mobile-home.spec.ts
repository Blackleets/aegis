import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test('mobile shell loads AEGIS homepage', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('aegis-splash-seen', '1');
  });
  await page.goto('/');

  await expect(page).toHaveTitle(/AEGIS/i);
  await expect(page.getByRole('heading', { name: 'AEGIS' }).first()).toBeVisible();
});

test('mobile command buttons open and close without blocking one another', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('aegis-splash-seen', '1');
  });
  await page.goto('/');

  await page.getByRole('button', { name: 'Abrir menú AEGIS' }).click();
  await expect(page.getByText('Centro de control')).toBeVisible();

  await page.getByRole('button', { name: /CAPAS|LAYERS/i }).click();
  await expect(page.getByRole('button', { name: /Cerrar/i }).first()).toBeVisible();
  await page.getByRole('button', { name: /Cerrar/i }).first().click();

  await page.getByRole('button', { name: 'Buscar destino' }).click();
  await expect(page.getByText('Destino y ruta')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar navegación' }).click();
  await expect(page.getByRole('button', { name: 'Buscar destino' })).toBeVisible();
});
