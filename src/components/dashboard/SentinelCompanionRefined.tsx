'use client';

import type { ComponentProps } from 'react';
import SentinelCompanion from './SentinelCompanion';
import styles from './SentinelCompanionRefined.module.css';

type SentinelCompanionProps = ComponentProps<typeof SentinelCompanion>;

export default function SentinelCompanionRefined(props: SentinelCompanionProps) {
  return (
    <div className={styles.scope} data-aegis-sentinel-refined>
      <SentinelCompanion {...props} />
    </div>
  );
}
