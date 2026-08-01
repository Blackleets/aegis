'use client';

import type { ComponentProps } from 'react';
import DesktopOpsRails from './DesktopOpsRails';
import styles from './DesktopOpsRailsRefined.module.css';

export default function DesktopOpsRailsRefined(props: ComponentProps<typeof DesktopOpsRails>) {
  return (
    <div className={styles.scope}>
      <DesktopOpsRails {...props} />
    </div>
  );
}
