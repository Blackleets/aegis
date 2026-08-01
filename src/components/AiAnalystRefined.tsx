'use client';

import type { ComponentProps } from 'react';
import AiAnalyst from './AiAnalyst';
import styles from './AiAnalystRefined.module.css';

type AiAnalystProps = ComponentProps<typeof AiAnalyst>;

export default function AiAnalystRefined(props: AiAnalystProps) {
  return (
    <div className={styles.scope} data-aegis-analyst-surface="refined">
      <AiAnalyst {...props} />
    </div>
  );
}
