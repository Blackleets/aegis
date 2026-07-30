'use client';

type MobileSpeedReadoutProps = {
  speedKmh: number | null;
  gpsAccuracyMeters: number | null;
  gpsSignalStatus: 'idle' | 'acquiring' | 'live' | 'degraded' | 'denied' | 'unavailable';
};

function getGpsLabel(status: MobileSpeedReadoutProps['gpsSignalStatus'], accuracyMeters: number | null) {
  if (status === 'acquiring') return 'Buscando GPS';
  if (status === 'denied') return 'GPS sin permiso';
  if (status === 'unavailable') return 'GPS sin señal';
  if (status === 'degraded') return accuracyMeters === null ? 'GPS débil' : `GPS ±${Math.round(accuracyMeters)} m`;
  if (accuracyMeters === null) return 'GPS preparado';
  if (accuracyMeters <= 15) return 'GPS preciso';
  return `GPS ±${Math.round(accuracyMeters)} m`;
}

export default function MobileSpeedReadout({ speedKmh, gpsAccuracyMeters, gpsSignalStatus }: MobileSpeedReadoutProps) {
  const unavailable = gpsSignalStatus === 'denied' || gpsSignalStatus === 'unavailable';
  return (
    <div className={`flex min-w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-2xl border px-2.5 py-1.5 text-center ${unavailable ? 'border-amber-200/24 bg-amber-200/[0.08]' : 'border-cyan-200/20 bg-cyan-300/[0.09]'}`} aria-label={`Velocidad ${speedKmh === null ? 'no disponible' : `${Math.round(speedKmh)} kilómetros por hora`}. ${getGpsLabel(gpsSignalStatus, gpsAccuracyMeters)}`}>
      <span className="text-[22px] font-bold leading-none tracking-[-0.05em] text-white tabular-nums">{speedKmh === null ? '—' : Math.round(speedKmh)}</span>
      <span className="mt-0.5 text-[7px] font-mono uppercase tracking-[0.17em] text-cyan-100/70">km/h</span>
      <span className={`mt-1 max-w-[5.2rem] truncate text-[7px] font-medium ${unavailable ? 'text-amber-200' : 'text-cyan-100/48'}`}>{getGpsLabel(gpsSignalStatus, gpsAccuracyMeters)}</span>
    </div>
  );
}
