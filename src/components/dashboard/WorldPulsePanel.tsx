'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, MapPin, RadioTower, RefreshCw } from 'lucide-react';

type PulseSeverity = 'info' | 'watch' | 'elevated' | 'critical';

type PulseEvent = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  severity: PulseSeverity;
  lat: number;
  lng: number;
  observed_at: string;
  source: string;
  source_url: string | null;
};

type PulsePayload = {
  status: 'ok' | 'degraded' | 'unavailable';
  fetched_at?: string;
  sources?: Array<{ name: string; status: string; count: number }>;
  events?: PulseEvent[];
};

const SEVERITY_CLASS: Record<PulseSeverity, string> = {
  critical: 'border-rose-300/25 bg-rose-300/[0.07] text-rose-50',
  elevated: 'border-amber-200/20 bg-amber-200/[0.06] text-amber-50',
  watch: 'border-cyan-200/18 bg-cyan-200/[0.05] text-cyan-50',
  info: 'border-white/10 bg-white/[0.03] text-white/85',
};

const KIND_LABEL: Record<string, string> = {
  earthquake: 'Sismo',
  wildfire: 'Fuego',
  volcano: 'Volcán',
  storm: 'Tormenta',
  flood: 'Inundación',
  conflict: 'Conflicto',
  other: 'Otro',
};

const KIND_FILTERS = ['all', 'earthquake', 'storm', 'wildfire', 'volcano', 'flood'] as const;

function relativeTime(iso: string) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const minutes = Math.max(0, Math.round((Date.now() - ms) / 60_000));
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

export default function WorldPulsePanel({
  onLocate,
}: {
  onLocate: (lat: number, lng: number) => void;
}) {
  const [payload, setPayload] = useState<PulsePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<(typeof KIND_FILTERS)[number]>('all');

  const refresh = useCallback(async (options?: { showSpinner?: boolean }) => {
    const showSpinner = options?.showSpinner === true;
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/world-pulse', { cache: 'no-store' });
      const json = await response.json() as PulsePayload;
      if (!response.ok && json.status === 'unavailable') {
        setPayload(json);
        setError('Fuentes globales no disponibles ahora');
      } else {
        setPayload(json);
      }
    } catch {
      setError('No se pudo cargar World Pulse');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      try {
        const response = await fetch('/api/world-pulse', { cache: 'no-store' });
        const json = await response.json() as PulsePayload;
        if (cancelled) return;
        if (!response.ok && json.status === 'unavailable') {
          setPayload(json);
          setError('Fuentes globales no disponibles ahora');
        } else {
          setPayload(json);
        }
      } catch {
        if (!cancelled) {
          setError('No se pudo cargar World Pulse');
          setPayload(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void boot();
    const timer = window.setInterval(() => {
      void refresh({ showSpinner: false });
    }, 180_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [refresh]);

  const events = useMemo(() => {
    const all = payload?.events ?? [];
    if (kindFilter === 'all') return all;
    return all.filter((event) => event.kind === kindFilter);
  }, [kindFilter, payload?.events]);

  const sourceLabel = (payload?.sources || [])
    .map((source) => `${source.name}:${source.status}`)
    .join(' · ');

  return (
    <section className="mb-3 rounded-2xl border border-white/9 bg-white/[0.025] p-2.5" aria-label="World Pulse">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[8px] font-mono uppercase tracking-[0.2em] text-cyan-200">
            <RadioTower className="h-3 w-3" /> World Pulse
          </p>
          <p className="mt-1 text-[11px] font-semibold text-white">
            {loading && !payload ? 'Sincronizando Tierra…' : `${events.length} eventos en vivo`}
          </p>
          <p className="mt-1 max-w-[18rem] truncate text-[8px] text-white/40">
            {payload?.status === 'degraded' ? 'Degradado · ' : ''}
            {payload?.fetched_at ? `Act. ${relativeTime(payload.fetched_at)} · ` : ''}
            {sourceLabel || 'USGS · EONET · FIRMS · GDACS'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh({ showSpinner: true })}
          className="flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-white/70"
          aria-label="Actualizar World Pulse"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {KIND_FILTERS.map((kind) => {
          const active = kindFilter === kind;
          const label = kind === 'all' ? 'Todos' : (KIND_LABEL[kind] || kind);
          return (
            <button
              key={kind}
              type="button"
              onClick={() => setKindFilter(kind)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.08em] ${
                active
                  ? 'border-cyan-300/35 bg-cyan-300/15 text-cyan-100'
                  : 'border-white/10 bg-white/[0.03] text-white/45'
              }`}
              aria-pressed={active}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-2 rounded-xl border border-amber-200/15 bg-amber-200/[0.05] px-3 py-2 text-[9px] text-amber-100/80">
          {error}
        </p>
      )}

      <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto">
        {events.slice(0, 14).map((event) => (
          <article key={event.id} className={`rounded-xl border px-2.5 py-2 ${SEVERITY_CLASS[event.severity]}`}>
            <div className="flex items-center justify-between gap-2 text-[7px] font-mono uppercase tracking-[0.12em] opacity-60">
              <span>{KIND_LABEL[event.kind] || event.kind} · {event.source}</span>
              <span>{relativeTime(event.observed_at) || event.severity}</span>
            </div>
            <p className="mt-1 text-[10px] font-semibold leading-snug">{event.title}</p>
            <p className="mt-0.5 text-[8px] opacity-55">{event.detail}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => onLocate(event.lat, event.lng)}
                className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-2 text-[8px] font-semibold uppercase tracking-[0.08em]"
              >
                <MapPin className="h-3.5 w-3.5" /> Ver en mapa
              </button>
              {event.source_url && (
                <a
                  href={event.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-white/10 bg-black/20"
                  aria-label="Abrir fuente"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </article>
        ))}
        {!loading && events.length === 0 && !error && (
          <p className="rounded-xl border border-white/7 bg-black/10 px-3 py-4 text-center text-[9px] text-white/45">
            Sin eventos verificables en este momento.
          </p>
        )}
      </div>
    </section>
  );
}
