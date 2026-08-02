'use client';

import type { Locale } from '@/lib/i18n';

export type CelestialBodyId = 'earth' | 'moon' | 'mars' | 'venus' | 'jupiter' | 'saturn' | 'neptune';

interface SolarSystemModeProps {
  selected: CelestialBodyId;
  onSelect: (body: CelestialBodyId) => void;
  onReturnEarth: () => void;
  isMobile: boolean;
  enabled: boolean;
  locale: Locale;
}

/**
 * Compatibility boundary for the retired solar-system showcase.
 *
 * The public props remain temporarily intact so the dashboard shell can be
 * simplified in a separate, low-risk change without shipping the former
 * Framer Motion/WebGL renderer or loading its planetary scene metadata.
 */
export default function SolarSystemMode(_props: SolarSystemModeProps) {
  return null;
}
