'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, Globe2, Navigation, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

type SplashScreenProps = {
  showSplash: boolean;
  onNavigate: () => void;
  onExplore: () => void;
};

export default function SplashScreen({ showSplash, onNavigate, onExplore }: SplashScreenProps) {
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setReady(true));
  }, []);

  const enterNavigation = () => {
    setDismissed(true);
    onNavigate();
  };

  const enterExplorer = () => {
    setDismissed(true);
    onExplore();
  };

  return (
    <AnimatePresence>
      {showSplash && !dismissed && (
        <motion.section
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute inset-0 z-[999] overflow-hidden"
          aria-label="Inicio AEGIS"
        >
          <div className="relative mx-auto flex h-full w-full max-w-[31rem] flex-col justify-between px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex justify-end"
            >
              <button
                type="button"
                onClick={enterExplorer}
                disabled={!ready}
                className="pointer-events-auto flex min-h-12 items-center gap-2 rounded-full border border-white/12 bg-[#090d0f]/78 px-5 text-sm font-semibold text-white shadow-xl backdrop-blur-xl transition hover:bg-[#111719] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:opacity-60"
              >
                <Globe2 className="h-5 w-5 text-cyan-200" />
                Explorar
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto space-y-3"
            >
              <button
                type="button"
                onClick={enterNavigation}
                disabled={!ready}
                className="group flex min-h-[76px] w-full items-center justify-between rounded-[24px] bg-[#f5f5f0] px-5 text-left text-[#090c0b] shadow-[0_20px_60px_rgba(0,0,0,0.42)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.985] disabled:opacity-70"
              >
                <span className="flex items-center gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-[#0b0e0d] text-white">
                    <Search className="h-5 w-5" strokeWidth={2.4} />
                  </span>
                  <span>
                    <span className="block text-lg font-bold tracking-[-0.025em]">¿Adónde vas?</span>
                    <span className="mt-0.5 block text-xs font-medium text-black/50">Buscar un destino</span>
                  </span>
                </span>
                <Navigation className="h-5 w-5 fill-current transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={enterNavigation}
                disabled={!ready}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-white/12 bg-[#090d0f]/78 px-4 text-sm font-semibold text-white/78 shadow-lg backdrop-blur-xl transition hover:bg-[#111719] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:opacity-60"
              >
                <BellRing className="h-[18px] w-[18px] text-amber-300" />
                Alertas cerca de tu ruta
              </button>

              <p className="pb-1 text-center text-[10px] font-medium tracking-[0.08em] text-white/46">
                Tráfico · cámaras · incidentes verificados
              </p>
            </motion.div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
