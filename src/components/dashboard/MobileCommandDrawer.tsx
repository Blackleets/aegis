'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, ChevronRight, LocateFixed, Map, Menu, Navigation, Search, Satellite, SlidersHorizontal, X } from 'lucide-react';
import { useState, type ComponentType, type ReactNode } from 'react';

type MobilePanel = 'layers' | 'markets' | 'intel' | 'search' | 'recon';
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
  searchContent: ReactNode;
  reconContent: ReactNode;
  headerSummary: ReactNode;
  isGlobeView: boolean;
  isSatelliteView: boolean;
  onToggleProjection: () => void;
  onToggleMapStyle: () => void;
};

export default function MobileCommandDrawer({
  mobileNavTabs,
  mobilePanel,
  onTogglePanel,
  layersContent,
  marketsContent,
  intelContent,
  searchContent,
  reconContent,
  headerSummary,
  isGlobeView,
  isSatelliteView,
  onToggleProjection,
  onToggleMapStyle,
}: MobileCommandDrawerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const activeTab = mobileNavTabs.find((tab) => tab.id === mobilePanel) ?? null;
  const isSearchPanel = mobilePanel === 'search';
  const layersTab = mobileNavTabs.find((tab) => tab.id === 'layers');
  const intelTab = mobileNavTabs.find((tab) => tab.id === 'intel');
  const reconTab = mobileNavTabs.find((tab) => tab.id === 'recon');

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
              className={`grid h-14 w-14 place-items-center rounded-[20px] border shadow-[0_12px_32px_rgba(0,0,0,0.38)] backdrop-blur-xl transition-all ${menuOpen ? 'border-cyan-200/40 bg-cyan-300 text-[#031019]' : 'border-white/15 bg-[rgba(5,15,25,0.91)] text-white'}`}
              aria-label="Abrir menú AEGIS"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-6 w-6" />}
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
                    <div className="mt-1.5 text-[14px] font-semibold text-white">Centro de control</div>
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

          <div className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-[391] flex flex-col gap-2.5">
            <button type="button" onClick={onToggleProjection} className="grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-[rgba(5,15,25,0.91)] text-cyan-100 shadow-[0_12px_30px_rgba(0,0,0,0.36)] backdrop-blur-xl" aria-label="Cambiar proyección">
              {isGlobeView ? <Navigation className="h-5 w-5 fill-cyan-200/20" /> : <Map className="h-5 w-5" />}
            </button>
            <button type="button" onClick={onToggleMapStyle} className="grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-[rgba(5,15,25,0.91)] text-emerald-200 shadow-[0_12px_30px_rgba(0,0,0,0.36)] backdrop-blur-xl" aria-label="Cambiar estilo del mapa">
              <Satellite className="h-5 w-5" />
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed inset-x-0 bottom-0 z-[390] rounded-t-[30px] border-t border-white/14 bg-[linear-gradient(180deg,rgba(7,17,27,0.95),rgba(3,10,17,0.98))] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-18px_54px_rgba(0,0,0,0.46)] backdrop-blur-2xl"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/28" />
            <button
              type="button"
              onClick={() => openPanel('search')}
              className="flex min-h-[62px] w-full items-center gap-3 rounded-[22px] border border-cyan-200/18 bg-white/[0.065] px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              aria-label="Buscar destino"
            >
              <Search className="h-6 w-6 shrink-0 text-cyan-200" strokeWidth={2.2} />
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-medium text-white">¿A dónde vas?</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[9px] text-white/42">
                  <LocateFixed className="h-3 w-3 text-emerald-300" />
                  Ruta desde tu ubicación
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-white/35" />
            </button>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {layersTab && (
                <button type="button" onClick={() => openPanel('layers')} className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-white/9 bg-white/[0.035] px-2 text-white/72">
                  <layersTab.icon className="h-4 w-4 text-cyan-200" />
                  <span className="text-[8px] font-mono uppercase tracking-[0.12em]">Capas</span>
                </button>
              )}
              {intelTab && (
                <button type="button" onClick={() => openPanel('intel')} className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-amber-300/12 bg-amber-300/[0.045] px-2 text-white/72">
                  <BellRing className="h-4 w-4 text-amber-200" />
                  <span className="text-[8px] font-mono uppercase tracking-[0.12em]">Alertas</span>
                </button>
              )}
              {reconTab && (
                <button type="button" onClick={() => openPanel('recon')} className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-cyan-300/12 bg-cyan-300/[0.045] px-2 text-white/72">
                  <SlidersHorizontal className="h-4 w-4 text-cyan-200" />
                  <span className="text-[8px] font-mono uppercase tracking-[0.12em]">Cortex</span>
                </button>
              )}
            </div>
          </motion.div>
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
            style={{ maxHeight: isSearchPanel ? 'min(79vh, calc(100dvh - 74px))' : 'min(72vh, calc(100dvh - 84px))', paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/26" />
            <div className={`px-3 pb-3 ${isSearchPanel ? 'pt-2' : ''}`}>
              {isSearchPanel ? (
                <div className="sticky top-0 z-10 -mx-3 mb-2 flex items-center justify-between border-b border-white/8 bg-[rgba(6,17,27,0.96)] px-4 py-2.5 backdrop-blur-2xl">
                  <div>
                    <div className="flex items-center gap-2 text-[8px] font-mono uppercase tracking-[0.22em] text-cyan-200">
                      <Navigation className="h-3.5 w-3.5" />
                      AEGIS GPS
                    </div>
                    <div className="mt-1 text-[13px] font-semibold text-white">Busca un destino</div>
                  </div>
                  <button type="button" onClick={() => onTogglePanel('search')} className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-white/65" aria-label="Cerrar navegación">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : headerSummary}
              {mobilePanel === 'layers' && layersContent}
              {mobilePanel === 'markets' && marketsContent}
              {mobilePanel === 'intel' && intelContent}
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
