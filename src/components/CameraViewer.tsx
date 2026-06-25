'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, RefreshCw, MapPin, Camera, Maximize2, Play, Shield } from 'lucide-react';
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
}

interface CameraViewerProps {
  camera: CameraFeed | null;
  onClose: () => void;
  onLocate?: (lat: number, lng: number) => void;
}

function buildJpgUrl(feedUrl?: string) {
  if (!feedUrl) return null;
  return feedUrl.includes('?') ? `${feedUrl}&_t=${Date.now()}` : `${feedUrl}?_t=${Date.now()}`;
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

function CameraViewerContent({
  camera,
  onClose,
  onLocate,
  onRefresh,
}: {
  camera: CameraFeed;
  onClose: () => void;
  onLocate?: (lat: number, lng: number) => void;
  onRefresh: () => void;
}) {
  const streamType = camera.stream_type || 'jpg';
  const externalFeedUrl = camera.external_url || camera.feed_url || camera.stream_url;
  const externalOnly = Boolean(camera.external_url && !camera.feed_url && !camera.stream_url);
  const safeStreamUrl = useMemo(() => sanitizeStreamUrl(camera.stream_url), [camera.stream_url]);
  const imageUrl = buildJpgUrl(camera.feed_url);
  const highLoad = isHighLoadStream(streamType, camera.stream_url);
  const [loading, setLoading] = useState(() => !externalOnly && streamType === 'jpg' && Boolean(camera.feed_url));
  const [error, setError] = useState(() => !externalOnly && !camera.stream_url && !camera.feed_url);
  const [fullscreen, setFullscreen] = useState(false);
  const [streamArmed, setStreamArmed] = useState(() => !highLoad && !externalOnly);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

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
          setLoading(false);
          videoRef.current?.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            setError(true);
            setLoading(false);
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
          setLoading(false);
          currentVideo.play().catch(() => {});
        };

        currentVideo.src = safeStreamUrl;
        currentVideo.addEventListener('loadedmetadata', handleLoadedMetadata);
        return () => currentVideo.removeEventListener('loadedmetadata', handleLoadedMetadata);
      }

      queueMicrotask(() => {
        setError(true);
        setLoading(false);
      });
    }
  }, [safeStreamUrl, externalOnly, streamArmed, streamType]);

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
            : 'bottom-[70px] left-2 right-2 md:bottom-6 md:right-6 md:left-auto md:w-[420px]'
        }`}
      >
        <div className="glass-panel aegis-glow overflow-hidden h-full flex flex-col" style={{ borderColor: 'rgba(57, 255, 20, 0.3)' }}>
          <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-b border-[var(--border-secondary)] bg-black/40">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-2 h-2 rounded-full bg-[#39FF14] animate-aegis-pulse flex-shrink-0" />
              <Camera className="w-3.5 h-3.5 text-[#39FF14] flex-shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-[10px] md:text-[11px] font-mono font-bold text-[#39FF14] tracking-wider truncate">{camera.name}</h3>
                  <span className="hidden md:inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[6px] font-mono tracking-[0.18em] text-[var(--text-muted)]">
                    {streamType === 'jpg' ? 'SNAPSHOT' : streamType === 'hls' ? 'LIVE VIDEO' : streamType === 'iframe' ? 'EMBEDDED' : 'FEED'}
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
                  <span className="text-[9px] font-mono text-[#39FF14] tracking-widest block mb-1">EXTERNAL FEED</span>
                  <span className="text-[7px] font-mono text-[var(--text-muted)]">Live stream opens in source viewer</span>
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
                        setError(false);
                        setLoading(streamType !== 'iframe');
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
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setError(true);
                }}
              />
            ) : null}

            {!error && !loading && !externalOnly && !showSafeModeGate && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2 py-1 rounded">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-aegis-pulse" />
                <span className="text-[7px] font-mono text-white tracking-widest">
                  {streamType === 'jpg' ? 'LIVE SNAPSHOT' : 'LIVE VIDEO'}
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
              <a href={`https://www.google.com/maps/@${camera.lat},${camera.lng},17z`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[7px] font-mono text-[var(--cyan-primary)] hover:underline tracking-wider">
                <MapPin className="w-2.5 h-2.5" /> MAP
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function CameraViewer({ camera, onClose, onLocate }: CameraViewerProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const streamType = camera?.stream_type || 'jpg';

  useEffect(() => {
    if (streamType !== 'jpg' || !camera?.feed_url) return;

    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      setRefreshKey((key) => key + 1);
    }, 15000);

    return () => clearInterval(intervalId);
  }, [camera?.feed_url, streamType]);

  if (!camera) return null;

  const contentKey = [camera.name, camera.feed_url || camera.stream_url || camera.external_url || 'feed', refreshKey].join(':');

  return (
    <CameraViewerContent
      key={contentKey}
      camera={camera}
      onClose={onClose}
      onLocate={onLocate}
      onRefresh={() => setRefreshKey((key) => key + 1)}
    />
  );
}
