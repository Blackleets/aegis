'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, MapPin } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   AEGIS — Search / Locate Bar
   Coordinate and place name search with geocoding
   ═══════════════════════════════════════════════════════════════ */

export interface SearchResult {
  label: string;
  lat: number;
  lng: number;
  bbox?: [west: number, south: number, east: number, north: number] | null;
  zoom?: number;
  kind?: string;
}

interface SearchBarProps {
  onLocate: (result: SearchResult) => void;
}

export default function SearchBar({ onLocate }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const parseCoords = (s: string): { lat: number; lng: number } | null => {
    const m = s.trim().match(/^([+-]?\d+\.?\d*)[,\s]+([+-]?\d+\.?\d*)$/);
    if (!m) return null;
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
    return null;
  };

  const handleSearch = useCallback(async (q: string) => {
    setValue(q);
    const coords = parseCoords(q);
    if (coords) {
      setResults([{ label: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`, ...coords, zoom: 12, kind: 'coordinates' }]);
      setLoading(false);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&limit=6`);
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, []);

  const resetAndClose = () => {
    setOpen(false);
    setValue('');
    setResults([]);
    setLoading(false);
  };

  const handleSelect = (r: SearchResult) => {
    onLocate(r);
    resetAndClose();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 glass-panel-sm px-3 py-2 text-[9px] font-mono tracking-[0.15em] text-[var(--text-muted)] hover:text-[var(--gold-primary)] hover:border-[var(--border-active)] transition-all hover:shadow-[0_0_12px_rgba(212,175,55,0.08)]"
      >
        <Search className="w-3 h-3" />
        LOCATE TARGET
      </button>
    );
  }

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 glass-panel px-3 py-2.5 !border-[var(--border-active)]">
        <Search className="w-3.5 h-3.5 text-[var(--gold-primary)] flex-shrink-0" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => void handleSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') resetAndClose();
            if (e.key === 'Enter' && results.length > 0) handleSelect(results[0]);
          }}
          placeholder="ENTER COUNTRY, CITY, ADDRESS OR COORDINATES..."
          className="flex-1 bg-transparent text-[10px] text-[var(--text-primary)] font-mono tracking-wider outline-none placeholder:text-[var(--text-muted)]"
        />
        {loading && <div className="w-3 h-3 border border-[var(--gold-primary)] border-t-transparent rounded-full animate-spin" />}
        <button onClick={resetAndClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <X className="w-3 h-3" />
        </button>
      </div>

      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 glass-panel overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)] max-h-[220px] overflow-y-auto styled-scrollbar z-50">
          {results.map((r, i) => (
            <button
              key={`${r.label}-${i}`}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2.5 hover:bg-[var(--hover-accent)] transition-colors border-b border-[var(--border-secondary)] last:border-0 flex items-start gap-2"
            >
              <MapPin className="mt-0.5 w-3 h-3 text-[var(--gold-primary)] flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[9px] text-[var(--text-secondary)] font-mono truncate">{r.label}</div>
                <div className="mt-0.5 text-[7px] font-mono uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  {(r.kind || 'place').replace(/_/g, ' ')} · {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
