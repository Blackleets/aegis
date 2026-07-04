'use client';

import type { ReactNode, RefObject } from 'react';
import { motion } from 'framer-motion';
import { Database, Layers } from 'lucide-react';

type BottomDesktopHudProps = {
  showDesktopBottomBar: boolean;
  coordsDisplayRef: RefObject<HTMLDivElement | null>;
  locationLabel: string | null;
  zoom: number;
  activeLayerCount: number;
  entityCount: ReactNode;
  scaleBar: ReactNode;
};

export default function BottomDesktopHud({
  showDesktopBottomBar,
  coordsDisplayRef,
  locationLabel,
  zoom,
  activeLayerCount,
  entityCount,
  scaleBar,
}: BottomDesktopHudProps) {
  if (!showDesktopBottomBar) return null;

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3, duration: 0.8 }} className="desktop-only absolute bottom-5 left-1/2 -translate-x-1/2 z-[200] pointer-events-auto">
        <div className="glass-panel px-5 py-2.5 flex items-center gap-0 aegis-glow relative overflow-hidden" style={{ borderImage: 'linear-gradient(90deg, rgba(212,175,55,0.05), rgba(212,175,55,0.2), rgba(212,175,55,0.05)) 1', borderImageSlice: 1, borderWidth: '1px', borderStyle: 'solid' }}>
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div className="absolute top-0 bottom-0 w-[60px] bg-gradient-to-r from-transparent via-[var(--gold-primary)]/[0.07] to-transparent" style={{ animation: 'hud-scanline 4s ease-in-out infinite' }} />
          </div>
          <div className="flex flex-col items-center min-w-[110px] px-3">
            <div className="hud-label">COORDINATES</div>
            <div ref={coordsDisplayRef} className="text-[10px] font-mono font-bold text-[var(--gold-primary)] tracking-wide tabular-nums">—</div>
          </div>
          <div className="w-px h-8 bg-gradient-to-b from-transparent via-[var(--border-primary)] to-transparent flex-shrink-0" />
          <div className="flex flex-col items-center min-w-[160px] max-w-[280px] px-3">
            <div className="hud-label">LOCATION</div>
            <div className="text-[9px] text-[var(--text-secondary)] font-mono truncate max-w-[280px]">{locationLabel || 'Hover over map...'}</div>
          </div>
          <div className="w-px h-8 bg-gradient-to-b from-transparent via-[var(--border-primary)] to-transparent flex-shrink-0" />
          <div className="flex flex-col items-center px-3">
            <div className="hud-label">ZOOM</div>
            <div className="text-[10px] font-mono font-bold text-[var(--gold-primary)] tabular-nums">{zoom.toFixed(1)}</div>
          </div>
          <div className="w-px h-8 bg-gradient-to-b from-transparent via-[var(--border-primary)] to-transparent flex-shrink-0" />
          <div className="flex flex-col items-center px-3 min-w-[60px]">
            <div className="hud-label">ACTIVE LAYERS</div>
            <div className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-[var(--gold-primary)]" />
              <span className="text-[10px] font-mono font-bold text-[var(--gold-primary)] tabular-nums">{activeLayerCount}</span>
            </div>
          </div>
          <div className="w-px h-8 bg-gradient-to-b from-transparent via-[var(--border-primary)] to-transparent flex-shrink-0" />
          <div className="flex flex-col items-center px-3 min-w-[70px]">
            <div className="hud-label">ENTITIES</div>
            <div className="flex items-center gap-1">
              <Database className="w-3 h-3 text-[var(--alert-green)]" />
              {entityCount}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="desktop-only absolute bottom-[4.5rem] left-[18.5rem] xl:left-[20rem] z-[201] pointer-events-none">
        {scaleBar}
      </div>
    </>
  );
}
