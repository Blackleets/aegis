export type AviationAlertLevel = 'warning' | 'critical';

export interface AviationAlert {
  code: 'SQUAWK_7500' | 'SQUAWK_7600' | 'SQUAWK_7700' | 'EMERGENCY_DECLARED' | 'RAPID_DESCENT';
  level: AviationAlertLevel;
  title: string;
  evidence: string;
}

export function getPositionFreshness(positionAgeSeconds: number | null) {
  if (positionAgeSeconds === null || !Number.isFinite(positionAgeSeconds)) return 'unknown' as const;
  if (positionAgeSeconds <= 15) return 'live' as const;
  if (positionAgeSeconds <= 45) return 'delayed' as const;
  return 'stale' as const;
}

export function deriveAviationAlert({
  squawk,
  emergency,
  verticalRateFpm,
  altitudeFeet,
  grounded,
  positionAgeSeconds,
}: {
  squawk?: string | null;
  emergency?: string | null;
  verticalRateFpm?: number | null;
  altitudeFeet?: number | null;
  grounded: boolean;
  positionAgeSeconds: number | null;
}): AviationAlert | null {
  const normalizedSquawk = String(squawk || '').trim();
  if (normalizedSquawk === '7500') {
    return { code: 'SQUAWK_7500', level: 'critical', title: 'Código 7500 observado', evidence: 'Transpondedor ADS-B · interferencia ilícita' };
  }
  if (normalizedSquawk === '7600') {
    return { code: 'SQUAWK_7600', level: 'critical', title: 'Código 7600 observado', evidence: 'Transpondedor ADS-B · fallo de comunicaciones' };
  }
  if (normalizedSquawk === '7700') {
    return { code: 'SQUAWK_7700', level: 'critical', title: 'Código 7700 observado', evidence: 'Transpondedor ADS-B · emergencia general' };
  }

  const normalizedEmergency = String(emergency || '').trim().toLowerCase();
  if (normalizedEmergency && !['none', 'no_emergency', 'n/a', 'unknown'].includes(normalizedEmergency)) {
    return { code: 'EMERGENCY_DECLARED', level: 'critical', title: 'Emergencia ADS-B declarada', evidence: `Estado transmitido: ${normalizedEmergency}` };
  }

  if (
    !grounded
    && getPositionFreshness(positionAgeSeconds) === 'live'
    && typeof verticalRateFpm === 'number'
    && verticalRateFpm <= -3000
    && typeof altitudeFeet === 'number'
    && altitudeFeet >= 3000
  ) {
    return {
      code: 'RAPID_DESCENT',
      level: 'warning',
      title: 'Descenso rápido observado',
      evidence: `${Math.abs(Math.round(verticalRateFpm)).toLocaleString()} ft/min · no implica emergencia`,
    };
  }

  return null;
}
