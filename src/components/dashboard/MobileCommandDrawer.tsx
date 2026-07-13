'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronUp, LocateFixed, Map, Search, Settings2, Satellite, X } from 'lucide-react';
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

  const openPanel = (panel: MobilePanel) => {
    setMenuOpen(false);
    onTogglePanel(panel);
  };

  return (
    <>
      {!mobilePanel && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => openPanel('search')}
          className="fixed left-4 right-4 top-[max(1rem,env(safe-area-inset-top))] z-[390] flex min-h-[64px] items-center gap-3 rounded-[22px] border border-cyan-200/20 bg-[linear-gradient(135deg,rgba(5,18,29,0.94),rgba(5,12,21,0.90))] px-4 text-left shadow-[0_16px_44px_rgba(0,0,0,0.38),0_0_24px_rgba(34,211,238,0.10)] backdrop-blur-xl"
          aria-label="Buscar destino"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-300 text-[#031019] shadow-[0_0_20px_rgba(34,211,238,0.28)]">
            <Search className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-white">¿A dónde vas?</span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-cyan-100/60">
              <LocateFixed className="h-3 w-3 text-emerald-300" />
              Desde tu ubicación actual
            </span>
          </span>
          <ChevronUp className="h-5 w-5 rotate-90 text-white/45" />
        </motion.button>
      )}

      {!mobilePanel && (
        <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-[391] flex flex-col items-end gap-2">
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                className="w-[min(19rem,calc(100vw-2rem))] rounded-[24px] border border-white/12 bg-[rgba(4,13,22,0.94)] p-3 shadow-[0_22px_60px_rgba(0,0,0,0.48)] backdrop-blur-xl"
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <div>
                    <div className="text-[8px] font-mono uppercase tracking-[0.24em] text-cyan-200">Controles</div>
                    <div className="mt-1 text-[12px] font-semibold text-white">Vista y herramientas</div>
                  </div>
                  <button type="button" onClick={() => setMenuOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/60" aria-label="Cerrar controles">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={onToggleProjection} className="flex min-h-[54px] items-center gap-2 rounded-2xl border border-cyan-300/18 bg-cyan-300/[0.07] px-3 text-left">
                    <Map className="h-4 w-4 text-cyan-200" />
                    <span><span className="block text-[10px] font-semibold text-white">{isGlobeView ? 'Globo 3D' : 'Mapa 2D'}</span><span className="block text-[8px] text-white/45">Cambiar vista</span></span>
                  </button>
                  <button type="button" onClick={onToggleMapStyle} className="flex min-h-[54px] items-center gap-2 rounded-2xl border border-emerald-300/18 bg-emerald-300/[0.06] px-3 text-left">
                    <Satellite className="h-4 w-4 text-emerald-200" />
                    <span><span className="block text-[10px] font-semibold text-white">{isSatelliteView ? 'Satélite' : 'Tierra'}</span><span className="block text-[8px] text-white/45">Color del mapa</span></span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {mobileNavTabs.filter((tab) => tab.id !== 'search').map((tab) => (
                    <button key={tab.id} type="button" onClick={() => openPanel(tab.id)} className="flex min-h-[48px] items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.035] px-3 text-left transition-colors active:bg-white/[0.09]">
                      <tab.icon className={`h-4 w-4 ${tab.accent ? 'text-cyan-300' : 'text-white/65'}`} />
                      <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-white/80">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className={`grid h-14 w-14 place-items-center rounded-full border shadow-[0_14px_35px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-colors ${menuOpen ? 'border-cyan-300/45 bg-cyan-300 text-[#04121c]' : 'border-white/15 bg-[rgba(5,15,25,0.90)] text-cyan-100'}`}
            aria-label="Abrir vista y configuración"
          >
            <Settings2 className="h-5 w-5" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {mobilePanel && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[400] overflow-y-auto rounded-t-[28px] border-t border-cyan-200/15 bg-[linear-gradient(180deg,rgba(6,17,27,0.97),rgba(3,10,17,0.98))] shadow-[0_-20px_60px_rgba(0,0,0,0.48)] backdrop-blur-xl styled-scrollbar"
            style={{ maxHeight: isSearchPanel ? 'min(76vh, calc(100dvh - 88px))' : 'min(68vh, calc(100dvh - 96px))', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/20" />
            <div className={`px-3 pb-3 ${isSearchPanel ? 'pt-2' : ''}`}>
              {isSearchPanel ? (
                <div className="sticky top-0 z-10 -mx-3 mb-2 flex items-center justify-between border-b border-white/8 bg-[rgba(6,17,27,0.94)] px-4 py-2 backdrop-blur-xl">
                  <div>
                    <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-cyan-200">Navegación</div>
                    <div className="mt-0.5 text-[12px] font-semibold text-white">Elige tu destino</div>
                  </div>
                  <button type="button" onClick={() => onTogglePanel('search')} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-white/65" aria-label="Cerrar navegación">
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
