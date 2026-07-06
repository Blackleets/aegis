'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

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
}: MobileCommandDrawerProps) {
  const activeTab = mobileNavTabs.find((tab) => tab.id === mobilePanel) ?? null;
  const isSearchPanel = mobilePanel === 'search';

  return (
    <>
      <div className="mobile-nav">
        <div className="glass-panel mobile-nav-inner">
          {mobileNavTabs.map((tab) => (
            <button key={tab.id} onClick={() => onTogglePanel(tab.id)} className={`mobile-nav-btn ${mobilePanel === tab.id ? 'active' : ''}`}>
              <tab.icon className={`w-4 h-4 ${tab.accent ? 'text-[var(--cyan-primary)]' : ''}`} />
              <span className={tab.accent ? 'text-[var(--cyan-primary)]' : ''}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {mobilePanel && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-[52px] left-0 right-0 z-[400] glass-panel rounded-b-none overflow-y-auto styled-scrollbar"
            style={{ maxHeight: mobilePanel === 'search' ? 'min(68vh, calc(100dvh - 96px))' : 'min(55vh, calc(100dvh - 100px))', paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}
          >
            <div className="mobile-drawer-handle" />
            <div className={`px-3 pb-3 ${isSearchPanel ? 'pt-1' : ''}`}>
              {isSearchPanel ? (
                <div className="sticky top-0 z-10 -mx-3 mb-2 border-b border-[var(--border-primary)]/18 bg-[linear-gradient(180deg,rgba(10,18,25,0.94),rgba(10,18,25,0.78))] px-3 pb-1.5 pt-0.5 backdrop-blur-md">
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/14 bg-cyan-300/[0.05] px-2.5 py-1 text-[7px] font-mono uppercase tracking-[0.2em] text-cyan-100/88">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
                      {activeTab?.label ?? 'GPS'}
                    </div>
                    <button onClick={() => onTogglePanel('search')} className="rounded-full border border-white/10 bg-white/[0.03] p-1.5 text-[var(--text-muted)] transition-colors hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                headerSummary
              )}
              {mobilePanel === 'layers' && layersContent}
              {mobilePanel === 'markets' && marketsContent}
              {mobilePanel === 'intel' && intelContent}
              {mobilePanel === 'search' && searchContent}
              {mobilePanel === 'recon' && reconContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
