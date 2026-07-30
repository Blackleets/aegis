'use client';

import { useEffect } from 'react';

type WakeLockHandle = {
  released: boolean;
  release: () => Promise<void>;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockHandle>;
  };
};

export function useNavigationWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined') return;

    const wakeLockNavigator = navigator as WakeLockNavigator;
    if (!wakeLockNavigator.wakeLock) return;

    let handle: WakeLockHandle | null = null;
    let mounted = true;

    const acquire = async () => {
      if (!mounted || document.visibilityState !== 'visible' || handle) return;
      try {
        handle = await wakeLockNavigator.wakeLock?.request('screen') ?? null;
      } catch (error) {
        console.warn('[AEGIS] Screen wake lock unavailable:', error instanceof Error ? error.message : error);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && (!handle || handle.released)) {
        handle = null;
        void acquire();
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (handle && !handle.released) void handle.release();
      handle = null;
    };
  }, [active]);
}
