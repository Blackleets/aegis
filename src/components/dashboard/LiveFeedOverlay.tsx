'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';

type LiveFeedOverlayProps = {
  liveFeedUrl: string | null;
  liveFeedName: string;
  liveFeedEmbedAllowed: boolean;
  liveStreamLabel: string;
  externalOnlyLabel: string;
  openInYouTubeLabel: string;
  watchUrl: string;
  onClose: () => void;
};

export default function LiveFeedOverlay({
  liveFeedUrl,
  liveFeedName,
  liveFeedEmbedAllowed,
  liveStreamLabel,
  externalOnlyLabel,
  openInYouTubeLabel,
  watchUrl,
  onClose,
}: LiveFeedOverlayProps) {
  return (
    <AnimatePresence>
      {liveFeedUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            className="w-[90vw] max-w-[900px] flex flex-col relative rounded-xl overflow-hidden border border-[var(--border-primary)] shadow-2xl bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#111] border-b border-[var(--border-primary)]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#FF4081] animate-aegis-pulse" />
                <span className="text-[12px] font-mono font-bold text-white tracking-wider">{liveFeedName}</span>
                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-mono text-[9px] font-bold">{liveStreamLabel}</span>
                {!liveFeedEmbedAllowed && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[9px]">{externalOnlyLabel}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--border-primary)] hover:bg-[var(--gold-primary)] hover:text-black text-white transition-colors text-[11px] font-mono">
                  <span>{openInYouTubeLabel}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {liveFeedEmbedAllowed ? (
              <div className="w-full aspect-video relative bg-black">
                <iframe src={liveFeedUrl} className="w-full h-full absolute inset-0" allow="autoplay; encrypted-media" allowFullScreen />
              </div>
            ) : (
              <div className="w-full aspect-video flex items-center justify-center bg-black/95">
                <div className="text-center px-8">
                  <div className="w-14 h-14 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center mx-auto mb-4">
                    <ExternalLink className="w-6 h-6 text-[#39FF14]" />
                  </div>
                  <p className="text-[13px] font-mono font-bold text-white tracking-widest mb-2">EMBED RESTRICTED</p>
                  <p className="text-[11px] font-mono text-white/50 mb-6 max-w-xs">
                    {liveFeedName} does not allow third-party embedding. Click below to open the live stream directly.
                  </p>
                  <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-2.5 rounded border border-[#39FF14]/40 text-[#39FF14] font-mono text-[12px] hover:bg-[#39FF14]/10 transition-colors tracking-wider">
                    <ExternalLink className="w-4 h-4" />
                    OPEN {liveStreamLabel}
                  </a>
                </div>
              </div>
            )}

            {liveFeedEmbedAllowed && (
              <div className="bg-[#111]/90 px-4 py-2.5 border-t border-[var(--border-primary)] flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[var(--gold-primary)] shrink-0" />
                <span className="text-[11px] font-mono text-white/70 leading-relaxed">
                  If you see &ldquo;Video unavailable&rdquo;, use <strong className="text-[var(--gold-primary)]">{openInYouTubeLabel}</strong> above.
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
