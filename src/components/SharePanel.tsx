'use client';

import { memo, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Check, Link2, X, Globe, MapPin } from 'lucide-react';

interface SharePanelProps {
  mapView: { zoom: number; latitude: number; longitude?: number };
  activeLayers: Record<string, boolean>;
  mouseCoords?: { lat: number; lng: number } | null;
  enableShortcut?: boolean;
}

function SharePanel({ mapView, activeLayers, mouseCoords, enableShortcut = false }: SharePanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeLayerCount = useMemo(() => Object.values(activeLayers).filter(Boolean).length, [activeLayers]);

  const shareUrl = useMemo(() => {
    const params = new URLSearchParams();
    const lat = mouseCoords?.lat ?? mapView.latitude ?? 20;
    const lng = mouseCoords?.lng ?? mapView.longitude ?? 0;
    params.set('lat', lat.toFixed(4));
    params.set('lon', lng.toFixed(4));
    params.set('zoom', mapView.zoom.toFixed(2));

    const layerKeys = Object.entries(activeLayers)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(',');
    if (layerKeys) params.set('layers', layerKeys);

    const base = typeof window !== 'undefined' ? window.location.origin : 'https://aegis.blackleets.dev';
    return `${base}/?${params.toString()}`;
  }, [activeLayers, mapView, mouseCoords]);

  const scheduleCopiedReset = useCallback(() => {
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
  }, []);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      scheduleCopiedReset();
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      scheduleCopiedReset();
    }
  }, [scheduleCopiedReset, shareUrl]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    if (!enableShortcut || typeof window === 'undefined') return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isEditable = target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName ?? '');
      if (isEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 's') {
        setIsOpen(p => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enableShortcut]);

  return (
    <>
      {/* Share Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="glass-panel w-8 h-8 flex items-center justify-center pointer-events-auto hover:border-[var(--gold-primary)] transition-colors"
        title="Share view (S)"
      >
        <Share2 className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
      </motion.button>

      {/* Share Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-12 right-0 w-72 glass-panel p-4 pointer-events-auto aegis-glow z-[300]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
                <span className="hud-text text-[10px] text-[var(--text-primary)]">SHARE VIEW</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Current View Info */}
            <div className="mb-3 p-2 rounded-lg bg-[var(--bg-void)] border border-[var(--border-primary)]">
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin className="w-2.5 h-2.5 text-[var(--gold-primary)]" />
                <span className="text-[7px] font-mono text-[var(--text-muted)] tracking-widest">CURRENT VIEW</span>
              </div>
              <div className="text-[8px] font-mono text-[var(--text-secondary)]">
                {mouseCoords ? `${mouseCoords.lat.toFixed(4)}°, ${mouseCoords.lng.toFixed(4)}°` : '—'} · Zoom {mapView.zoom.toFixed(1)}
              </div>
              <div className="text-[7px] font-mono text-[var(--text-muted)] mt-1">
                {activeLayerCount} layers active
              </div>
            </div>

            {/* Share URL */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Link2 className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                <span className="text-[7px] font-mono text-[var(--text-muted)] tracking-widest">SHAREABLE LINK</span>
              </div>
              <div className="flex gap-1.5">
                <div className="flex-1 p-1.5 rounded bg-[var(--bg-void)] border border-[var(--border-primary)] text-[7px] font-mono text-[var(--gold-primary)] truncate">
                  {shareUrl}
                </div>
                <button
                  onClick={copyToClipboard}
                  className={`px-3 py-1.5 rounded text-[7px] font-mono tracking-widest transition-all ${copied ? 'bg-[var(--alert-green)]/20 text-[var(--alert-green)] border border-[var(--alert-green)]/30' : 'bg-[var(--gold-primary)]/10 text-[var(--gold-primary)] border border-[var(--gold-primary)]/30 hover:bg-[var(--gold-primary)]/20'}`}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Quick Share */}
            <div className="flex gap-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('AEGIS — Verified Global Intelligence Surface')}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center py-1.5 rounded text-[7px] font-mono tracking-wider text-[var(--text-muted)] border border-[var(--border-primary)] hover:border-[#1DA1F2] hover:text-[#1DA1F2] transition-colors"
              >
                𝕏 POST
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center py-1.5 rounded text-[7px] font-mono tracking-wider text-[var(--text-muted)] border border-[var(--border-primary)] hover:border-[#0A66C2] hover:text-[#0A66C2] transition-colors"
              >
                IN SHARE
              </a>
              <a
                href={`https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent('AEGIS — Verified Global Intelligence Surface')}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center py-1.5 rounded text-[7px] font-mono tracking-wider text-[var(--text-muted)] border border-[var(--border-primary)] hover:border-[#FF4500] hover:text-[#FF4500] transition-colors"
              >
                REDDIT
              </a>
            </div>

            <div className="mt-3 text-center text-[6px] font-mono text-[var(--text-muted)] tracking-widest">
              PRESS [S] TO TOGGLE · SHAREABLE LINKS PRESERVE VIEW STATE
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(SharePanel);
