export type CctvLiveMode = 'snapshot' | 'video' | 'external';
export type CctvStreamType = 'jpg' | 'hls' | 'iframe';

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
