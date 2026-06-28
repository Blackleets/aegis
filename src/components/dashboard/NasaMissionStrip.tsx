'use client';

import { motion } from 'framer-motion';
import { ExternalLink, Orbit, Radio, TriangleAlert } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { getDashboardCopy } from '@/lib/i18n';

export type NasaEventItem = {
  id: string;
  title: string;
  category: string;
  source: string;
  date?: string;
  link?: string;
};

type NasaMissionStripProps = {
  locale: Locale;
  events: NasaEventItem[];
  source?: string;
  updatedAt?: string;
  totalOpen?: number;
};

function formatUtc(date: string | undefined, locale: Locale) {
  if (!date) return '—';
  try {
    return new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(new Date(date));
  } catch {
    return date;
  }
}

export default function NasaMissionStrip({ locale, events, source, updatedAt, totalOpen }: NasaMissionStripProps) {
  const copy = getDashboardCopy(locale).nasa;
  const topEvents = events.slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 3.05, duration: 0.45 }}
      className="shrink-0 pointer-events-auto"
    >
      <div className="glass-panel pointer-events-auto overflow-hidden border border-[var(--border-primary)]/80 bg-[linear-gradient(145deg,rgba(10,18,28,0.96),rgba(17,29,44,0.92))] shadow-[0_18px_56px_rgba(0,0,0,0.22)]">
        <div className="flex items-center justify-between border-b border-white/8 px-3.5 py-2.5">
          <div>
            <div className="flex items-center gap-1.5 text-[8px] font-mono tracking-[0.28em] text-[var(--cyan-primary)]">
              <Orbit className="h-3 w-3" />
              {copy.strap}
            </div>
            <div className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-[var(--text-primary)]">{copy.title}</div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[7px] font-mono tracking-[0.18em] text-[var(--text-secondary)]">
            {copy.liveOpen} <span className="ml-1 font-bold text-[var(--gold-primary)]">{totalOpen ?? events.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-b border-white/8 px-3.5 py-2 text-[7px] font-mono tracking-[0.16em] text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5">
            <Radio className="h-3 w-3 text-[var(--alert-green)]" />
            {copy.source}: <span className="text-[var(--text-primary)]">{source || copy.sourceName}</span>
          </div>
          <div className="text-right">
            {copy.updated}: <span className="text-[var(--text-primary)]">{formatUtc(updatedAt, locale)}</span>
          </div>
        </div>

        <div className="space-y-2 px-3.5 py-3">
          {topEvents.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[10px] text-[var(--text-secondary)]">
              {copy.loading}
            </div>
          ) : (
            topEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[10px] font-semibold tracking-[0.04em] text-[var(--text-primary)]">{event.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[7px] font-mono tracking-[0.16em] text-[var(--text-muted)]">
                      <span className="rounded-full border border-white/8 bg-black/20 px-2 py-0.5">{event.category || copy.categoryFallback}</span>
                      <span>{formatUtc(event.date, locale)} UTC</span>
                    </div>
                  </div>
                  {event.link ? (
                    <a
                      href={event.link}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-full border border-[var(--cyan-primary)]/20 bg-[var(--cyan-primary)]/8 px-2 py-1 text-[7px] font-mono tracking-[0.18em] text-[var(--cyan-primary)] transition-opacity hover:opacity-80"
                    >
                      <ExternalLink className="inline h-3 w-3" />
                    </a>
                  ) : (
                    <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-[var(--gold-primary)]" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
