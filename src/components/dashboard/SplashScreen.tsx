'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, Globe2, Navigation, Radio } from 'lucide-react';
import { useState } from 'react';

type SplashScreenProps = {
  showSplash: boolean;
  onNavigate: () => void;
  onExplore: () => void;
};

export default function SplashScreen({ showSplash, onNavigate, onExplore }: SplashScreenProps) {
  const [dismissed, setDismissed] = useState(false);

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
          exit={{ opacity: 0, scale: 1.015 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 z-[999] overflow-hidden"
          aria-label="Inicio AEGIS"
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,11,0.06)_0%,rgba(3,7,11,0.12)_42%,rgba(3,7,11,0.78)_78%,rgba(3,7,11,0.94)_100%)]" />

          <div className="relative z-10 mx-auto flex h-full w-full max-w-[31rem] flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2 text-[10px] font-medium tracking-[0.12em] text-white/54">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.75)]" />
                ENTORNO EN DIRECTO
              </div>
              <button
                type="button"
                onClick={enterExplorer}
                className="flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-black/28 px-4 text-[11px] font-semibold text-white/72 backdrop-blur-xl transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                <Globe2 className="h-4 w-4 text-cyan-200" />
                Explorar
              </button>
            </motion.div>

            <div className="flex flex-1 flex-col items-center justify-center pb-3 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.82, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="relative mb-7"
              >
                <div className="absolute inset-[-20px] rounded-full bg-white/[0.035] blur-2xl" />
                <Image
                  src="/brand/aegis-symbol.png"
                  alt="Símbolo AEGIS"
                  width={116}
                  height={116}
                  priority
                  className="relative h-[82px] w-[82px] object-contain opacity-95 drop-shadow-[0_0_20px_rgba(255,255,255,0.12)] sm:h-[94px] sm:w-[94px]"
                />
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="max-w-[20rem] text-[28px] font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-[34px]"
              >
                Tu mundo, mientras ocurre.
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.32, duration: 0.5 }}
                className="mt-4 max-w-[21rem] text-[13px] leading-5 text-white/52"
              >
                Navega con tráfico, cámaras e incidentes verificados alrededor de tu ruta.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-3"
            >
              <button
                type="button"
                onClick={enterNavigation}
                className="group flex min-h-[68px] w-full items-center justify-between rounded-[22px] bg-[#f1f1ed] px-5 text-left text-[#0a0d0c] shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.985]"
              >
                <span className="flex items-center gap-4">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-[#0a0d0c] text-white">
                    <Navigation className="h-5 w-5 fill-current" />
                  </span>
                  <span>
                    <span className="block text-[17px] font-bold tracking-[-0.02em]">Navegar</span>
                    <span className="mt-0.5 block text-[11px] font-medium text-black/52">¿Adónde vas?</span>
                  </span>
                </span>
                <span className="text-xl transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={enterExplorer}
                  className="flex min-h-[58px] items-center justify-center gap-2 rounded-[19px] border border-white/10 bg-white/[0.055] px-3 text-[12px] font-semibold text-white/72 backdrop-blur-xl transition hover:bg-white/[0.09] hover:text-white"
                >
                  <Radio className="h-4 w-4 text-cyan-200" />
                  Mundo en vivo
                </button>
                <button
                  type="button"
                  onClick={enterNavigation}
                  className="flex min-h-[58px] items-center justify-center gap-2 rounded-[19px] border border-white/10 bg-white/[0.055] px-3 text-[12px] font-semibold text-white/72 backdrop-blur-xl transition hover:bg-white/[0.09] hover:text-white"
                >
                  <BellRing className="h-4 w-4 text-amber-300" />
                  Alertas cerca
                </button>
              </div>

              <p className="pt-2 text-center text-[9px] font-medium uppercase tracking-[0.18em] text-white/30">
                Inteligencia local · fuentes verificadas
              </p>
            </motion.div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
