'use client';

import type { ComponentProps } from 'react';
import BottomDesktopHud from './BottomDesktopHud';
import styles from './BottomDesktopHudRefined.module.css';

export default function BottomDesktopHudRefined(props: ComponentProps<typeof BottomDesktopHud>) {
  return (
    <div className={styles.scope}>
      <BottomDesktopHud {...props} />
    </div>
  );
}
