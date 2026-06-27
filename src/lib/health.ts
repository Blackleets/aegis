export type HealthStatus = 'ok' | 'degraded' | 'down';
export type SubsystemProbe = 'http' | 'static' | 'config';
export type SubsystemState = 'healthy' | 'degraded' | 'down';

export interface SubsystemStatus {
  key: string;
  label: string;
  endpoint: string | null;
  critical: boolean;
  status: SubsystemState;
  latencyMs: number | null;
  httpStatus: number | null;
  message: string;
  probe: SubsystemProbe;
}

export interface HealthSummary {
  criticalAvailable: number;
  criticalTotal: number;
  degradedCount: number;
  downCount: number;
  totalSubsystems: number;
}

export interface HealthPayload {
  status: HealthStatus;
  platform: 'AEGIS';
  version: string;
  uptime: number;
  timestamp: string;
  summary: HealthSummary;
  ai: {
    mode: 'premium' | 'local-fallback';
    configuredServerKeys: number;
  };
  subsystems: SubsystemStatus[];
  endpoints: string[];
}

interface HttpSubsystemDefinition {
  key: string;
  label: string;
  endpoint: string;
  critical: boolean;
  timeoutMs: number;
}

const HTTP_SUBSYSTEMS: HttpSubsystemDefinition[] = [
  { key: 'markets', label: 'Markets', endpoint: '/api/markets', critical: true, timeoutMs: 5000 },
  { key: 'intel', label: 'Intel Feed', endpoint: '/api/news', critical: true, timeoutMs: 5000 },
  { key: 'weather', label: 'Weather', endpoint: '/api/weather', critical: false, timeoutMs: 4000 },
  { key: 'space-weather', label: 'Space Weather', endpoint: '/api/space-weather', critical: false, timeoutMs: 4000 },
  { key: 'cctv', label: 'CCTV', endpoint: '/api/cctv/stream-status', critical: false, timeoutMs: 4000 },
];

export function summarizeSubsystems(subsystems: SubsystemStatus[]): HealthSummary {
  const criticalTotal = subsystems.filter((subsystem) => subsystem.critical).length;
  const criticalAvailable = subsystems.filter(
    (subsystem) => subsystem.critical && subsystem.status === 'healthy'
  ).length;
  const degradedCount = subsystems.filter((subsystem) => subsystem.status === 'degraded').length;
  const downCount = subsystems.filter((subsystem) => subsystem.status === 'down').length;

  return {
    criticalAvailable,
    criticalTotal,
    degradedCount,
    downCount,
    totalSubsystems: subsystems.length,
  };
}

export function evaluateOverallStatus(subsystems: SubsystemStatus[]): HealthStatus {
  const critical = subsystems.filter((subsystem) => subsystem.critical);
  if (critical.length === 0) return 'ok';

  const allHealthy = critical.every((subsystem) => subsystem.status === 'healthy');
  if (allHealthy) return 'ok';

  const allDown = critical.every((subsystem) => subsystem.status === 'down');
  if (allDown) return 'down';

  return 'degraded';
}

function countConfiguredGeminiKeys(): number {
  let count = 0;
  for (let index = 1; index <= 8; index += 1) {
    const key = process.env[`GEMINI_API_KEY_${index}`];
    if (key && key.trim().length > 0) count += 1;
  }
  return count;
}

function buildStaticSubsystems(configuredServerKeys: number): SubsystemStatus[] {
  return [
    {
      key: 'ai',
      label: 'AI Analyst',
      endpoint: '/api/ai/analyze',
      critical: false,
      status: 'healthy',
      latencyMs: null,
      httpStatus: null,
      message:
        configuredServerKeys > 0
          ? `Premium mode ready with ${configuredServerKeys} server key${configuredServerKeys > 1 ? 's' : ''}`
          : 'Local fallback mode active',
      probe: 'config',
    },
    {
      key: 'map',
      label: 'Map Shell',
      endpoint: null,
      critical: false,
      status: 'healthy',
      latencyMs: null,
      httpStatus: null,
      message: 'Client-rendered tactical map shell available',
      probe: 'static',
    },
  ];
}

function isTimeoutProbeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const normalized = error.message.toLowerCase();
  return normalized.includes('timeout') || normalized.includes('aborted');
}

async function probeSubsystem(
  origin: string,
  definition: HttpSubsystemDefinition,
  fetchImpl: typeof fetch
): Promise<SubsystemStatus> {
  const startedAt = Date.now();

  try {
    const response = await fetchImpl(`${origin}${definition.endpoint}`, {
      method: 'GET',
      signal: AbortSignal.timeout(definition.timeoutMs),
      headers: {
        Accept: 'application/json',
        'x-aegis-health-check': '1',
      },
      cache: 'no-store',
    });

    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      return {
        key: definition.key,
        label: definition.label,
        endpoint: definition.endpoint,
        critical: definition.critical,
        status: definition.critical ? 'down' : 'degraded',
        latencyMs,
        httpStatus: response.status,
        message: `Probe returned HTTP ${response.status}`,
        probe: 'http',
      };
    }

    return {
      key: definition.key,
      label: definition.label,
      endpoint: definition.endpoint,
      critical: definition.critical,
      status: 'healthy',
      latencyMs,
      httpStatus: response.status,
      message: 'Probe succeeded',
      probe: 'http',
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : 'Unknown probe error';

    return {
      key: definition.key,
      label: definition.label,
      endpoint: definition.endpoint,
      critical: definition.critical,
      status: isTimeoutProbeError(error) ? 'degraded' : definition.critical ? 'down' : 'degraded',
      latencyMs,
      httpStatus: null,
      message,
      probe: 'http',
    };
  }
}

export async function collectHealthSnapshot(
  origin: string,
  fetchImpl: typeof fetch = fetch
): Promise<HealthPayload> {
  const configuredServerKeys = countConfiguredGeminiKeys();
  const httpSubsystems = await Promise.all(
    HTTP_SUBSYSTEMS.map((definition) => probeSubsystem(origin, definition, fetchImpl))
  );
  const subsystems = [...httpSubsystems, ...buildStaticSubsystems(configuredServerKeys)];
  const summary = summarizeSubsystems(subsystems);

  return {
    status: evaluateOverallStatus(subsystems),
    platform: 'AEGIS',
    version: '1.1.0',
    uptime: process.uptime ? Math.round(process.uptime()) : 0,
    timestamp: new Date().toISOString(),
    summary,
    ai: {
      mode: configuredServerKeys > 0 ? 'premium' : 'local-fallback',
      configuredServerKeys,
    },
    subsystems,
    endpoints: HTTP_SUBSYSTEMS.map((definition) => definition.endpoint).concat('/api/ai/analyze'),
  };
}
