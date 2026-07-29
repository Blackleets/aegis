import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test.describe.configure({ mode: 'serial' });

test('mobile shell loads AEGIS homepage', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/AEGIS/i);
  await expect(page.getByRole('region', { name: 'Inicio AEGIS' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Navegar', exact: false })).toBeVisible();
  await expect(page.getByText('Tu mundo, mientras ocurre.')).toBeVisible();
});

test('daily navigation entry opens the local map and destination search', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Navegar', exact: false }).click();
  await expect(page.getByRole('region', { name: 'Inicio AEGIS' })).toBeHidden();
  await expect(page.getByText('Destino y ruta')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cambiar a globo 3D' })).toHaveAttribute('data-view', 'map');
});

test('world explorer keeps the globe as the primary global surface', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Explorar', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Inicio AEGIS' })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'AEGIS' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cambiar a mapa 2D' })).toHaveAttribute('data-view', 'globe');
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

test('mobile map controls expose and change their real state', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('aegis-splash-seen', '1');
  });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'AEGIS' }).first()).toBeVisible();
  const projection = page.getByRole('button', { name: 'Cambiar a mapa 2D' });
  await expect(projection).toHaveAttribute('data-view', 'globe');
  await projection.click();
  await expect(page.getByRole('button', { name: 'Cambiar a globo 3D' })).toHaveAttribute('data-view', 'map');

  const satellite = page.getByRole('button', { name: 'Activar vista satélite' });
  await expect(satellite).toHaveAttribute('data-style', 'dark');
  await satellite.click();
  await expect(page.getByRole('button', { name: 'Cambiar a mapa nocturno' })).toHaveAttribute('data-style', 'satellite');

  const motion = page.getByRole('button', { name: /rotación ambiental/i });
  const initialMotionState = await motion.getAttribute('aria-pressed');
  await motion.click();
  await expect(motion).toHaveAttribute('aria-pressed', initialMotionState === 'true' ? 'false' : 'true');
});

test('mobile command menu closes with Escape and outside tap', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('aegis-splash-seen', '1');
  });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'AEGIS' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Abrir menú AEGIS' }).click();
  await expect(page.locator('button[aria-expanded="true"]')).toHaveAccessibleName('Cerrar menú AEGIS');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Abrir menú AEGIS' })).toHaveAttribute('aria-expanded', 'false');

  await page.getByRole('button', { name: 'Abrir menú AEGIS' }).click();
  await page.locator('button[aria-label="Cerrar menú AEGIS"]:not([aria-expanded])').click({ position: { x: 380, y: 800 } });
  await expect(page.getByRole('button', { name: 'Abrir menú AEGIS' })).toBeVisible();
});
