'use client';

import type { ComponentProps } from 'react';
import TopHudOverlays from './TopHudOverlays';
import styles from './TopHudOverlaysRefined.module.css';

type Props = ComponentProps<typeof TopHudOverlays>;

export default function TopHudOverlaysRefined(props: Props) {
  return (
    <div className={styles.scope} data-aegis-refined-top-hud="true">
      <TopHudOverlays {...props} />
    </div>
  );
}
