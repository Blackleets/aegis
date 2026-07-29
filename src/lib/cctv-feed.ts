export type CctvLiveMode = 'snapshot' | 'video' | 'external';
export type CctvStreamType = 'jpg' | 'hls' | 'iframe';
export type CctvViewMode = 'all' | 'live' | 'near-live';

export interface CctvDeliveryMetadata {
  feed_url?: string;
  stream_url?: string;
  stream_type?: CctvStreamType;
  external_url?: string;
  source?: string;
  refresh_interval_seconds?: number;
  captured_at?: string;
  live_mode?: CctvLiveMode;
}

export type CctvOperationalStatus = 'connecting' | 'live' | 'stale' | 'offline';

export function getCctvLiveMode(camera: CctvDeliveryMetadata): CctvLiveMode {
  return camera.live_mode
    || (camera.stream_url ? 'video' : camera.feed_url ? 'snapshot' : 'external');
}

export function filterCctvByViewMode<T extends CctvDeliveryMetadata>(
  cameras: T[] | undefined,
  viewMode: CctvViewMode,
): T[] {
  if (!cameras) return [];
  if (viewMode === 'all') return cameras;
  const expectedMode: CctvLiveMode = viewMode === 'live' ? 'video' : 'snapshot';
  return cameras.filter((camera) => getCctvLiveMode(camera) === expectedMode);
}

export function countCctvByMode(cameras: CctvDeliveryMetadata[] | undefined) {
  const counts = { all: cameras?.length || 0, live: 0, nearLive: 0, external: 0 };
  for (const camera of cameras || []) {
    const mode = getCctvLiveMode(camera);
    if (mode === 'video') counts.live += 1;
    else if (mode === 'snapshot') counts.nearLive += 1;
    else counts.external += 1;
  }
  return counts;
}

export function scoreCctvDelivery(camera: CctvDeliveryMetadata): number {
  const mode = getCctvLiveMode(camera);
  const transportScore = mode === 'video' ? 300 : mode === 'snapshot' ? 200 : 100;
  const cadence = inferCctvRefreshIntervalSeconds(camera);
  const cadenceScore = mode === 'snapshot' ? Math.max(0, 60 - cadence) : 0;
  return transportScore + cadenceScore;
}

export function getCctvOperationalStatus({
  mode,
  loading,
  error,
  lastFrameAt,
  now = Date.now(),
  refreshIntervalSeconds = 15,
}: {
  mode: CctvLiveMode;
  loading: boolean;
  error: boolean;
  lastFrameAt: number | null;
  now?: number;
  refreshIntervalSeconds?: number;
}): CctvOperationalStatus {
  if (error) return 'offline';
  if (loading || lastFrameAt === null) return 'connecting';
  if (mode === 'snapshot' && now - lastFrameAt > Math.max(30, refreshIntervalSeconds * 3) * 1000) {
    return 'stale';
  }
  return 'live';
}

const IMAGE_PATH = /\.(?:avif|gif|jpe?g|png|webp)(?:$|[?#])/i;
const SNAPSHOT_ENDPOINT = /(?:axis-cgi\/jpg|camera\/snapshot|snapshot|campic|traffic-images)/i;
const NON_IMAGE_ENDPOINT = /\/api\/(?:v\d+\/)?(?:get\/)?cameras?(?:$|[?#])/i;
const HTML_CAMERA_PAGE = /\/map\/camera(?:$|[?#])/i;

export function inferCctvRefreshIntervalSeconds(camera: CctvDeliveryMetadata | null): number {
  if (!camera) return 15;
  if (typeof camera.refresh_interval_seconds === 'number' && Number.isFinite(camera.refresh_interval_seconds)) {
    return Math.max(5, Math.round(camera.refresh_interval_seconds));
  }

  const source = `${camera.source || ''} ${camera.feed_url || ''} ${camera.stream_url || ''}`.toLowerCase();
  if (source.includes('511.alberta.ca') || source.includes('alberta 511')) return 60;
  if (source.includes('axis-cgi')) return 5;
  if (source.includes('ottawa')) return 20;
  if (source.includes('travelmidwest') || source.includes('idot')) return 20;
  if (source.includes('fl511')) return 30;
  if (source.includes('511on')) return 30;
  return 15;
}

export function isLikelySnapshotUrl(url?: string): boolean {
  if (!url) return false;
  return (IMAGE_PATH.test(url) || SNAPSHOT_ENDPOINT.test(url))
    && !NON_IMAGE_ENDPOINT.test(url)
    && !HTML_CAMERA_PAGE.test(url);
}

export function normalizeCctvDelivery<T extends CctvDeliveryMetadata>(
  camera: T,
  capturedAt: string,
): T & CctvDeliveryMetadata {
  const normalized: T & CctvDeliveryMetadata = { ...camera };

  if (normalized.stream_url) {
    normalized.live_mode = 'video';
    return normalized;
  }

  if (normalized.feed_url && !isLikelySnapshotUrl(normalized.feed_url)) {
    normalized.external_url ||= normalized.feed_url;
    delete normalized.feed_url;
  }

  if (normalized.feed_url) {
    normalized.stream_type = 'jpg';
    normalized.live_mode = 'snapshot';
    normalized.refresh_interval_seconds = inferCctvRefreshIntervalSeconds(normalized);
    normalized.captured_at = capturedAt;
  } else {
    normalized.live_mode = 'external';
  }

  return normalized;
}

export function buildCctvFrameUrl(feedUrl?: string, refreshToken = 0): string | null {
  if (!feedUrl) return null;
  const nonce = `${Date.now()}-${refreshToken}`;
  return `/api/cctv/frame?url=${encodeURIComponent(feedUrl)}&_t=${encodeURIComponent(nonce)}`;
}
