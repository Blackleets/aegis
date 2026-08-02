'use client';

import type { ComponentProps } from 'react';
import ModeDock from './ModeDock';
import styles from './ModeDockRefined.module.css';

export default function ModeDockRefined(props: ComponentProps<typeof ModeDock>) {
  return (
    <div className={styles.scope} data-aegis-visual-layer="mode-dock-refined">
      <ModeDock {...props} />
    </div>
  );
}
