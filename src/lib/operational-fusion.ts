export type OperationalPressure = 'steady' | 'watch' | 'elevated' | 'critical' | 'degraded' | 'syncing';

export interface OperationalFusionInput {
  backendStatus: 'connecting' | 'connected' | 'error';
  activeIntelAlerts: number;
  maritimePressure: number;
  newsCount: number;
  earthquakeCount: number;
  gdeltCount: number;
}

export interface OperationalFusionAssessment {
  pressure: OperationalPressure;
  score: number;
  primarySignal: string;
  action: string;
  confidence: 'low' | 'medium' | 'high';
  corroboratingSources: number;
  evidence: string[];
}

export function assessOperationalFusion(input: OperationalFusionInput): OperationalFusionAssessment {
  const values = Object.values(input).slice(1);
  if (values.some((value) => typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
    throw new Error('operational signal counts must be finite non-negative numbers');
  }

  const evidence = [
    input.activeIntelAlerts > 0 ? `${input.activeIntelAlerts} alertas de inteligencia` : null,
    input.maritimePressure > 0 ? `${input.maritimePressure} señales marítimas` : null,
    input.earthquakeCount > 0 ? `${input.earthquakeCount} eventos sísmicos` : null,
    input.gdeltCount > 0 ? `${input.gdeltCount} eventos GDELT` : null,
    input.newsCount > 0 ? `${input.newsCount} noticias verificables` : null,
  ].filter((item): item is string => Boolean(item));

  const corroboratingSources = [
    input.activeIntelAlerts > 0,
    input.maritimePressure > 0,
    input.earthquakeCount > 0,
    input.gdeltCount > 0,
    input.newsCount > 0,
  ].filter(Boolean).length;

  const score = Math.min(10, Math.round((
    Math.min(input.activeIntelAlerts, 4) * 1.6
    + Math.min(input.maritimePressure, 4) * 1.4
    + Math.min(input.earthquakeCount, 3) * 0.9
    + Math.min(input.gdeltCount / 10, 2)
    + Math.min(input.newsCount / 20, 1)
  ) * 10) / 10);

  const pressure: OperationalPressure = input.backendStatus === 'error'
    ? 'degraded'
    : input.backendStatus === 'connecting'
      ? 'syncing'
      : score >= 8
        ? 'critical'
        : score >= 4
          ? 'elevated'
          : score >= 1
            ? 'watch'
            : 'steady';

  const primarySignal = input.activeIntelAlerts > 0 && input.maritimePressure > 0
    ? 'INTEL + MARITIME'
    : input.maritimePressure > 0
      ? 'MARITIME PRESSURE'
      : input.activeIntelAlerts > 0
        ? input.earthquakeCount > 0 ? 'QUAKE + INTEL' : 'HIGH-RISK INTEL'
        : input.earthquakeCount > 0 && input.newsCount > 0
          ? 'SEISMIC + NEWS'
          : input.gdeltCount > input.newsCount
            ? 'GLOBAL INCIDENTS'
            : input.newsCount > 0
              ? 'NEWS WATCH'
              : 'BASELINE MESH';

  const confidence = input.backendStatus !== 'connected' || corroboratingSources === 0
    ? 'low'
    : corroboratingSources >= 3
      ? 'high'
      : 'medium';

  const action = pressure === 'critical'
    ? 'Prioriza los eventos críticos y verifica rutas o activos expuestos.'
    : pressure === 'elevated'
      ? 'Revisa la concentración de señales antes de actuar.'
      : pressure === 'watch'
        ? 'Mantén vigilancia; todavía no hay convergencia crítica.'
        : pressure === 'degraded'
          ? 'Datos incompletos: evita decisiones hasta recuperar las fuentes.'
          : pressure === 'syncing'
            ? 'Sincronizando fuentes; espera antes de interpretar el panorama.'
            : 'Situación estable; continúa el monitoreo normal.';

  return {
    pressure,
    score,
    primarySignal,
    action,
    confidence,
    corroboratingSources,
    evidence,
  };
}
