import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readManifest(path: string) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) as Record<string, unknown>;
}

describe('AEGIS web app manifest', () => {
  const primary = readManifest('public/site.webmanifest');
  const legacy = readManifest('public/manifest.json');

  it('keeps both public manifests aligned', () => {
    expect(legacy).toEqual(primary);
  });

  it('defines a stable standalone mobile launch surface', () => {
    expect(primary).toMatchObject({
      id: '/',
      start_url: '/?nosplash=1',
      scope: '/',
      display: 'standalone',
      orientation: 'any',
      lang: 'es',
    });
  });

  it('declares identity, colors and scalable icon metadata', () => {
    expect(primary.name).toBeTruthy();
    expect(primary.short_name).toBe('AEGIS');
    expect(primary.background_color).toMatch(/^#[0-9A-F]{6}$/i);
    expect(primary.theme_color).toMatch(/^#[0-9A-F]{6}$/i);
    expect(primary.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }),
    ]));
  });
});
