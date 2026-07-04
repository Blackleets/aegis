'use client';

import { memo, useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, RefreshCw, MapPin, Camera, Maximize2, Play, Shield, Clock3, Radio } from 'lucide-react';
import Hls from 'hls.js';

interface CameraFeed {
  name: string;
  city?: string;
  country?: string;
  source?: string;
  lat?: number;
  lng?: number;
  stream_type?: 'jpg' | 'hls' | 'iframe';
  stream_url?: string;
  feed_url?: string;
  external_url?: string;
  refresh_interval_seconds?: number;
  captured_at?: string;
  live_mode?: 'snapshot' | 'video' | 'external';
}

interface CameraViewerProps {
  camera: CameraFeed | null;
  onClose: () => void;
  onLocate?: (lat: number, lng: number) => void;
}

function buildJpgUrl(feedUrl?: string, refreshToken = 0) {
  if (!feedUrl) return null;
  const nonce = `${Date.now()}-${refreshToken}`;
  return feedUrl.includes('?') ? `${feedUrl}&_t=${nonce}` : `${feedUrl}?_t=${nonce}`;
}

function sanitizeStreamUrl(url?: string) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set('autoplay', '0');
    parsed.searchParams.set('mute', '1');
    parsed.searchParams.set('playsinline', '1');
    return parsed.toString();
  } catch {
    return url.replace('autoplay=1', 'autoplay=0');
  }
}

function isHighLoadStream(streamType: CameraFeed['stream_type'], streamUrl?: string) {
  if (streamType === 'hls' || streamType === 'iframe') return true;
  if (!streamUrl) return false;
  return /youtube|m3u8|embed/i.test(streamUrl);
}

function inferRefreshIntervalSeconds(camera: CameraFeed | null) {
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

function getLiveMode(camera: CameraFeed) {
  if (camera.live_mode) return camera.live_mode;
  if (camera.external_url && !camera.feed_url && !camera.stream_url) return 'external';
  if (camera.stream_type === 'hls' || camera.stream_type === 'iframe') return 'video';
  return 'snapshot';
}

function formatRelativeSeconds(totalSeconds: number) {
  if (totalSeconds < 60) return `${totalSeconds}s ago`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}

function formatCountdown(totalSeconds: number) {
  if (totalSeconds <= 0) return 'now';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`;
}

function getModeBadge(camera: CameraFeed) {
  const liveMode = getLiveMode(camera);
  if (liveMode === 'video') return 'LIVE VIDEO';
  if (liveMode === 'external') return 'EXTERNAL LIVE';
  return 'NEAR-LIVE SNAPSHOT';
}

function CameraViewerContent({
  camera,
  onClose,
  onLocate,
  onRefresh,
  refreshToken,
}: {
  camera: CameraFeed;
  onClose: () => void;
  onLocate?: (lat: number, lng: number) => void;
  onRefresh: () => void;
  refreshToken: number;
}) {
  const streamType = camera.stream_type || 'jpg';
  const liveMode = getLiveMode(camera);
  const refreshIntervalSeconds = inferRefreshIntervalSeconds(camera);
  const externalFeedUrl = camera.external_url || camera.feed_url || camera.stream_url;
  const externalOnly = Boolean(camera.external_url && !camera.feed_url && !camera.stream_url);
  const safeStreamUrl = useMemo(() => sanitizeStreamUrl(camera.stream_url), [camera.stream_url]);
  const imageUrl = useMemo(() => buildJpgUrl(camera.feed_url, refreshToken), [camera.feed_url, refreshToken]);
  const highLoad = isHighLoadStream(streamType, camera.stream_url);
  const [streamLoading, setStreamLoading] = useState(() => !externalOnly && streamType !== 'jpg' && Boolean(camera.stream_url));
  const [streamError, setStreamError] = useState(() => !externalOnly && streamType !== 'jpg' && !camera.stream_url);
  const [fullscreen, setFullscreen] = useState(false);
  const [streamArmed, setStreamArmed] = useState(() => !highLoad && !externalOnly);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [lastFrameAt, setLastFrameAt] = useState<number | null>(() => {
    if (!camera.captured_at) return null;
    const ts = Date.parse(camera.captured_at);
    return Number.isNaN(ts) ? null : ts;
  });
  const [loadedRefreshToken, setLoadedRefreshToken] = useState(() => (streamType === 'jpg' && camera.feed_url ? -1 : refreshToken));
  const [jpgErrorToken, setJpgErrorToken] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, []);

  useEffect(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }

    if (externalOnly || streamType === 'iframe' || streamType === 'jpg' || !streamArmed) {
      return;
    }

    if (streamType === 'hls' && safeStreamUrl) {
      if (Hls.isSupported() && videoRef.current) {
        const hls = new Hls({ enableWorker: false, maxBufferLength: 8, backBufferLength: 8 });
        hlsRef.current = hls;
        hls.loadSource(safeStreamUrl);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setStreamLoading(false);
          setLastFrameAt(Date.now());
          videoRef.current?.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            setStreamError(true);
            setStreamLoading(false);
            hls.destroy();
            hlsRef.current = null;
          }
        });

        return () => {
          hls.destroy();
          hlsRef.current = null;
        };
      }

      if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
        const currentVideo = videoRef.current;
        const handleLoadedMetadata = () => {
          setStreamLoading(false);
          setLastFrameAt(Date.now());
          currentVideo.play().catch(() => {});
        };

        currentVideo.src = safeStreamUrl;
        currentVideo.addEventListener('loadedmetadata', handleLoadedMetadata);
        return () => currentVideo.removeEventListener('loadedmetadata', handleLoadedMetadata);
      }

      queueMicrotask(() => {
        setStreamError(true);
        setStreamLoading(false);
      });
    }
  }, [safeStreamUrl, externalOnly, streamArmed, streamType]);

  const loading = streamType === 'jpg'
    ? Boolean(camera.feed_url) && loadedRefreshToken !== refreshToken && jpgErrorToken !== refreshToken
    : streamLoading;
  const error = streamType === 'jpg'
    ? (!camera.feed_url && !externalOnly) || jpgErrorToken === refreshToken
    : streamError;
  const frameAgeSeconds = lastFrameAt ? Math.max(0, Math.floor((nowTs - lastFrameAt) / 1000)) : null;
  const nextRefreshSeconds = liveMode === 'snapshot' && lastFrameAt
    ? Math.max(0, refreshIntervalSeconds - (frameAgeSeconds ?? 0))
    : null;
  const showSafeModeGate = !externalOnly && highLoad && !streamArmed && !error;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className={`fixed z-[500] ${
          fullscreen
            ? 'inset-2 md:inset-4'
            : 'bottom-[70px] left-2 right-2 md:bottom-6 md:right-6 md:left-auto md:w-[440px]'
        }`}
      >
        <div className="glass-panel aegis-glow overflow-hidden h-full flex flex-col" style={{ borderColor: 'rgba(57, 255, 20, 0.3)' }}>
          <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-b border-[var(--border-secondary)] bg-black/40">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-2 h-2 rounded-full bg-[#39FF14] animate-aegis-pulse flex-shrink-0" />
              <Camera className="w-3.5 h-3.5 text-[#39FF14] flex-shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <h3 className="text-[10px] md:text-[11px] font-mono font-bold text-[#39FF14] tracking-wider truncate">{camera.name}</h3>
                  <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[6px] font-mono tracking-[0.18em] text-[var(--text-muted)]">
                    {getModeBadge(camera)}
                  </span>
                </div>
                <p className="text-[6px] md:text-[7px] font-mono text-[var(--text-muted)] truncate">{[camera.city, camera.country, camera.source].filter(Boolean).join(' · ') || 'Remote camera feed'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {streamType === 'jpg' && (
                <button onClick={onRefresh} className="p-1.5 rounded hover:bg-[var(--hover-accent)] transition-colors" title="Refresh feed">
                  <RefreshCw className="w-3 h-3 text-[var(--text-muted)] hover:text-[#39FF14]" />
                </button>
              )}
              {camera.lat !== undefined && camera.lng !== undefined && (
                <button onClick={() => onLocate?.(camera.lat as number, camera.lng as number)} className="p-1.5 rounded hover:bg-[var(--hover-accent)] transition-colors" title="Fly to location">
                  <MapPin className="w-3 h-3 text-[var(--text-muted)] hover:text-[var(--gold-primary)]" />
                </button>
              )}
              <button onClick={() => setFullscreen(!fullscreen)} className="hidden md:block p-1.5 rounded hover:bg-[var(--hover-accent)] transition-colors" title="Toggle fullscreen">
                <Maximize2 className="w-3 h-3 text-[var(--text-muted)] hover:text-white" />
              </button>
              <button onClick={onClose} className="p-1.5 rounded hover:bg-red-900/30 transition-colors">
                <X className="w-4 h-4 md:w-3 md:h-3 text-[var(--text-muted)] hover:text-red-400" />
              </button>
            </div>
          </div>

          <div className="px-3 md:px-4 py-2 border-b border-[var(--border-secondary)] bg-black/35 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-[7px] md:text-[8px] font-mono text-[var(--text-secondary)] tracking-[0.16em] uppercase">
              <Radio className="w-3 h-3 text-[#39FF14]" />
              <span>{liveMode === 'snapshot' ? 'Near-live cadence' : liveMode === 'video' ? 'Inline live transport' : 'Source-hosted live feed'}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-[7px] md:text-[8px] font-mono">
              {liveMode === 'snapshot' && (
                <>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#39FF14]/20 bg-[#39FF14]/8 px-2 py-1 text-[#39FF14] tracking-[0.16em]">
                    <Clock3 className="w-3 h-3" />
                    {refreshIntervalSeconds}s cadence
                  </span>
                  <span className="text-[var(--text-muted)] tracking-[0.14em]">
                    {frameAgeSeconds !== null ? `updated ${formatRelativeSeconds(frameAgeSeconds)}` : 'awaiting first frame'}
                  </span>
                  <span className="text-[var(--gold-primary)] tracking-[0.14em]">
                    next refresh {nextRefreshSeconds !== null ? formatCountdown(nextRefreshSeconds) : '—'}
                  </span>
                </>
              )}
              {liveMode === 'video' && (
                <span className="text-[var(--text-muted)] tracking-[0.14em]">continuous stream · viewer-managed playback</span>
              )}
              {liveMode === 'external' && (
                <span className="text-[var(--text-muted)] tracking-[0.14em]">live source opens in provider viewer</span>
              )}
            </div>
          </div>

          <div className={`relative bg-black ${fullscreen ? 'flex-1' : 'aspect-video max-h-[35vh] md:max-h-none'}`}>
            {loading && !error && !externalOnly && !showSafeModeGate && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-[#39FF14] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span className="text-[8px] font-mono text-[#39FF14] tracking-widest">CONNECTING TO FEED...</span>
                </div>
              </div>
            )}

            {externalOnly ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90">
                <div className="text-center px-6">
                  <div className="w-8 h-8 rounded-full bg-[#39FF14]/15 flex items-center justify-center mx-auto mb-2"><ExternalLink className="w-4 h-4 text-[#39FF14]" /></div>
                  <span className="text-[9px] font-mono text-[#39FF14] tracking-widest block mb-1">EXTERNAL LIVE SOURCE</span>
                  <span className="text-[7px] font-mono text-[var(--text-muted)]">This provider keeps playback in its own viewer.</span>
                  {externalFeedUrl && (
                    <a href={externalFeedUrl} target="_blank" rel="noopener noreferrer" className="block mx-auto mt-3 px-3 py-1 text-[8px] font-mono text-[#39FF14] border border-[#39FF14]/30 rounded hover:bg-[#39FF14]/10 transition-colors tracking-wider">
                      OPEN FEED
                    </a>
                  )}
                </div>
              </div>
            ) : showSafeModeGate ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/95">
                <div className="text-center px-5 max-w-sm">
                  <div className="w-10 h-10 rounded-full bg-[var(--gold-primary)]/10 border border-[var(--gold-primary)]/30 flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-5 h-5 text-[var(--gold-primary)]" />
                  </div>
                  <div className="text-[10px] font-mono text-[var(--gold-primary)] tracking-[0.25em] mb-2">SAFE CAMERA MODE</div>
                  <p className="text-[11px] text-white/80 leading-relaxed mb-3">
                    Esta cámara usa una vista de video pesada. Para evitar picos de GPU o cierres bruscos, la previsualización queda pausada hasta que la actives manualmente.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        setStreamError(false);
                        setStreamLoading(streamType !== 'iframe');
                        setStreamArmed(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded border border-[#39FF14]/40 text-[#39FF14] font-mono text-[11px] hover:bg-[#39FF14]/10 transition-colors tracking-wider"
                    >
                      <Play className="w-3.5 h-3.5" />
                      START SAFE PREVIEW
                    </button>
                    {externalFeedUrl && (
                      <a
                        href={externalFeedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded border border-white/15 text-white/80 font-mono text-[11px] hover:bg-white/5 transition-colors tracking-wider"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        OPEN SOURCE
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90">
                <div className="text-center px-6">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mb-2 mx-auto"><Camera className="w-4 h-4 text-red-400" /></div>
                  <span className="text-[9px] font-mono text-red-400 tracking-widest block mb-1">FEED UNAVAILABLE</span>
                  <span className="text-[7px] font-mono text-[var(--text-muted)]">Camera may be offline, blocked, or too heavy for inline preview</span>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <button onClick={onRefresh} className="px-3 py-1 text-[8px] font-mono text-[#39FF14] border border-[#39FF14]/30 rounded hover:bg-[#39FF14]/10 transition-colors tracking-wider">
                      RETRY
                    </button>
                    {externalFeedUrl && (
                      <a href={externalFeedUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-[8px] font-mono text-white/80 border border-white/15 rounded hover:bg-white/5 transition-colors tracking-wider">
                        OPEN SOURCE
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : streamType === 'hls' ? (
              <video
                ref={videoRef}
                className={`w-full ${fullscreen ? 'h-full object-contain' : 'h-full object-cover'}`}
                autoPlay
                muted
                playsInline
                preload="metadata"
              />
            ) : streamType === 'iframe' && safeStreamUrl ? (
              <iframe
                src={safeStreamUrl}
                className="w-full h-full border-0"
                allow="fullscreen; picture-in-picture"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : imageUrl ? (
              <Image
                src={imageUrl}
                alt={camera.name}
                fill
                unoptimized
                sizes="100vw"
                className={fullscreen ? 'object-contain' : 'object-cover'}
                onLoad={() => {
                  setLoadedRefreshToken(refreshToken);
                  setJpgErrorToken(null);
                  setLastFrameAt(Date.now());
                }}
                onError={() => {
                  setLoadedRefreshToken(refreshToken);
                  setJpgErrorToken(refreshToken);
                }}
              />
            ) : null}

            {!error && !loading && !externalOnly && !showSafeModeGate && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2 py-1 rounded">
                <div className={`w-1.5 h-1.5 rounded-full ${liveMode === 'snapshot' ? 'bg-amber-400' : 'bg-red-500 animate-aegis-pulse'}`} />
                <span className="text-[7px] font-mono text-white tracking-widest">
                  {liveMode === 'snapshot' ? 'NEAR-LIVE FEED' : 'LIVE VIDEO'}
                </span>
              </div>
            )}
          </div>

          <div className="px-3 md:px-4 py-2 border-t border-[var(--border-secondary)] bg-black/40 flex items-center justify-between gap-3">
            <div className="text-[7px] md:text-[8px] font-mono text-[var(--text-muted)]">
              {camera.lat !== undefined && camera.lng !== undefined ? `${camera.lat.toFixed(4)}, ${camera.lng.toFixed(4)}` : 'Location unavailable'}
            </div>
            <div className="flex gap-2">
              {externalFeedUrl && (
                <a href={externalFeedUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[7px] font-mono text-[#39FF14] hover:underline tracking-wider">
                  <ExternalLink className="w-2.5 h-2.5" /> FEED
                </a>
              )}
              {camera.lat !== undefined && camera.lng !== undefined && (
                <a href={`https://www.google.com/maps/@${camera.lat},${camera.lng},17z`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[7px] font-mono text-[var(--cyan-primary)] hover:underline tracking-wider">
                  <MapPin className="w-2.5 h-2.5" /> MAP
                </a>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function CameraViewer({ camera, onClose, onLocate }: CameraViewerProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const streamType = camera?.stream_type || 'jpg';
  const refreshIntervalSeconds = inferRefreshIntervalSeconds(camera);

  useEffect(() => {
    if (streamType !== 'jpg' || !camera?.feed_url) return;

    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      setRefreshKey((key) => key + 1);
    }, refreshIntervalSeconds * 1000);

    return () => clearInterval(intervalId);
  }, [camera?.feed_url, streamType, refreshIntervalSeconds]);

  if (!camera) return null;

  const contentKey = [camera.name, camera.feed_url || camera.stream_url || camera.external_url || 'feed'].join(':');

  return (
    <CameraViewerContent
      key={contentKey}
      camera={camera}
      refreshToken={refreshKey}
      onClose={onClose}
      onLocate={onLocate}
      onRefresh={() => setRefreshKey((key) => key + 1)}
    />
  );
}

export default memo(CameraViewer);
