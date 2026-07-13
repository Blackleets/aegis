'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, LocateFixed, Map, Menu, Navigation, RotateCw, Search, Satellite, X } from 'lucide-react';
import { useState, type ComponentType, type ReactNode } from 'react';
import { useRealtimePresence } from '@/hooks/useRealtimePresence';

type MobilePanel = 'layers' | 'markets' | 'intel' | 'alerts' | 'search' | 'recon';
type MobileNavGlyphProps = { className?: string };

type MobileTab = {
  id: MobilePanel;
  icon: ComponentType<MobileNavGlyphProps>;
  label: string;
  accent?: boolean;
};

type MobileCommandDrawerProps = {
  mobileNavTabs: MobileTab[];
  mobilePanel: MobilePanel | null;
  onTogglePanel: (panel: MobilePanel) => void;
  layersContent: ReactNode;
  marketsContent: ReactNode;
  intelContent: ReactNode;
  alertsContent: ReactNode;
  searchContent: ReactNode;
  reconContent: ReactNode;
  headerSummary: ReactNode;
  isGlobeView: boolean;
  isSatelliteView: boolean;
  onToggleProjection: () => void;
  onToggleMapStyle: () => void;
  ambientMotionEnabled: boolean;
  onToggleAmbientMotion: () => void;
};

export default function MobileCommandDrawer({
  mobileNavTabs,
  mobilePanel,
  onTogglePanel,
  layersContent,
  marketsContent,
  intelContent,
  alertsContent,
  searchContent,
  reconContent,
  headerSummary,
  isGlobeView,
  onToggleProjection,
  onToggleMapStyle,
  ambientMotionEnabled,
  onToggleAmbientMotion,
}: MobileCommandDrawerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { onlineCount, status: presenceStatus } = useRealtimePresence();
  const activeTab = mobileNavTabs.find((tab) => tab.id === mobilePanel) ?? null;
  const isSearchPanel = mobilePanel === 'search';
  const isReconPanel = mobilePanel === 'recon';

  const openPanel = (panel: MobilePanel) => {
    setMenuOpen(false);
    onTogglePanel(panel);
  };

  return (
    <>
      {!mobilePanel && (
        <>
          <div className="fixed left-4 top-[max(1rem,env(safe-area-inset-top))] z-[392]">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className={`grid h-11 w-11 place-items-center rounded-[15px] border shadow-[0_12px_32px_rgba(0,0,0,0.38)] backdrop-blur-xl transition-all ${menuOpen ? 'border-cyan-200/40 bg-cyan-300 text-[#031019]' : 'border-white/15 bg-[rgba(5,15,25,0.91)] text-white'}`}
              aria-label="Abrir menú AEGIS"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  className="mt-3 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-[26px] border border-white/12 bg-[rgba(4,13,22,0.96)] shadow-[0_24px_64px_rgba(0,0,0,0.52)] backdrop-blur-2xl"
                >
                  <div className="border-b border-white/8 px-4 py-3.5">
                    <div className="flex items-center gap-2 text-[8px] font-mono uppercase tracking-[0.25em] text-cyan-200">
                      <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]" />
                      AEGIS en vivo
                    </div>
                    <div className="mt-1.5 flex items-end justify-between gap-3">
                      <div className="text-[14px] font-semibold text-white">Centro de control</div>
                      {presenceStatus === 'live' && onlineCount !== null && (
                        <div className="rounded-full border border-emerald-300/18 bg-emerald-300/[0.07] px-2.5 py-1 text-[8px] font-mono text-emerald-100">
                          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.85)]" />
                          {onlineCount} {onlineCount === 1 ? 'en línea' : 'en línea'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-3">
                    {mobileNavTabs.filter((tab) => tab.id !== 'search').map((tab) => (
                      <button key={tab.id} type="button" onClick={() => openPanel(tab.id)} className="flex min-h-[58px] items-center gap-3 rounded-2xl border border-white/9 bg-white/[0.035] px-3 text-left transition-colors active:bg-white/[0.1]">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.055]">
                          <tab.icon className={`h-4 w-4 ${tab.accent ? 'text-cyan-300' : 'text-white/70'}`} />
                        </span>
                        <span className="text-[9px] font-mono uppercase tracking-[0.13em] text-white/85">{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-[391] flex items-center gap-1.5 rounded-[18px] border border-white/10 bg-[rgba(4,13,22,0.72)] p-1 shadow-[0_10px_28px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <button type="button" onClick={onToggleProjection} className="grid h-10 w-10 place-items-center rounded-[14px] border border-transparent bg-transparent text-cyan-100 shadow-[0_12px_30px_rgba(0,0,0,0.36)] backdrop-blur-xl" aria-label="Cambiar proyección">
              {isGlobeView ? <Navigation className="h-5 w-5 fill-cyan-200/20" /> : <Map className="h-5 w-5" />}
            </button>
            <button type="button" onClick={onToggleMapStyle} className="grid h-10 w-10 place-items-center rounded-[14px] border border-transparent bg-transparent text-emerald-200 shadow-[0_12px_30px_rgba(0,0,0,0.36)] backdrop-blur-xl" aria-label="Cambiar estilo del mapa">
              <Satellite className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onToggleAmbientMotion}
              className={`grid h-10 w-10 place-items-center rounded-[14px] border transition-colors ${
                ambientMotionEnabled
                  ? 'border-cyan-200/20 bg-cyan-300/10 text-cyan-100'
                  : 'border-transparent bg-transparent text-white/35'
              }`}
              aria-label={ambientMotionEnabled ? 'Pausar rotación ambiental' : 'Activar rotación ambiental'}
              aria-pressed={ambientMotionEnabled}
              title={ambientMotionEnabled ? 'Rotación ambiental activa' : 'Rotación ambiental pausada'}
            >
              <RotateCw className="h-[18px] w-[18px]" />
            </button>
          </div>

          <motion.button
            type="button"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => openPanel('search')}
            className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-[390] flex min-h-[58px] items-center gap-3 rounded-[22px] border border-cyan-200/20 bg-[linear-gradient(135deg,rgba(5,18,29,0.92),rgba(4,12,20,0.88))] px-4 text-left shadow-[0_14px_38px_rgba(0,0,0,0.42),0_0_22px_rgba(34,211,238,0.09)] backdrop-blur-xl"
            aria-label="Buscar destino"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cyan-300/12 text-cyan-200">
              <Search className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-white">¿A dónde vas?</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[9px] text-white/42">
                <LocateFixed className="h-3 w-3 text-emerald-300" />
                Ruta desde tu ubicación
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-white/35" />
          </motion.button>
        </>
      )}

      <AnimatePresence>
        {mobilePanel && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[400] overflow-y-auto rounded-t-[30px] border-t border-cyan-200/15 bg-[linear-gradient(180deg,rgba(6,17,27,0.98),rgba(3,10,17,0.99))] shadow-[0_-22px_64px_rgba(0,0,0,0.52)] backdrop-blur-2xl styled-scrollbar"
            style={{ maxHeight: isSearchPanel ? 'min(58vh, calc(100dvh - 170px))' : 'min(68vh, calc(100dvh - 110px))', paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/26" />
            <div className={`px-3 pb-3 ${isSearchPanel ? 'pt-2' : ''}`}>
              {isSearchPanel ? (
                <div className="sticky top-0 z-10 -mx-3 mb-2 flex items-center justify-between border-b border-white/8 bg-[rgba(6,17,27,0.96)] px-4 py-1.5 backdrop-blur-2xl">
                  <div>
                    <div className="flex items-center gap-2 text-[8px] font-mono uppercase tracking-[0.22em] text-cyan-200">
                      <Navigation className="h-3.5 w-3.5" />
                      AEGIS GPS
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold text-white">Destino y ruta</div>
                  </div>
                  <button type="button" onClick={() => onTogglePanel('search')} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-white/65" aria-label="Cerrar navegación">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : isReconPanel ? (
                <div className="sticky top-0 z-10 -mx-3 mb-2 flex items-center justify-between border-b border-white/8 bg-[rgba(6,17,27,0.96)] px-4 py-2 backdrop-blur-2xl">
                  <div>
                    <div className="flex items-center gap-2 text-[8px] font-mono uppercase tracking-[0.22em] text-cyan-200">
                      <Satellite className="h-3.5 w-3.5" />
                      AEGIS RECON
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold text-white">Inteligencia de fuentes públicas</div>
                  </div>
                  <button type="button" onClick={() => onTogglePanel('recon')} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-white/65" aria-label="Cerrar reconocimiento">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : headerSummary}
              {mobilePanel === 'layers' && layersContent}
              {mobilePanel === 'markets' && marketsContent}
              {mobilePanel === 'intel' && intelContent}
              {mobilePanel === 'alerts' && alertsContent}
              {mobilePanel === 'search' && searchContent}
              {mobilePanel === 'recon' && reconContent}
              {!isSearchPanel && activeTab && <span className="sr-only">{activeTab.label}</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
