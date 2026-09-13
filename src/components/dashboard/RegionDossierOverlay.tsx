'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  provenanceChipLabel,
  regionDossierHasProvenance,
  regionDossierToClaims,
  type RegionDossierSection,
} from '@/lib/ontology';
import type { OntologyClaim } from '@/lib/ontology';

export interface RegionDossierData {
  location?: { display_name?: string };
  country?: {
    flag?: string;
    name?: string;
    capital?: string;
    population?: number;
    subregion?: string;
    region?: string;
    languages?: string[];
    area?: number;
    timezones?: string[];
  };
  head_of_state?: { name?: string; position?: string };
  wikipedia?: { thumbnail?: string; extract?: string };
  live_context?: {
    local_time?: string;
    timezone?: string;
    timezone_abbr?: string;
    weather?: {
      temperature_c?: number;
      feels_like_c?: number;
      wind_kmh?: number;
      summary?: string;
      is_day?: boolean;
    };
    nearby_cameras?: {
      count?: number;
      countries?: string[];
      closest?: {
        name?: string;
        city?: string;
        country?: string;
        source?: string;
        distance_km?: number;
      };
    };
    nearby_weather?: {
      count?: number;
      radius_km?: number;
    };
  };
  timestamp?: string;
  claims?: OntologyClaim[];
}

type RegionDossierOverlayProps = {
  regionDossier: RegionDossierData | null;
  dossierLoading: boolean;
  onClose: () => void;
};

function ProvenanceChip({ claim, available }: { claim?: OntologyClaim; available: boolean }) {
  return (
    <span
      className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[7px] font-mono uppercase tracking-[0.12em] ${
        available
          ? 'border-cyan-200/20 bg-cyan-200/5 text-cyan-100/80'
          : 'border-white/10 bg-black/20 text-white/35'
      }`}
    >
      {available ? provenanceChipLabel(claim?.provenance, true) : provenanceChipLabel(undefined)}
    </span>
  );
}

function sectionClaim(claims: OntologyClaim[], section: RegionDossierSection): OntologyClaim | undefined {
  return claims.find((claim) => claim.id === `claim:region:${section}`);
}

export default function RegionDossierOverlay({ regionDossier, dossierLoading, onClose }: RegionDossierOverlayProps) {
  if (!regionDossier && !dossierLoading) return null;

  const claims = regionDossier ? regionDossierToClaims(regionDossier) : [];
  const showWikipedia = Boolean(regionDossier?.wikipedia && regionDossierHasProvenance(regionDossier, 'wikipedia'));
  const showWeather = Boolean(regionDossier?.live_context?.weather && regionDossierHasProvenance(regionDossier, 'weather'));
  const showCameras = Boolean(regionDossier?.live_context?.nearby_cameras && regionDossierHasProvenance(regionDossier, 'cameras'));
  const showHeadOfState = Boolean(regionDossier?.head_of_state && regionDossierHasProvenance(regionDossier, 'head_of_state'));

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-16 md:top-20 left-2 right-2 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[300] md:w-[480px] max-h-[65vh] overflow-y-auto styled-scrollbar">
      <div className="glass-panel p-5 aegis-glow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-mono font-bold text-[var(--gold-primary)] tracking-wider">REGION DOSSIER</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs">✕</button>
        </div>
        {dossierLoading ? (
          <div className="text-center py-8">
            <div className="w-5 h-5 border-2 border-[var(--gold-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest">COMPILING INTEL...</span>
          </div>
        ) : regionDossier ? (
          <div className="space-y-3">
            <div>
              <div className="hud-label mb-0.5">LOCATION</div>
              <div className="text-xs text-[var(--text-primary)]">{regionDossier.location?.display_name}</div>
              <ProvenanceChip
                claim={sectionClaim(claims, 'location')}
                available={regionDossierHasProvenance(regionDossier, 'location')}
              />
            </div>
            {regionDossier.country && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="hud-label mb-0.5">COUNTRY</div>
                  <div className="text-xs text-[var(--text-primary)]">{regionDossier.country.flag} {regionDossier.country.name}</div>
                  <ProvenanceChip
                    claim={sectionClaim(claims, 'country')}
                    available={regionDossierHasProvenance(regionDossier, 'country')}
                  />
                </div>
                <div><div className="hud-label mb-0.5">CAPITAL</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.capital}</div></div>
                <div><div className="hud-label mb-0.5">POPULATION</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.population?.toLocaleString()}</div></div>
                <div><div className="hud-label mb-0.5">REGION</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.subregion || regionDossier.country.region}</div></div>
                <div><div className="hud-label mb-0.5">LANGUAGES</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.languages?.join(', ')}</div></div>
                <div><div className="hud-label mb-0.5">AREA</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.area?.toLocaleString()} km²</div></div>
              </div>
            )}
            {regionDossier.live_context && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="hud-label mb-0.5">LIVE TERRITORY CONTEXT</div>
                    <div className="text-[8px] text-[var(--text-muted)] tracking-[0.2em]">WEATHER • CLOCK • CAMERAS</div>
                  </div>
                  {regionDossier.live_context.local_time && (
                    <div className="text-right">
                      <div className="text-xs font-mono text-[var(--text-primary)]">{regionDossier.live_context.local_time}</div>
                      <div className="text-[8px] text-[var(--text-muted)]">{regionDossier.live_context.timezone_abbr || regionDossier.live_context.timezone}</div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/8 bg-black/20 p-2">
                    <div className="hud-label mb-1">SURFACE WEATHER</div>
                    {showWeather ? (
                      <>
                        <div className="text-xs text-[var(--text-primary)]">{regionDossier.live_context.weather?.summary}</div>
                        <div className="text-[8px] text-[var(--text-muted)] mt-1">
                          {typeof regionDossier.live_context.weather?.temperature_c === 'number' ? `${Math.round(regionDossier.live_context.weather.temperature_c)}°C` : '—'}
                          {typeof regionDossier.live_context.weather?.feels_like_c === 'number' ? ` • feels ${Math.round(regionDossier.live_context.weather.feels_like_c)}°C` : ''}
                        </div>
                        <div className="text-[8px] text-[var(--text-muted)] mt-0.5">
                          {typeof regionDossier.live_context.weather?.wind_kmh === 'number' ? `Wind ${Math.round(regionDossier.live_context.weather.wind_kmh)} km/h` : 'No wind telemetry'}
                        </div>
                        <ProvenanceChip claim={sectionClaim(claims, 'weather')} available />
                      </>
                    ) : (
                      <>
                        <div className="text-xs text-[var(--text-muted)]">Unavailable</div>
                        <ProvenanceChip available={false} />
                      </>
                    )}
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/20 p-2">
                    <div className="hud-label mb-1">NEARBY CAMERAS</div>
                    {showCameras ? (
                      <>
                        <div className="text-xs text-[var(--text-primary)]">{regionDossier.live_context.nearby_cameras?.count ?? 0} live feeds</div>
                        <div className="text-[8px] text-[var(--text-muted)] mt-1">
                          {regionDossier.live_context.nearby_cameras?.countries?.length ? regionDossier.live_context.nearby_cameras.countries.join(', ') : 'No regional feed clusters'}
                        </div>
                        <div className="text-[8px] text-[var(--text-muted)] mt-0.5">
                          {regionDossier.live_context.nearby_cameras?.closest?.name
                            ? `${regionDossier.live_context.nearby_cameras.closest.name} • ${regionDossier.live_context.nearby_cameras.closest.distance_km?.toFixed?.(1) ?? regionDossier.live_context.nearby_cameras.closest.distance_km} km`
                            : 'No close camera selected'}
                        </div>
                        <ProvenanceChip claim={sectionClaim(claims, 'cameras')} available />
                      </>
                    ) : (
                      <>
                        <div className="text-xs text-[var(--text-muted)]">Unavailable</div>
                        <ProvenanceChip available={false} />
                      </>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/8 bg-black/20 p-2">
                    <div className="hud-label mb-1">NEARBY WEATHER EVENTS</div>
                    <div className="text-xs text-[var(--text-muted)]">Unavailable</div>
                    <ProvenanceChip available={false} />
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/20 p-2">
                    <div className="hud-label mb-1">TIME ZONE</div>
                    <div className="text-xs text-[var(--text-primary)]">{regionDossier.live_context.timezone_abbr || regionDossier.live_context.timezone || 'Unavailable'}</div>
                    <div className="text-[8px] text-[var(--text-muted)] mt-1">Live context updates when you right-click or tap supported events.</div>
                  </div>
                </div>
              </div>
            )}
            {showHeadOfState && regionDossier.head_of_state && (
              <div>
                <div className="hud-label mb-0.5">HEAD OF STATE</div>
                <div className="text-xs text-[var(--gold-primary)]">{regionDossier.head_of_state.name}</div>
                <div className="text-[8px] text-[var(--text-muted)]">{regionDossier.head_of_state.position}</div>
                <ProvenanceChip claim={sectionClaim(claims, 'head_of_state')} available />
              </div>
            )}
            {showWikipedia && regionDossier.wikipedia && (
              <div>
                <div className="hud-label mb-1">INTELLIGENCE BRIEF</div>
                <div className="flex gap-3">
                  {regionDossier.wikipedia.thumbnail && <Image src={regionDossier.wikipedia.thumbnail} alt="" width={56} height={56} unoptimized className="w-14 h-14 rounded object-cover flex-shrink-0" />}
                  <p className="text-[8px] text-[var(--text-secondary)] leading-relaxed">{regionDossier.wikipedia.extract}</p>
                </div>
                <ProvenanceChip claim={sectionClaim(claims, 'wikipedia')} available />
              </div>
            )}
            {claims.length > 0 && (
              <div>
                <div className="hud-label mb-1">CLAIMS · PROCEDENCIA</div>
                <ul className="space-y-1.5">
                  {claims.map((claim) => (
                    <li key={claim.id} className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
                      <p className="text-[8px] leading-relaxed text-[var(--text-secondary)]">{claim.text}</p>
                      <ProvenanceChip claim={claim} available />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
