'use client';

import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';

type SplashScreenProps = {
  showSplash: boolean;
  onComplete: () => void;
};

const INTRO_DURATION_MS = 1500;

export default function SplashScreen({ showSplash, onComplete }: SplashScreenProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!showSplash) return;
    const timer = window.setTimeout(onComplete, reduceMotion ? 450 : INTRO_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [onComplete, reduceMotion, showSplash]);

  return (
    <AnimatePresence>
      {showSplash && (
        <motion.section
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 z-[999] grid place-items-center bg-[#070a0b]"
          aria-label="Introducción AEGIS"
          aria-live="polite"
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative grid place-items-center"
          >
            <motion.div
              aria-hidden="true"
              animate={reduceMotion ? undefined : { scale: [0.88, 1.2], opacity: [0.2, 0] }}
              transition={{ duration: 1.25, ease: 'easeOut' }}
              className="absolute h-28 w-28 rounded-full border border-cyan-100/25"
            />
            <Image
              src="/brand/aegis-symbol.png"
              alt="AEGIS"
              width={112}
              height={112}
              priority
              className="h-[76px] w-[76px] object-contain drop-shadow-[0_0_26px_rgba(165,243,252,0.16)]"
            />
          </motion.div>
          <span className="sr-only">Abriendo el navegador AEGIS</span>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
