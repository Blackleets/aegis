'use client';

import { useEffect, useState } from 'react';

function navigationIsActive() {
  return Boolean(document.querySelector('[aria-label="Pausar navegación"]'));
}

export default function MobileSpeedOverlay() {
  const [active, setActive] = useState(false);
  const [speedKmh, setSpeedKmh] = useState<number | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'acquiring' | 'live' | 'degraded' | 'denied' | 'unavailable'>('idle');

  useEffect(() => {
    const sync = () => setActive(navigationIsActive());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!active) {
      setSpeedKmh(null);
      setAccuracyMeters(null);
      setStatus('idle');
      return;
    }
    if (!navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    setStatus('acquiring');
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null;
        const speed = typeof position.coords.speed === 'number' && Number.isFinite(position.coords.speed)
          ? Math.max(0, position.coords.speed * 3.6)
          : null;
        setAccuracyMeters(accuracy);
        setSpeedKmh(speed);
        setStatus(accuracy !== null && accuracy > 40 ? 'degraded' : 'live');
      },
      (error) => {
        setSpeedKmh(null);
        setAccuracyMeters(null);
        setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, maximumAge: 2_000, timeout: 12_000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [active]);

  if (!active) return null;

  const gpsLabel = status === 'acquiring'
    ? 'Buscando GPS'
    : status === 'denied'
      ? 'Sin permiso'
      : status === 'unavailable'
        ? 'Sin señal'
        : status === 'degraded'
          ? 'GPS débil'
          : accuracyMeters === null
            ? 'GPS activo'
            : accuracyMeters <= 15
              ? 'GPS preciso'
              : `±${Math.round(accuracyMeters)} m`;
  const warning = status === 'denied' || status === 'unavailable' || status === 'degraded';

  return (
    <aside
      className={`pointer-events-none fixed bottom-[calc(5.45rem+env(safe-area-inset-bottom))] right-3 z-[364] flex min-w-[4.8rem] flex-col items-center rounded-2xl border px-2.5 py-2 text-center shadow-[0_12px_32px_rgba(0,0,0,0.34)] backdrop-blur-xl md:hidden ${warning ? 'border-amber-200/28 bg-[rgba(37,27,12,0.9)]' : 'border-cyan-200/24 bg-[rgba(5,20,30,0.9)]'}`}
      aria-label={`Velocidad ${speedKmh === null ? 'no disponible' : `${Math.round(speedKmh)} kilómetros por hora`}. ${gpsLabel}`}
    >
      <span className="text-[25px] font-bold leading-none tracking-[-0.05em] text-white tabular-nums">{speedKmh === null ? '—' : Math.round(speedKmh)}</span>
      <span className="mt-0.5 text-[7px] font-mono uppercase tracking-[0.18em] text-cyan-100/72">km/h</span>
      <span className={`mt-1 max-w-[5rem] truncate text-[7px] font-medium ${warning ? 'text-amber-200' : 'text-cyan-100/50'}`}>{gpsLabel}</span>
    </aside>
  );
}
