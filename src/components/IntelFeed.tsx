'use client';

import { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollText, ChevronDown, ChevronUp, ExternalLink, MapPin, Sparkles } from 'lucide-react';


interface IntelFeedItem {
  id: string;
  title: string;
  description?: string;
  link?: string;
  published: string;
  source: string;
  risk_score: number;
  coords: [number, number] | null;
  machine_assessment?: string | null;
}

interface IntelFeedProps {
  data: {
    news?: IntelFeedItem[];
  };
  onLocate?: (lat: number, lng: number) => void;
  feedFreshness?: number;
}

function getRiskTone(score: number) {
  if (score >= 8) return { label: 'Priority', className: 'bg-rose-500/12 text-rose-300 border-rose-500/20' };
  if (score >= 6) return { label: 'Watch', className: 'bg-amber-500/12 text-amber-300 border-amber-500/20' };
  if (score >= 4) return { label: 'Track', className: 'bg-sky-500/12 text-sky-300 border-sky-500/20' };
  return { label: 'Brief', className: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/20' };
}

function timeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return '';
  }
}

function feedTimeAgo(timestamp?: number): string {
  if (!timestamp) return 'awaiting';
  const diff = Math.max(0, Date.now() - timestamp);
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function IntelFeed({ data, onLocate, feedFreshness }: IntelFeedProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const news = useMemo(() => data.news || [], [data.news]);

  const summary = useMemo(() => {
    const priority = news.filter((item) => item.risk_score >= 8).length;
    const watch = news.filter((item) => item.risk_score >= 6 && item.risk_score < 8).length;
    return { priority, watch };
  }, [news]);

  const latestPublished = useMemo(
    () => news.reduce<number | null>((latest, item) => {
      const ts = new Date(item.published).getTime();
      if (!Number.isFinite(ts)) return latest;
      return latest == null || ts > latest ? ts : latest;
    }, null),
    [news],
  );

  const liveStatus = feedTimeAgo(feedFreshness ?? latestPublished ?? undefined);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.6 }}
      className="glass-panel pointer-events-auto overflow-hidden border border-[var(--border-primary)]/70 bg-[linear-gradient(180deg,rgba(15,24,33,0.96),rgba(19,30,43,0.9))]"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-[var(--border-primary)]/60 bg-white/[0.04]">
            <ScrollText className="h-4 w-4 text-[var(--gold-primary)]" />
          </div>
          <div className="text-left">
            <div className="text-[8px] font-mono uppercase tracking-[0.3em] text-[var(--text-muted)]">Editorial stream</div>
            <div className="mt-1 text-[13px] font-semibold tracking-[0.08em] text-[var(--text-primary)]">Signal Ledger</div>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            {news.length} items
          </span>
        </div>
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <span className="rounded-full border border-[var(--gold-primary)]/18 bg-[var(--gold-primary)]/10 px-2 py-1 text-[8px] font-mono uppercase tracking-[0.16em] text-[var(--gold-primary)]">
            live {liveStatus}
          </span>
          <div className="h-2 w-2 rounded-full bg-[var(--gold-primary)] shadow-[0_0_10px_rgba(126,169,201,0.6)]" />
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="grid grid-cols-2 gap-2 px-4 pb-3">
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2.5">
                <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">Priority signals</div>
                <div className="mt-1 text-[16px] font-semibold text-rose-300">{summary.priority}</div>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2.5">
                <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">Watchlist</div>
                <div className="mt-1 text-[16px] font-semibold text-amber-300">{summary.watch}</div>
              </div>
            </div>

            <div className="max-h-[430px] overflow-y-auto styled-scrollbar px-3 pb-3">
              {news.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-[10px] font-mono uppercase tracking-[0.24em] text-[var(--text-muted)]">
                  Awaiting fresh signals...
                </div>
              ) : (
                <div className="space-y-2">
                  {news.slice(0, 25).map((item, index) => {
                    const tone = getRiskTone(item.risk_score);
                    const isExpanded = selectedIdx === index;

                    return (
                      <div
                        key={item.id || `${item.title}-${index}`}
                        role="button"
                        tabIndex={0}
                        className="rounded-2xl border border-white/6 bg-white/[0.03] px-3.5 py-3 transition-colors hover:bg-white/[0.05]"
                        onClick={() => {
                          if (item.link) window.open(item.link, '_blank', 'noopener,noreferrer');
                          else setSelectedIdx(isExpanded ? null : index);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && item.link) window.open(item.link, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.18em] ${tone.className}`}>
                            {tone.label}
                          </span>
                          <span className="rounded-full bg-[var(--bg-tertiary)] px-2 py-1 text-[8px] font-mono uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                            {item.source}
                          </span>
                          <span className="ml-auto text-[8px] font-mono uppercase tracking-[0.16em] text-[var(--text-muted)]">
                            {timeAgo(item.published)}
                          </span>
                        </div>

                        <h4 className="mt-2 text-[12px] font-semibold leading-snug text-[var(--text-primary)]">
                          {item.title}
                        </h4>

                        {item.description && (
                          <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-[var(--text-secondary)]">
                            {item.description}
                          </p>
                        )}

                        <div className="mt-2 flex items-center justify-between gap-2">
                          {item.machine_assessment ? (
                            <div className="flex min-w-0 items-start gap-1.5 rounded-2xl border border-sky-400/14 bg-sky-400/8 px-2.5 py-2 text-[9px] leading-relaxed text-sky-200">
                              <Sparkles className="mt-0.5 h-3 w-3 flex-shrink-0" />
                              <span className="line-clamp-2">{item.machine_assessment}</span>
                            </div>
                          ) : <div />}

                          <div className="flex items-center gap-2">
                            {item.coords && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onLocate?.(item.coords[0], item.coords[1]);
                                }}
                                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)] hover:text-[var(--cyan-primary)]"
                              >
                                <MapPin className="h-3 w-3" />
                                Locate
                              </button>
                            )}

                            {item.link && (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)] hover:text-[var(--cyan-primary)]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="h-3 w-3" />
                                Source
                              </a>
                            )}
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && item.link && !item.description && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="mt-2 text-[9px] text-[var(--text-muted)]">Open source article for full context.</div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default memo(IntelFeed);
