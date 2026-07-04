'use client';

import { AnimatePresence, motion } from 'framer-motion';
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
            style={{ maxHeight: mobilePanel === 'search' ? 'min(42vh, calc(100dvh - 130px))' : 'min(55vh, calc(100dvh - 100px))', paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}
          >
            <div className="mobile-drawer-handle" />
            <div className="px-3 pb-3">
              {headerSummary}
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
