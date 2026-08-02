'use client';

import type { ComponentProps, PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import AegisMap from './AegisMap';

const INTERACTION_IDLE_DELAY_MS = 550;

type AegisMapProps = ComponentProps<typeof AegisMap>;

export default function AegisMapResponsive({
  ambientMotionEnabled = true,
  ...props
}: AegisMapProps) {
  const [isInteracting, setIsInteracting] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pauseAmbientMotion = useCallback(() => {
    setIsInteracting(true);

    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      idleTimerRef.current = null;
      setIsInteracting(false);
    }, INTERACTION_IDLE_DELAY_MS);
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 0) pauseAmbientMotion();
  }, [pauseAmbientMotion]);

  useEffect(() => () => {
    if (idleTimerRef.current !== null) clearTimeout(idleTimerRef.current);
  }, []);

  return (
    <div
      className="absolute inset-0"
      onPointerDown={pauseAmbientMotion}
      onPointerMove={handlePointerMove}
      onPointerUp={pauseAmbientMotion}
      onPointerCancel={pauseAmbientMotion}
      onTouchStart={pauseAmbientMotion}
      onTouchMove={pauseAmbientMotion}
      onWheel={pauseAmbientMotion}
    >
      <AegisMap
        {...props}
        ambientMotionEnabled={ambientMotionEnabled && !isInteracting}
      />
    </div>
  );
}
