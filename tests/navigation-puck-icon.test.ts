import { describe, expect, it } from 'vitest';

import { getNavigationPuckLayerLayout, NAVIGATION_PUCK_IMAGE_ID } from '../src/lib/navigation-puck-icon';

describe('navigation puck layout', () => {
  it('keeps the Waze-style arrow billboarded so pitch does not flatten it', () => {
    const layout = getNavigationPuckLayerLayout();
    expect(layout['icon-image']).toBe(NAVIGATION_PUCK_IMAGE_ID);
    expect(layout['icon-pitch-alignment']).toBe('viewport');
    expect(layout['icon-rotation-alignment']).toBe('map');
    expect(layout['icon-size'][layout['icon-size'].length - 1]).toBeGreaterThan(1);
  });
});
