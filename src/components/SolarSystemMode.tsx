'use client';

import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getDashboardCopy, type Locale } from '@/lib/i18n';

export type CelestialBodyId = 'earth' | 'moon' | 'mars' | 'venus' | 'jupiter' | 'saturn' | 'neptune';

interface CelestialBody {
  id: CelestialBodyId;
  name: string;
  code: string;
  diameter: string;
  day: string;
  accent: string;
  glow: string;
  texture: string;
  sceneScale: string;
  rotationDuration: number;
  rotationDirection?: 1 | -1;
  textureSizeLarge?: string;
  textureSizeSmall?: string;
  highlightGradient: string;
  shadowGradient: string;
  atmosphereGradient?: string;
  surfaceOverlay?: string;
  starfieldOpacity: number;
  backdropGradient: string;
  orbitTint: string;
  vistaLabel: string;
  chipGlow?: string;
  detailPill: string;
}

const BODIES: CelestialBody[] = [
  {
    id: 'earth',
    name: 'Earth',
    code: 'SOL-03',
    diameter: '12,742 km',
    day: '23h 56m',
    accent: '#00E5FF',
    glow: 'rgba(0,229,255,0.34)',
    texture: '/planet-textures/2k_earth_daymap.jpg',
    sceneScale: 'scale-100',
    rotationDuration: 120,
    textureSizeLarge: '200% 100%',
    textureSizeSmall: '190% 100%',
    highlightGradient: 'radial-gradient(circle at 28% 24%, rgba(255,255,255,0.34), transparent 22%)',
    shadowGradient: 'radial-gradient(circle at 76% 72%, rgba(3,10,24,0.56), transparent 50%)',
    atmosphereGradient: 'radial-gradient(circle at 48% 48%, transparent 57%, rgba(74,222,255,0.16) 73%, rgba(0,10,22,0.88) 100%)',
    surfaceOverlay: 'linear-gradient(115deg, rgba(84,216,255,0.08), transparent 24%, transparent 72%, rgba(2,12,28,0.18))',
    starfieldOpacity: 0.24,
    backdropGradient: 'radial-gradient(circle at 50% 40%, rgba(9,36,58,0.78), rgba(2,7,18,0.95) 56%, #020712 100%)',
    orbitTint: 'rgba(58,196,255,0.18)',
    vistaLabel: 'HOME INTELLIGENCE SURFACE',
    chipGlow: '0 0 14px rgba(0,229,255,0.18)',
    detailPill: 'OCEANIC THERMAL CLOUD BELT',
  },
  {
    id: 'moon',
    name: 'Moon',
    code: 'LUNA-01',
    diameter: '3,474 km',
    day: '27.3 d',
    accent: '#CBD5E1',
    glow: 'rgba(203,213,225,0.26)',
    texture: '/planet-textures/2k_moon.jpg',
    sceneScale: 'scale-100',
    rotationDuration: 164,
    textureSizeLarge: '208% 100%',
    textureSizeSmall: '194% 100%',
    highlightGradient: 'radial-gradient(circle at 30% 26%, rgba(255,255,255,0.26), transparent 19%)',
    shadowGradient: 'radial-gradient(circle at 78% 74%, rgba(0,0,0,0.58), transparent 50%)',
    atmosphereGradient: 'radial-gradient(circle at 50% 50%, transparent 62%, rgba(201,208,216,0.10) 78%, rgba(4,8,18,0.92) 100%)',
    surfaceOverlay: 'linear-gradient(120deg, rgba(255,255,255,0.05), transparent 22%, rgba(0,0,0,0.10) 82%)',
    starfieldOpacity: 0.34,
    backdropGradient: 'radial-gradient(circle at 50% 42%, rgba(56,62,72,0.32), rgba(2,7,18,0.96) 58%, #020712 100%)',
    orbitTint: 'rgba(203,213,225,0.14)',
    vistaLabel: 'REGOLITH SCAN VISTA',
    chipGlow: '0 0 12px rgba(203,213,225,0.14)',
    detailPill: 'CRATERED SILICATE RELIEF',
  },
  {
    id: 'mars',
    name: 'Mars',
    code: 'ARES-04',
    diameter: '6,779 km',
    day: '24h 37m',
    accent: '#F97316',
    glow: 'rgba(249,115,22,0.36)',
    texture: '/planet-textures/2k_mars.jpg',
    sceneScale: 'scale-100',
    rotationDuration: 82,
    textureSizeLarge: '216% 100%',
    textureSizeSmall: '196% 100%',
    highlightGradient: 'radial-gradient(circle at 26% 22%, rgba(255,205,168,0.24), transparent 18%)',
    shadowGradient: 'radial-gradient(circle at 72% 72%, rgba(18,4,0,0.60), transparent 48%)',
    atmosphereGradient: 'radial-gradient(circle at 50% 50%, transparent 57%, rgba(249,115,22,0.12) 73%, rgba(37,10,3,0.92) 100%)',
    surfaceOverlay: 'linear-gradient(105deg, rgba(255,184,118,0.10), transparent 18%, transparent 58%, rgba(85,28,8,0.22)), radial-gradient(circle at 40% 62%, rgba(255,210,160,0.09), transparent 26%)',
    starfieldOpacity: 0.22,
    backdropGradient: 'radial-gradient(circle at 50% 38%, rgba(58,18,8,0.76), rgba(18,8,6,0.94) 55%, #020712 100%)',
    orbitTint: 'rgba(249,115,22,0.18)',
    vistaLabel: 'DUST STORM RECON VISTA',
    chipGlow: '0 0 16px rgba(249,115,22,0.18)',
    detailPill: 'OXIDE RIDGES · THIN ATMOSPHERE',
  },
  {
    id: 'venus',
    name: 'Venus',
    code: 'APH-02',
    diameter: '12,104 km',
    day: '243 d',
    accent: '#FACC15',
    glow: 'rgba(250,204,21,0.28)',
    texture: '/planet-textures/2k_venus_surface.jpg',
    sceneScale: 'scale-100',
    rotationDuration: 188,
    rotationDirection: -1,
    textureSizeLarge: '220% 100%',
    textureSizeSmall: '198% 100%',
    highlightGradient: 'radial-gradient(circle at 26% 24%, rgba(255,246,188,0.32), transparent 19%)',
    shadowGradient: 'radial-gradient(circle at 78% 70%, rgba(46,22,0,0.48), transparent 50%)',
    atmosphereGradient: 'radial-gradient(circle at 50% 50%, transparent 52%, rgba(250,204,21,0.18) 72%, rgba(77,50,8,0.90) 100%)',
    surfaceOverlay: 'linear-gradient(90deg, rgba(255,241,186,0.08), rgba(255,200,65,0.09) 26%, transparent 46%, rgba(131,81,12,0.18) 88%)',
    starfieldOpacity: 0.18,
    backdropGradient: 'radial-gradient(circle at 50% 38%, rgba(74,45,6,0.72), rgba(14,10,7,0.94) 54%, #020712 100%)',
    orbitTint: 'rgba(250,204,21,0.17)',
    vistaLabel: 'SULFUR CLOUD VISTA',
    chipGlow: '0 0 14px rgba(250,204,21,0.16)',
    detailPill: 'OPAQUE ACIDIC ATMOSPHERE',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    code: 'JOV-05',
    diameter: '139,820 km',
    day: '9h 56m',
    accent: '#FDBA74',
    glow: 'rgba(251,146,60,0.30)',
    texture: '/planet-textures/2k_jupiter.jpg',
    sceneScale: 'scale-100',
    rotationDuration: 48,
    textureSizeLarge: '232% 100%',
    textureSizeSmall: '204% 100%',
    highlightGradient: 'radial-gradient(circle at 28% 24%, rgba(255,236,206,0.25), transparent 18%)',
    shadowGradient: 'radial-gradient(circle at 74% 72%, rgba(33,16,4,0.56), transparent 50%)',
    atmosphereGradient: 'radial-gradient(circle at 50% 50%, transparent 58%, rgba(253,186,116,0.11) 74%, rgba(13,8,6,0.88) 100%)',
    surfaceOverlay: 'repeating-linear-gradient(180deg, rgba(255,232,204,0.10) 0 7%, rgba(201,126,68,0.10) 7% 13%, rgba(255,216,179,0.07) 13% 21%, rgba(98,58,31,0.10) 21% 27%), radial-gradient(circle at 63% 60%, rgba(179,74,42,0.22) 0 5%, transparent 10%)',
    starfieldOpacity: 0.15,
    backdropGradient: 'radial-gradient(circle at 50% 40%, rgba(68,34,10,0.74), rgba(15,10,7,0.95) 54%, #020712 100%)',
    orbitTint: 'rgba(251,146,60,0.16)',
    vistaLabel: 'GAS GIANT STORM VISTA',
    chipGlow: '0 0 18px rgba(251,146,60,0.18)',
    detailPill: 'BAND SHEAR · RED STORM SIGNATURE',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    code: 'CRN-06',
    diameter: '116,460 km',
    day: '10h 33m',
    accent: '#FDE68A',
    glow: 'rgba(253,230,138,0.28)',
    texture: '/planet-textures/2k_saturn.jpg',
    sceneScale: 'scale-100',
    rotationDuration: 58,
    textureSizeLarge: '226% 100%',
    textureSizeSmall: '200% 100%',
    highlightGradient: 'radial-gradient(circle at 30% 24%, rgba(255,246,210,0.25), transparent 19%)',
    shadowGradient: 'radial-gradient(circle at 76% 72%, rgba(24,17,5,0.54), transparent 50%)',
    atmosphereGradient: 'radial-gradient(circle at 50% 50%, transparent 58%, rgba(253,230,138,0.11) 74%, rgba(12,10,6,0.88) 100%)',
    surfaceOverlay: 'repeating-linear-gradient(180deg, rgba(255,236,184,0.08) 0 9%, rgba(146,115,56,0.10) 9% 16%, rgba(255,227,153,0.05) 16% 22%, rgba(84,70,41,0.10) 22% 29%)',
    starfieldOpacity: 0.16,
    backdropGradient: 'radial-gradient(circle at 50% 38%, rgba(56,41,11,0.72), rgba(11,9,7,0.94) 54%, #020712 100%)',
    orbitTint: 'rgba(253,230,138,0.19)',
    vistaLabel: 'RING PLANE OBSERVATORY',
    chipGlow: '0 0 18px rgba(253,230,138,0.18)',
    detailPill: 'RING SHADOW · GAS SHEAR',
  },
  {
    id: 'neptune',
    name: 'Neptune',
    code: 'NEP-08',
    diameter: '49,244 km',
    day: '16h 6m',
    accent: '#60A5FA',
    glow: 'rgba(96,165,250,0.34)',
    texture: '/planet-textures/2k_neptune.jpg',
    sceneScale: 'scale-100',
    rotationDuration: 68,
    rotationDirection: -1,
    textureSizeLarge: '214% 100%',
    textureSizeSmall: '196% 100%',
    highlightGradient: 'radial-gradient(circle at 28% 22%, rgba(194,228,255,0.28), transparent 18%)',
    shadowGradient: 'radial-gradient(circle at 76% 76%, rgba(4,14,40,0.58), transparent 52%)',
    atmosphereGradient: 'radial-gradient(circle at 50% 50%, transparent 56%, rgba(96,165,250,0.15) 74%, rgba(3,12,38,0.92) 100%)',
    surfaceOverlay: 'linear-gradient(115deg, rgba(196,230,255,0.07), transparent 24%, rgba(30,64,175,0.12) 74%), radial-gradient(circle at 62% 58%, rgba(129,191,255,0.14), transparent 18%)',
    starfieldOpacity: 0.30,
    backdropGradient: 'radial-gradient(circle at 50% 38%, rgba(14,34,88,0.70), rgba(3,9,28,0.95) 56%, #020712 100%)',
    orbitTint: 'rgba(96,165,250,0.18)',
    vistaLabel: 'DEEP ICE WIND VISTA',
    chipGlow: '0 0 16px rgba(96,165,250,0.18)',
    detailPill: 'COLD GAS BELTS · BLUE HAZE',
  },
];

const bodyById = Object.fromEntries(BODIES.map((body) => [body.id, body])) as Record<CelestialBodyId, CelestialBody>;

type ObservatoryProfile = {
  nasaName: string;
  mission: string;
  starField: string;
  meteorStream: string;
  smallBodies: string;
  radiant: string;
  reference: string;
  metrics: [string, string, string];
};

const OBSERVATORY_PROFILES: Record<Exclude<CelestialBodyId, 'earth'>, ObservatoryProfile> = {
  moon: {
    nasaName: 'NASA LRO / ARTEMIS REFERENCE',
    mission: 'LUNAR ORBITAL RECONNAISSANCE',
    starField: 'Milky Way background · near-Earth parallax grid',
    meteorStream: 'Sporadic micrometeoroid flux · no atmosphere shield',
    smallBodies: 'Cislunar debris watch · translunar injection corridors',
    radiant: 'Lunar apex / anti-apex dust population',
    reference: 'Reference: NASA LRO + Meteoroid Environment Office style data layer',
    metrics: ['NO WEATHER', 'IMPACT GARDENING', 'POLAR ICE WATCH'],
  },
  mars: {
    nasaName: 'NASA MRO / JPL HORIZONS REFERENCE',
    mission: 'MARS RECONNAISSANCE ORBITER CONTEXT',
    starField: 'Galactic plane backdrop · Phobos/Deimos orbital traces',
    meteorStream: 'Martian meteor entries · thin-atmosphere ablation',
    smallBodies: 'Mars-crossing asteroid family · NEO transfer corridor',
    radiant: 'Anti-solar radiant · ecliptic dust lane',
    reference: 'Reference: NASA/JPL Horizons + MRO observational vocabulary',
    metrics: ['PHOBOS TRACK', 'DUST OPTICAL DEPTH', 'MARS CROSSERS'],
  },
  venus: {
    nasaName: 'NASA DAVINCI / VERITAS REFERENCE',
    mission: 'VENUS ATMOSPHERIC OBSERVATORY CONTEXT',
    starField: 'Inner-system star wash · solar glare suppression',
    meteorStream: 'High-speed inner-system dust impactors',
    smallBodies: 'Atira/Aten-like inner NEO corridor',
    radiant: 'Sunward dust stream · dawn/dusk sector',
    reference: 'Reference: NASA Venus mission concepts + small-body classes',
    metrics: ['CLOUD DECK', 'SOLAR GLARE', 'INNER NEO'],
  },
  jupiter: {
    nasaName: 'NASA JUNO / JPL SMALL-BODY REFERENCE',
    mission: 'JOVIAN SYSTEM OBSERVATORY CONTEXT',
    starField: 'Deep star catalog · galactic background behind gas giant',
    meteorStream: 'Shoemaker-Levy class impact watch · cometary fragments',
    smallBodies: 'Trojan swarms L4/L5 · irregular moon/debris family',
    radiant: 'Outer-system comet radiant · high-gravity capture field',
    reference: 'Reference: NASA Juno + JPL small-body dynamics vocabulary',
    metrics: ['TROJAN FIELD', 'COMET WATCH', 'MAGNETOSPHERE'],
  },
  saturn: {
    nasaName: 'NASA CASSINI / RINGPLANE REFERENCE',
    mission: 'SATURN RINGPLANE OBSERVATORY CONTEXT',
    starField: 'Occultation-style star background · ringplane cuts',
    meteorStream: 'Ring particle impact flashes · icy meteoroid stream',
    smallBodies: 'Ring-plane debris · shepherd moon resonance tracks',
    radiant: 'E-ring / Enceladus plume dust corridor',
    reference: 'Reference: NASA Cassini ringplane science vocabulary',
    metrics: ['RING DUST', 'TITAN TRACK', 'ICE PARTICLES'],
  },
  neptune: {
    nasaName: 'NASA VOYAGER / DEEP SKY REFERENCE',
    mission: 'OUTER PLANET DEEP-FIELD CONTEXT',
    starField: 'Deep sky catalog · low solar illumination field',
    meteorStream: 'Kuiper-belt dust stream · distant cometary debris',
    smallBodies: 'Trans-Neptunian object corridor · scattered disk traces',
    radiant: 'Far-field ecliptic radiant · cold-object population',
    reference: 'Reference: NASA Voyager + outer solar system object classes',
    metrics: ['TNO WATCH', 'KUIPER DUST', 'LOW LIGHT'],
  },
};

const STAR_CATALOG_POINTS = [
  { left: '8%', top: '16%', size: 2, label: 'SIRIUS' },
  { left: '18%', top: '70%', size: 1, label: 'RIGEL' },
  { left: '30%', top: '24%', size: 1.5, label: 'VEGA' },
  { left: '43%', top: '12%', size: 1, label: 'POLARIS' },
  { left: '66%', top: '18%', size: 2, label: 'ARCTURUS' },
  { left: '78%', top: '62%', size: 1.2, label: 'ALTAIR' },
  { left: '91%', top: '35%', size: 1.6, label: 'DENEB' },
  { left: '55%', top: '82%', size: 1, label: 'SPICA' },
] as const;

const METEOR_TRACKS = [
  { left: '12%', top: '28%', width: 84, rotate: -22, delay: 0.2 },
  { left: '68%', top: '30%', width: 110, rotate: -34, delay: 1.4 },
  { left: '26%', top: '76%', width: 76, rotate: -18, delay: 2.1 },
  { left: '76%', top: '78%', width: 92, rotate: -28, delay: 3.0 },
] as const;

const DSN_STATIONS = [
  { label: 'DSN GOLDSTONE', left: '13%', top: '58%' },
  { label: 'DSN MADRID', left: '43%', top: '18%' },
  { label: 'DSN CANBERRA', left: '77%', top: '55%' },
] as const;

function getAdjacentBody(selected: CelestialBodyId, direction: -1 | 1) {
  const index = BODIES.findIndex((body) => body.id === selected);
  const nextIndex = (index + direction + BODIES.length) % BODIES.length;
  return BODIES[nextIndex].id;
}

function PlanetAtmosphere({ body, large = false }: { body: CelestialBody; large?: boolean }) {
  if (!body.atmosphereGradient) return null;

  return (
    <motion.div
      aria-hidden="true"
      className={`absolute inset-0 rounded-full ${large ? 'blur-[1px]' : ''}`}
      style={{ background: body.atmosphereGradient, mixBlendMode: 'screen', opacity: large ? 0.95 : 0.72 }}
      animate={large ? { rotate: body.rotationDirection === -1 ? -360 : 360 } : undefined}
      transition={large ? { repeat: Infinity, duration: Math.max(body.rotationDuration * 1.8, 110), ease: 'linear' } : undefined}
    />
  );
}

function PlanetSurfaceFx({ body, large = false }: { body: CelestialBody; large?: boolean }) {
  const fx: JSX.Element[] = [];

  if (body.surfaceOverlay) {
    fx.push(
      <motion.div
        key="surface"
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{ background: body.surfaceOverlay, opacity: large ? 0.88 : 0.66, mixBlendMode: body.id === 'jupiter' ? 'screen' : 'soft-light' }}
        animate={large ? { backgroundPositionX: body.rotationDirection === -1 ? ['100%', '0%'] : ['0%', '100%'] } : undefined}
        transition={large ? { repeat: Infinity, duration: Math.max(body.rotationDuration * 0.72, 28), ease: 'linear' } : undefined}
      />,
    );
  }

  if (body.id === 'mars') {
    fx.push(
      <motion.div
        key="mars-dust"
        aria-hidden="true"
        className="absolute inset-[7%] rounded-full"
        style={{
          background: 'radial-gradient(circle at 52% 44%, transparent 0 46%, rgba(255,173,92,0.13) 61%, transparent 78%), radial-gradient(circle at 28% 68%, rgba(255,210,160,0.12), transparent 20%)',
          opacity: large ? 0.95 : 0.68,
          mixBlendMode: 'screen',
          filter: large ? 'blur(1px)' : 'blur(0.5px)',
        }}
        animate={large ? { rotate: 360 } : undefined}
        transition={large ? { repeat: Infinity, duration: 62, ease: 'linear' } : undefined}
      />,
    );
    fx.push(
      <motion.div
        key="mars-polar-cap"
        aria-hidden="true"
        className="absolute left-[41%] top-[11%] h-[12%] w-[22%] -translate-x-1/2 rounded-full"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,238,210,0.42), rgba(255,210,165,0.14) 48%, transparent 72%)',
          filter: large ? 'blur(0.8px)' : 'blur(0.4px)',
          opacity: large ? 0.82 : 0.58,
          mixBlendMode: 'screen',
        }}
      />,
    );
    fx.push(
      <motion.div
        key="mars-dust-front"
        aria-hidden="true"
        className="absolute inset-[5%] rounded-full"
        style={{
          background: 'linear-gradient(102deg, transparent 11%, rgba(255,168,86,0.14) 28%, transparent 42%, rgba(255,210,148,0.10) 58%, transparent 76%), radial-gradient(circle at 70% 38%, rgba(255,129,58,0.12), transparent 20%)',
          opacity: large ? 0.78 : 0.48,
          mixBlendMode: 'screen',
        }}
        animate={large ? { rotate: [0, 5, 0], opacity: [0.5, 0.82, 0.5] } : undefined}
        transition={large ? { repeat: Infinity, duration: 14, ease: 'easeInOut' } : undefined}
      />,
    );
  }

  if (body.id === 'venus') {
    fx.push(
      <motion.div
        key="venus-haze"
        aria-hidden="true"
        className="absolute inset-[1%] rounded-full"
        style={{
          background: 'radial-gradient(circle at 34% 30%, rgba(255,249,208,0.16), transparent 24%), linear-gradient(180deg, rgba(255,224,128,0.08), rgba(186,117,15,0.15) 55%, rgba(255,228,162,0.10) 100%)',
          opacity: large ? 0.94 : 0.72,
          mixBlendMode: 'screen',
        }}
        animate={large ? { rotate: -360 } : undefined}
        transition={large ? { repeat: Infinity, duration: 96, ease: 'linear' } : undefined}
      />,
    );
  }

  if (body.id === 'jupiter') {
    fx.push(
      <motion.div
        key="jupiter-bands"
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          background: 'repeating-linear-gradient(180deg, rgba(255,248,228,0.07) 0 4%, rgba(170,113,58,0.16) 4% 9%, rgba(250,213,178,0.07) 9% 13%, rgba(116,73,45,0.15) 13% 18%, rgba(255,238,214,0.05) 18% 22%)',
          opacity: large ? 1 : 0.74,
          mixBlendMode: 'soft-light',
        }}
        animate={large ? { backgroundPositionY: ['0%', '100%'] } : undefined}
        transition={large ? { repeat: Infinity, duration: 44, ease: 'linear' } : undefined}
      />,
    );
    fx.push(
      <motion.div
        key="jupiter-storm"
        aria-hidden="true"
        className="absolute left-[61%] top-[59%] h-[18%] w-[23%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: 'radial-gradient(ellipse at 38% 42%, rgba(255,231,207,0.48), rgba(202,82,45,0.42) 38%, rgba(118,39,21,0.26) 63%, transparent 82%)',
          boxShadow: '0 0 28px rgba(183,69,36,0.22), inset 0 0 18px rgba(255,232,199,0.12)',
          opacity: large ? 0.95 : 0.7,
        }}
        animate={large ? { x: [0, 4, 0], y: [0, -2, 0] } : undefined}
        transition={large ? { repeat: Infinity, duration: 10, ease: 'easeInOut' } : undefined}
      />,
    );
    fx.push(
      <motion.div
        key="jupiter-equator-shear"
        aria-hidden="true"
        className="absolute left-0 top-[43%] h-[12%] w-full rounded-full"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,241,214,0.16), rgba(161,96,51,0.20), rgba(255,236,208,0.13), transparent)',
          opacity: large ? 0.82 : 0.55,
          mixBlendMode: 'screen',
        }}
        animate={large ? { x: [-10, 12, -10] } : undefined}
        transition={large ? { repeat: Infinity, duration: 9.5, ease: 'easeInOut' } : undefined}
      />,
    );
  }

  if (body.id === 'saturn') {
    fx.push(
      <motion.div
        key="saturn-bands"
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          background: 'repeating-linear-gradient(180deg, rgba(255,241,196,0.04) 0 6%, rgba(138,102,47,0.10) 6% 12%, rgba(255,226,145,0.04) 12% 18%)',
          opacity: large ? 0.92 : 0.68,
          mixBlendMode: 'overlay',
        }}
        animate={large ? { backgroundPositionY: ['0%', '100%'] } : undefined}
        transition={large ? { repeat: Infinity, duration: 56, ease: 'linear' } : undefined}
      />,
    );
    fx.push(
      <motion.div
        key="saturn-ring-shadow"
        aria-hidden="true"
        className="absolute left-1/2 top-[55%] h-[9%] w-[84%] -translate-x-1/2 -rotate-[13deg] rounded-full"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(16,12,6,0.38), rgba(0,0,0,0.24), transparent)',
          opacity: large ? 0.74 : 0.42,
          mixBlendMode: 'multiply',
          filter: large ? 'blur(2px)' : 'blur(1px)',
        }}
      />,
    );
  }

  if (body.id === 'neptune') {
    fx.push(
      <motion.div
        key="neptune-haze"
        aria-hidden="true"
        className="absolute inset-[3%] rounded-full"
        style={{
          background: 'radial-gradient(circle at 38% 28%, rgba(191,228,255,0.16), transparent 20%), linear-gradient(180deg, rgba(59,130,246,0.08), rgba(96,165,250,0.12) 52%, rgba(15,23,42,0.12) 100%)',
          opacity: large ? 0.92 : 0.68,
          mixBlendMode: 'screen',
        }}
        animate={large ? { rotate: -360 } : undefined}
        transition={large ? { repeat: Infinity, duration: 74, ease: 'linear' } : undefined}
      />,
    );
  }

  return <>{fx}</>;
}

function PlanetSphere({
  body,
  large = false,
  interactive = false,
  rotationOffset = 0,
  zoom = 1,
  resetKey = 0,
  onRotateDrag,
}: {
  body: CelestialBody;
  large?: boolean;
  interactive?: boolean;
  rotationOffset?: number;
  zoom?: number;
  resetKey?: number;
  onRotateDrag?: (deltaX: number) => void;
}) {
  const size = large
    ? 'h-[min(64vh,700px)] w-[min(64vh,700px)] max-h-[78vw] max-w-[78vw] md:max-h-none md:max-w-none'
    : 'h-10 w-10';
  const rotationDirection = body.rotationDirection === -1 ? -1 : 1;
  const controlledPosition = `${rotationOffset}% 50%`;

  return (
    <motion.div
      key={interactive ? `${body.id}-${resetKey}` : body.id}
      className={`relative shrink-0 ${large ? body.sceneScale : ''} ${interactive ? 'pointer-events-auto cursor-grab active:cursor-grabbing' : ''}`}
      drag={interactive}
      dragMomentum={false}
      dragElastic={0.12}
      dragConstraints={interactive ? { left: -220, right: 220, top: -120, bottom: 120 } : undefined}
      style={{ scale: large ? zoom : 1 }}
      whileDrag={interactive ? { scale: zoom * 1.018 } : undefined}
      onDrag={interactive ? (_event, info: PanInfo) => onRotateDrag?.(info.delta.x * 0.28) : undefined}
      onDoubleClick={interactive ? () => onRotateDrag?.(-rotationOffset) : undefined}
      title={interactive ? 'Drag to move and rotate planet.' : `${body.name} — ${body.diameter}`}
    >
      {body.id === 'saturn' && large && (
        <motion.div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 z-0 h-[33%] w-[184%] -translate-x-1/2 -translate-y-1/2 -rotate-[13deg] rounded-full border border-[#f7d98a]/42"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(253,230,138,0.06) 18%, rgba(253,230,138,0.26) 47%, rgba(253,230,138,0.08) 78%, transparent 100%)',
            boxShadow: '0 0 44px rgba(253,230,138,0.18)',
          }}
          animate={{ rotate: [-13, -10, -13], scaleX: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }}
        />
      )}
      {body.id === 'saturn' && large && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-[31%] w-[178%] -translate-x-1/2 -translate-y-1/2 -rotate-[13deg] rounded-full border-t border-[#ffe59a]/55"
          style={{
            background: 'linear-gradient(90deg, transparent 6%, rgba(255,236,170,0.04) 22%, rgba(255,238,184,0.20) 46%, rgba(255,220,128,0.07) 72%, transparent 94%)',
            clipPath: 'polygon(0 47%, 100% 47%, 100% 100%, 0 100%)',
            filter: 'drop-shadow(0 0 18px rgba(253,230,138,0.18))',
          }}
          animate={{ rotate: [-13, -10, -13], scaleX: [1, 1.018, 1] }}
          transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }}
        />
      )}

      <motion.div
        className={`relative z-10 overflow-hidden rounded-full border border-white/12 ${size}`}
        style={{
          backgroundImage: `url(${body.texture})`,
          backgroundSize: large ? body.textureSizeLarge ?? '200% 100%' : body.textureSizeSmall ?? '190% 100%',
          backgroundPosition: interactive ? controlledPosition : rotationDirection === -1 ? '100% 50%' : '0% 50%',
          boxShadow: `0 0 ${large ? 124 : 24}px ${body.glow}, inset -52px -38px 88px rgba(0,0,0,0.56), inset 24px 18px 42px rgba(255,255,255,0.13)`,
        }}
        animate={large && !interactive ? { backgroundPositionX: rotationDirection === -1 ? ['100%', '0%'] : ['0%', '100%'] } : undefined}
        transition={large && !interactive ? { repeat: Infinity, duration: body.rotationDuration, ease: 'linear' } : undefined}
      >
        <div className="absolute inset-0" style={{ background: body.highlightGradient }} />
        <div className="absolute inset-0" style={{ background: body.shadowGradient }} />
        <PlanetSurfaceFx body={body} large={large} />
        <PlanetAtmosphere body={body} large={large} />
        <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
        {large && <div className="absolute -inset-[12%] rounded-full bg-[radial-gradient(circle_at_50%_50%,transparent_56%,rgba(2,7,18,0.34)_72%,rgba(2,7,18,0.82)_100%)]" />}
      </motion.div>

      {interactive && large && (
        <div className="pointer-events-none absolute left-1/2 top-[calc(100%+0.75rem)] z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[7px] font-mono tracking-[0.18em] text-[var(--text-secondary)] backdrop-blur-md">
          DRAG PLANET · MOVE / ROTATE
        </div>
      )}

      {body.id === 'saturn' && !large && (
        <div className="absolute left-1/2 top-1/2 h-[30%] w-[174%] -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-full border border-[#f7d98a]/42" />
      )}
    </motion.div>
  );
}

function PlanetChip({ body, active, onClick, compact = false }: { body: CelestialBody; active: boolean; onClick: () => void; compact?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex snap-center flex-col items-center rounded-2xl border transition-all ${compact ? 'min-w-[4.2rem] gap-1 px-2 py-2' : 'min-w-[5.1rem] gap-1.5 px-3 py-2.5'} ${active ? 'bg-white/[0.085]' : 'bg-white/[0.018] hover:bg-white/[0.05]'}`}
      style={{ borderColor: active ? body.accent : 'rgba(255,255,255,0.08)', boxShadow: active ? body.chipGlow : 'none' }}
      title={`${body.name} — ${body.diameter}`}
    >
      {active && <span className="absolute -top-1 h-1.5 w-1.5 rounded-full" style={{ background: body.accent, boxShadow: `0 0 12px ${body.accent}` }} />}
      <PlanetSphere body={body} />
      <span className={`${compact ? 'text-[6px]' : 'text-[7px]'} font-mono font-bold uppercase tracking-[0.18em] text-[var(--text-primary)]`}>{body.name}</span>
    </button>
  );
}

function DesktopPlanetSlider({ selected, activeBody, onSelect, onReturnEarth, locale }: { selected: CelestialBodyId; activeBody: CelestialBody; onSelect: (body: CelestialBodyId) => void; onReturnEarth?: () => void; locale: Locale }) {
  const copy = getDashboardCopy(locale);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2.6, duration: 0.45 }}
      className="absolute bottom-[112px] left-1/2 z-[260] hidden w-[min(48rem,54vw)] -translate-x-1/2 pointer-events-auto lg:block"
    >
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#050b14]/64 px-4 py-3 shadow-[0_18px_64px_rgba(0,0,0,0.30)] backdrop-blur-xl">
        <div className="absolute inset-x-8 top-1/2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <button
            onClick={() => onSelect(getAdjacentBody(selected, -1))}
            className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[8px] font-mono tracking-[0.2em] text-[var(--text-secondary)] transition-colors hover:border-white/20 hover:text-[var(--text-primary)]"
          >
            {copy.solar.prev}
          </button>
          <div className="text-center">
            <div className="text-[8px] font-mono tracking-[0.34em] text-[var(--text-secondary)]">PLANETARY SLIDER</div>
            <div className="mt-1 text-[10px] font-semibold tracking-[0.22em] text-[var(--text-primary)]">
              {selected === 'earth' ? 'EARTH OPERATIONS ACTIVE' : `${activeBody.name.toUpperCase()} VISUAL VISTA`}
            </div>
          </div>
          <button
            onClick={() => onSelect(getAdjacentBody(selected, 1))}
            className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[8px] font-mono tracking-[0.2em] text-[var(--text-secondary)] transition-colors hover:border-white/20 hover:text-[var(--text-primary)]"
          >
            {copy.solar.next}
          </button>
        </div>

        <div className="flex snap-x snap-mandatory items-center justify-between gap-2 overflow-x-auto pb-1 styled-scrollbar">
          {BODIES.map((body) => (
            <PlanetChip key={body.id} body={body} active={body.id === selected} onClick={() => {
              if (body.id === 'earth') {
                if (onReturnEarth) onReturnEarth();
                else onSelect('earth');
                return;
              }
              onSelect(body.id);
            }} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function MobilePlanetRail({
  selected,
  activeBody,
  zoom,
  autoRotate,
  onSelect,
  onReturnEarth,
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleAutoRotate,
  locale,
}: {
  selected: CelestialBodyId;
  activeBody: CelestialBody;
  zoom: number;
  autoRotate: boolean;
  onSelect: (body: CelestialBodyId) => void;
  onReturnEarth?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onToggleAutoRotate: () => void;
  locale: Locale;
}) {
  const copy = getDashboardCopy(locale);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2.4, duration: 0.42 }}
      className="absolute bottom-[76px] left-1/2 z-[260] w-[calc(100vw-1.25rem)] max-w-[29rem] -translate-x-1/2 pointer-events-auto lg:hidden"
    >
      <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#050b14]/80 px-3 py-2.5 shadow-[0_16px_54px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <div className="text-[7px] font-mono tracking-[0.28em] text-[var(--text-secondary)]">{copy.solar.mode}</div>
            <div className="mt-1 text-[9px] font-semibold tracking-[0.16em] text-[var(--text-primary)]">
              {selected === 'earth' ? 'EARTH OPS' : `${activeBody.name.toUpperCase()} VISTA`}
            </div>
          </div>
          <button
            onClick={() => {
              if (onReturnEarth) onReturnEarth();
              else onSelect('earth');
            }}
            className={`rounded-full border px-2.5 py-1 text-[7px] font-mono tracking-[0.18em] transition-colors ${selected === 'earth' ? 'border-[rgba(34,211,238,0.42)] bg-[rgba(34,211,238,0.12)] text-[var(--cyan-primary)]' : 'border-white/10 bg-white/[0.035] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {copy.solar.returnEarth}
          </button>
        </div>
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 styled-scrollbar">
          {BODIES.map((body) => (
            <PlanetChip key={body.id} body={body} active={body.id === selected} onClick={() => {
              if (body.id === 'earth') {
                if (onReturnEarth) onReturnEarth();
                else onSelect('earth');
                return;
              }
              onSelect(body.id);
            }} compact />
          ))}
        </div>

        {selected !== 'earth' && (
          <div className="mt-2 rounded-[1.1rem] border border-white/8 bg-black/20 p-2">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[6px] font-mono tracking-[0.24em] text-[var(--text-secondary)]">{copy.solar.planetControl}</span>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[6px] font-mono tracking-[0.16em]" style={{ color: autoRotate ? activeBody.accent : 'var(--text-secondary)' }}>
                {autoRotate ? copy.solar.auto : copy.solar.manual} · {(zoom * 100).toFixed(0)}%
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <button onClick={onZoomOut} className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-[6px] font-mono tracking-[0.12em] text-[var(--text-secondary)]">{copy.solar.zoomOut}</button>
              <button onClick={onReset} className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-[6px] font-mono tracking-[0.12em] text-[var(--text-secondary)]">{copy.solar.reset}</button>
              <button onClick={onZoomIn} className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-[6px] font-mono tracking-[0.12em] text-[var(--text-secondary)]">{copy.solar.zoomIn}</button>
              <button onClick={onToggleAutoRotate} className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-[6px] font-mono tracking-[0.12em] text-[var(--text-secondary)]">
                {autoRotate ? copy.solar.pauseRotate.split(' ')[0] : copy.solar.auto}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PlanetControlDock({
  body,
  locale,
  zoom,
  autoRotate,
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleAutoRotate,
  onReturnEarth,
}: {
  body: CelestialBody;
  locale: Locale;
  zoom: number;
  autoRotate: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onToggleAutoRotate: () => void;
  onReturnEarth: () => void;
}) {
  const copy = getDashboardCopy(locale);
  const buttonClass = 'rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1.5 text-[7px] font-mono tracking-[0.16em] text-[var(--text-secondary)] transition-colors hover:border-white/20 hover:text-[var(--text-primary)]';

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.22, duration: 0.36 }}
      className="absolute right-6 top-[calc(18%+13.5rem)] z-[252] hidden w-[18.5rem] pointer-events-auto lg:block"
    >
      <div className="overflow-hidden rounded-[1.55rem] border border-white/10 bg-[rgba(7,12,18,0.56)] px-3.5 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[7px] font-mono tracking-[0.28em] text-[var(--text-secondary)]">{copy.solar.planetControl}</div>
            <div className="mt-1 text-[10px] font-semibold tracking-[0.18em] text-[var(--text-primary)]">{body.name.toUpperCase()} · {(zoom * 100).toFixed(0)}%</div>
          </div>
          <div className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[7px] font-mono tracking-[0.16em]" style={{ color: autoRotate ? body.accent : 'var(--text-secondary)' }}>
            {autoRotate ? copy.solar.auto : copy.solar.manual}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <button onClick={onZoomOut} className={buttonClass}>{copy.solar.zoomOut}</button>
          <button onClick={onReset} className={buttonClass}>{copy.solar.reset}</button>
          <button onClick={onZoomIn} className={buttonClass}>{copy.solar.zoomIn}</button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button onClick={onToggleAutoRotate} className={buttonClass}>{autoRotate ? copy.solar.pauseRotate : copy.solar.autoRotate}</button>
          <button onClick={onReturnEarth} className="rounded-full border border-[rgba(212,175,55,0.28)] bg-[rgba(212,175,55,0.08)] px-2.5 py-1.5 text-[7px] font-mono tracking-[0.16em] text-[var(--gold-primary)] transition-colors hover:border-[rgba(212,175,55,0.48)]">
            {copy.solar.returnEarth}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function OrbitalSceneAccents({ body }: { body: CelestialBody }) {
  const labelSets: Record<string, string[]> = {
    mars: ['ARES NODE', 'DUST ARC', 'PHOBOS TRACK'],
    jupiter: ['JOVIAN NET', 'IO TRACE', 'RED STORM LOCK'],
    saturn: ['RING NODE', 'TITAN TRACK', 'PLANE MARK'],
    moon: ['LUNA GRID', 'TERMINATOR', 'POLAR ARC'],
    venus: ['CLOUD LOCK', 'HEAT ARC', 'DENSE SHELL'],
    neptune: ['ICE TRACE', 'FAR ARC', 'OUTER BELT'],
  };
  const labels = labelSets[body.id] ?? ['ORBITAL', 'SCAN', 'TRACK'];

  const debrisTone = body.accent;

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[min(78vh,700px)] w-[min(78vh,700px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: body.id === 'jupiter' ? 52 : body.id === 'saturn' ? 66 : 74, ease: 'linear' }}
      >
        <div className="absolute left-[14%] top-[17%] h-2 w-2 rounded-full bg-white/70 shadow-[0_0_14px_rgba(255,255,255,0.55)]" />
        <div className="absolute right-[10%] top-[34%] h-1.5 w-1.5 rounded-full" style={{ background: debrisTone, boxShadow: `0 0 12px ${debrisTone}` }} />
        <div className="absolute bottom-[13%] left-[24%] h-2.5 w-2.5 rounded-full bg-white/50 shadow-[0_0_12px_rgba(255,255,255,0.38)]" />
      </motion.div>

      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[min(92vh,840px)] w-[min(92vh,840px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/[0.045]"
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: body.id === 'saturn' ? 92 : 108, ease: 'linear' }}
      />

      <motion.div
        aria-hidden="true"
        className="absolute left-[17%] top-[28%] h-[7px] w-[32px] rounded-full"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)', opacity: 0.82 }}
        animate={{ x: [0, 12, 0], opacity: [0.4, 0.9, 0.4] }}
        transition={{ repeat: Infinity, duration: 6.8, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute right-[18%] bottom-[24%] h-[6px] w-[28px] rounded-full"
        style={{ background: `linear-gradient(90deg, transparent, ${debrisTone}, transparent)`, opacity: 0.78 }}
        animate={{ x: [0, -10, 0], opacity: [0.3, 0.85, 0.3] }}
        transition={{ repeat: Infinity, duration: 7.4, ease: 'easeInOut' }}
      />

      <div className="absolute left-[4%] top-[44%] rounded-full border border-white/10 bg-[rgba(5,10,18,0.68)] px-3 py-1.5 text-[8px] font-mono tracking-[0.22em] text-[var(--text-secondary)] backdrop-blur-md">
        {labels[0]}
      </div>
      <div className="absolute right-[6%] top-[22%] rounded-full border border-white/10 bg-[rgba(5,10,18,0.68)] px-3 py-1.5 text-[8px] font-mono tracking-[0.22em] text-[var(--text-secondary)] backdrop-blur-md">
        {labels[1]}
      </div>
      <div className="absolute bottom-[16%] left-[50%] -translate-x-1/2 rounded-full border border-white/10 bg-[rgba(5,10,18,0.68)] px-3 py-1.5 text-[8px] font-mono tracking-[0.22em] text-[var(--text-secondary)] backdrop-blur-md">
        {labels[2]}
      </div>
    </>
  );
}

function NasaMissionHeader({ body, profile }: { body: CelestialBody; profile: ObservatoryProfile }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.36 }}
      className="absolute left-1/2 top-5 z-[255] hidden w-[min(92vw,54rem)] -translate-x-1/2 pointer-events-none lg:block"
    >
      <div className="overflow-hidden rounded-[1.4rem] border border-[rgba(118,228,234,0.22)] bg-[linear-gradient(90deg,rgba(3,11,24,0.78),rgba(5,20,35,0.64),rgba(3,11,24,0.78))] px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(118,228,234,0.68)] to-transparent" />
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-[7px] font-mono tracking-[0.34em] text-[var(--cyan-primary)]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: body.accent, boxShadow: `0 0 12px ${body.accent}` }} />
              NASA / JPL DEEP SPACE OBSERVATORY
            </div>
            <div className="mt-1 text-[13px] font-semibold tracking-[0.24em] text-[var(--text-heading)]">
              {profile.nasaName} · {body.name.toUpperCase()} TARGET LOCK
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {['HORIZONS', 'SPICE', 'DSN'].map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-1.5">
                <div className="text-[6px] font-mono tracking-[0.22em] text-[var(--text-muted)]">REF</div>
                <div className="mt-0.5 text-[8px] font-semibold tracking-[0.18em]" style={{ color: body.accent }}>{item}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[profile.starField, profile.meteorStream, profile.smallBodies, profile.radiant].map((item) => (
            <div key={item} className="min-h-10 rounded-xl border border-white/8 bg-black/20 px-2.5 py-2 text-[7px] font-mono leading-4 tracking-[0.13em] text-white/54">
              {item}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function NasaObservatoryLayer({ body, profile }: { body: CelestialBody; profile: ObservatoryProfile }) {
  return (
    <>
      <div className="absolute inset-0 opacity-60 [mask-image:radial-gradient(circle_at_center,black_0%,black_64%,transparent_100%)]">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.72) 0 1px, transparent 1.8px), radial-gradient(circle, rgba(118,228,234,0.46) 0 1px, transparent 2px), radial-gradient(circle, rgba(183,200,177,0.36) 0 1px, transparent 2.2px)',
            backgroundSize: '118px 118px, 173px 173px, 241px 241px',
            backgroundPosition: '0 0, 44px 38px, 96px 74px',
          }}
        />
      </div>

      {STAR_CATALOG_POINTS.map((star) => (
        <div
          key={star.label}
          className="absolute hidden items-center gap-1.5 md:flex"
          style={{ left: star.left, top: star.top }}
        >
          <span
            className="rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.75)]"
            style={{ width: star.size * 2.5, height: star.size * 2.5 }}
          />
          <span className="text-[6px] font-mono tracking-[0.24em] text-white/38">{star.label}</span>
        </div>
      ))}

      <div className="absolute inset-0 hidden lg:block opacity-50">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[rgba(118,228,234,0.20)] to-transparent" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gradient-to-r from-transparent via-[rgba(118,228,234,0.16)] to-transparent" />
        <div className="absolute left-1/2 top-1/2 h-[min(84vh,760px)] w-[min(84vh,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(118,228,234,0.08)]" />
      </div>

      {DSN_STATIONS.map((station) => (
        <div
          key={station.label}
          className="absolute hidden items-center gap-2 rounded-full border border-[rgba(118,228,234,0.18)] bg-[rgba(4,12,24,0.58)] px-2.5 py-1 text-[6px] font-mono tracking-[0.22em] text-[var(--cyan-primary)] backdrop-blur-md lg:flex"
          style={{ left: station.left, top: station.top }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: body.accent, boxShadow: `0 0 10px ${body.accent}` }} />
          {station.label}
        </div>
      ))}

      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[min(114vh,1040px)] w-[min(114vh,1040px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed"
        style={{ borderColor: body.orbitTint }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 180, ease: 'linear' }}
      >
        {Array.from({ length: 18 }).map((_, index) => (
          <span
            key={`belt-${index}`}
            className="absolute h-1 w-1 rounded-full bg-white/55 shadow-[0_0_8px_rgba(255,255,255,0.44)]"
            style={{
              left: `${50 + Math.cos((index / 18) * Math.PI * 2) * 49}%`,
              top: `${50 + Math.sin((index / 18) * Math.PI * 2) * 49}%`,
              opacity: index % 3 === 0 ? 0.88 : 0.45,
            }}
          />
        ))}
      </motion.div>

      {METEOR_TRACKS.map((track, index) => (
        <motion.div
          key={`meteor-${index}`}
          aria-hidden="true"
          className="absolute h-[2px] origin-right rounded-full"
          style={{
            left: track.left,
            top: track.top,
            width: track.width,
            rotate: `${track.rotate}deg`,
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.88), ${body.accent})`,
            boxShadow: `0 0 18px ${body.glow}`,
          }}
          animate={{ x: [0, 36, 0], y: [0, -14, 0], opacity: [0, 0.95, 0] }}
          transition={{ repeat: Infinity, duration: 5.8, delay: track.delay, ease: 'easeInOut' }}
        />
      ))}

      <div className="absolute left-[8%] bottom-[10%] hidden max-w-[20rem] rounded-[1.4rem] border border-white/10 bg-[rgba(3,8,16,0.54)] p-3 backdrop-blur-xl lg:block">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[7px] font-mono tracking-[0.3em] text-[var(--text-secondary)]">NASA / JPL OBSERVATORY LAYER</div>
            <div className="mt-1 text-[10px] font-semibold tracking-[0.18em] text-[var(--text-primary)]">{profile.nasaName}</div>
          </div>
          <span className="rounded-full border border-white/10 px-2 py-1 text-[6px] font-mono tracking-[0.16em]" style={{ color: body.accent }}>
            REF
          </span>
        </div>
        <div className="mt-3 grid gap-1.5">
          {[profile.starField, profile.meteorStream, profile.smallBodies, profile.radiant].map((item) => (
            <div key={item} className="rounded-xl border border-white/8 bg-white/[0.035] px-2.5 py-1.5 text-[7px] font-mono leading-4 tracking-[0.13em] text-[var(--text-muted)]">
              {item}
            </div>
          ))}
        </div>
        <div className="mt-3 text-[6px] font-mono leading-4 tracking-[0.18em] text-white/36">{profile.reference}</div>
      </div>

      <div className="absolute right-[8%] bottom-[12%] hidden w-[18rem] rounded-[1.4rem] border border-white/10 bg-[rgba(3,8,16,0.54)] p-3 backdrop-blur-xl xl:block">
        <div className="text-[7px] font-mono tracking-[0.3em] text-[var(--text-secondary)]">METEOR / SMALL-BODY WATCH</div>
        <div className="mt-2 grid grid-cols-1 gap-1.5">
          {profile.metrics.map((item) => (
            <div key={item} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.035] px-2.5 py-1.5">
              <span className="text-[7px] font-mono tracking-[0.16em] text-[var(--text-muted)]">{item}</span>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: body.accent, boxShadow: `0 0 10px ${body.accent}` }} />
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-white/8 bg-black/20 px-2.5 py-2 text-[7px] font-mono leading-4 tracking-[0.15em] text-[var(--text-secondary)]">
          Catalog labels are reference-style overlays; Earth Ops remains the live-data surface.
        </div>
      </div>
    </>
  );
}

export default function SolarSystemMode({
  selected,
  onSelect,
  onReturnEarth,
  isMobile = false,
  enabled = true,
  locale = 'en',
}: {
  selected: CelestialBodyId;
  onSelect: (body: CelestialBodyId) => void;
  onReturnEarth?: () => void;
  isMobile?: boolean;
  enabled?: boolean;
  locale?: Locale;
}) {
  const activeBody = bodyById[selected];
  const isEarth = selected === 'earth';
  const [rotationOffsets, setRotationOffsets] = useState<Partial<Record<CelestialBodyId, number>>>({});
  const [planetZoom, setPlanetZoom] = useState(1);
  const [autoRotate, setAutoRotate] = useState(true);
  const [viewResetKey, setViewResetKey] = useState(0);

  useEffect(() => {
    if (!enabled || isEarth || !autoRotate) return undefined;

    const interval = window.setInterval(() => {
      setRotationOffsets((current) => ({
        ...current,
        [selected]: ((current[selected] ?? 0) + 0.18) % 100,
      }));
    }, 120);

    return () => window.clearInterval(interval);
  }, [autoRotate, enabled, isEarth, selected]);

  const handlePlanetRotateDrag = (deltaX: number) => {
    setAutoRotate(false);
    setRotationOffsets((current) => ({
      ...current,
      [selected]: ((current[selected] ?? 0) + deltaX) % 100,
    }));
  };

  const resetPlanetView = () => {
    setPlanetZoom(1);
    setAutoRotate(true);
    setRotationOffsets((current) => ({ ...current, [selected]: 0 }));
    setViewResetKey((current) => current + 1);
  };

  const sceneConfigs: Record<Exclude<CelestialBodyId, 'earth'>, {
    heroWrap: string;
    heroMotion: { x: number; y: number; scale: number };
    leftPanel: string;
    rightPanel: string;
    telemetry: [string, string, string];
  }> = {
    moon: {
      heroWrap: 'left-1/2 top-[43%]',
      heroMotion: { x: 0, y: 20, scale: 1 },
      leftPanel: 'CRATER DENSITY\nPOLAR SHADOWS\nLOW-ALBEDO RIMS',
      rightPanel: 'LUNA ARC\nPASSIVE SURVEY\nTERMINATOR LOCK',
      telemetry: ['REGOLITH', 'SHADOW MAP', 'ORBITAL SILENCE'],
    },
    mars: {
      heroWrap: 'left-1/2 top-[43%]',
      heroMotion: { x: 0, y: 20, scale: 1 },
      leftPanel: 'DUST FRONTS\nRIDGE SCARPS\nTHERMAL BASINS',
      rightPanel: 'ARES ARC\nLOW-ORBIT PASS\nSURFACE RECON',
      telemetry: ['OXIDE BELT', 'DRY SKY', 'THIN AIR'],
    },
    venus: {
      heroWrap: 'left-1/2 top-[43%]',
      heroMotion: { x: 0, y: 20, scale: 1 },
      leftPanel: 'ACID CLOUDS\nHEAT BLOOM\nOPAQUE SHELL',
      rightPanel: 'APHRODITE ARC\nDENSE HAZE\nVISUAL BLIND',
      telemetry: ['SULFUR HAZE', 'HEAT PRESSURE', 'LOW VIS'],
    },
    jupiter: {
      heroWrap: 'left-1/2 top-[43%]',
      heroMotion: { x: 0, y: 20, scale: 1 },
      leftPanel: 'BAND SHEAR\nRED STORM\nHIGH-VEL BELTS',
      rightPanel: 'JOVIAN ARC\nGAS TORQUE\nMAGNETIC NOISE',
      telemetry: ['RED SPOT', 'SHEAR BELTS', 'HEAVY GAS'],
    },
    saturn: {
      heroWrap: 'left-1/2 top-[43%]',
      heroMotion: { x: 0, y: 20, scale: 1 },
      leftPanel: 'RING PLANE\nSHEPHERD GAPS\nSHADOW SWEEP',
      rightPanel: 'CRONOS ARC\nGAS LAYERS\nRING OBSERVER',
      telemetry: ['RING SHADOW', 'ICE BELTS', 'PLANE LOCK'],
    },
    neptune: {
      heroWrap: 'left-1/2 top-[43%]',
      heroMotion: { x: 0, y: 20, scale: 1 },
      leftPanel: 'ICE WINDS\nDEEP BLUE\nCOLD BELTS',
      rightPanel: 'NEP ARC\nOUTER REACH\nLOW-LIGHT VISTA',
      telemetry: ['BLUE HAZE', 'COLD GAS', 'FAR FIELD'],
    },
  };

  const scene = !isEarth ? sceneConfigs[activeBody.id as Exclude<CelestialBodyId, 'earth'>] : null;
  const observatoryProfile = !isEarth ? OBSERVATORY_PROFILES[activeBody.id as Exclude<CelestialBodyId, 'earth'>] : null;

  return (
    <>
      <AnimatePresence mode="wait">
        {enabled && !isEarth && scene && (
          <motion.div
            key={selected}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.34 }}
            className="absolute inset-0 z-[214] pointer-events-none overflow-hidden bg-[#020712]"
          >
            <div className="absolute inset-0" style={{ background: activeBody.backdropGradient }} />

            <motion.div
              aria-hidden="true"
              className="absolute inset-[-8%]"
              style={{
                opacity: activeBody.starfieldOpacity,
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.52) 1px, transparent 1.8px)',
                backgroundSize: activeBody.id === 'moon' ? '84px 84px' : activeBody.id === 'neptune' ? '102px 102px' : '96px 96px',
              }}
              animate={{ x: [0, -18, 0], y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 46, ease: 'easeInOut' }}
            />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(255,255,255,0.06),transparent_34%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_14%,transparent_82%,rgba(255,255,255,0.02))]" />
            {observatoryProfile && <NasaObservatoryLayer body={activeBody} profile={observatoryProfile} />}
            {observatoryProfile && <NasaMissionHeader body={activeBody} profile={observatoryProfile} />}

            {!isMobile && (
              <>
                <motion.div
                  aria-hidden="true"
                  className="absolute left-[6%] top-[18%] h-[30rem] w-[30rem] rounded-full border border-white/[0.045]"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 140, ease: 'linear' }}
                />
                <motion.div
                  aria-hidden="true"
                  className="absolute right-[8%] top-[14%] h-[22rem] w-[22rem] rounded-full border border-white/[0.04]"
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 112, ease: 'linear' }}
                />
                <div className="absolute left-[7%] top-[26%] h-px w-[18rem] bg-gradient-to-r from-transparent via-white/18 to-transparent" />
                <div className="absolute right-[7%] top-[32%] h-px w-[16rem] bg-gradient-to-l from-transparent via-white/18 to-transparent" />
              </>
            )}

            <div className="absolute left-1/2 top-1/2 h-[min(76vh,820px)] w-[min(76vh,820px)] -translate-x-1/2 -translate-y-[51%] rounded-full border" style={{ borderColor: activeBody.orbitTint }} />
            <div className="absolute left-1/2 top-1/2 h-[min(96vh,1020px)] w-[min(96vh,1020px)] -translate-x-1/2 -translate-y-[51%] rounded-full border border-white/[0.02]" />

            <div className={`absolute ${scene.heroWrap} flex -translate-x-1/2 -translate-y-1/2 items-center justify-center pointer-events-none`}>
              <div className="relative h-[min(94vh,900px)] w-[min(94vw,980px)] max-w-[98vw]">
                {!isMobile && <OrbitalSceneAccents body={activeBody} />}
                <motion.div
                  initial={{ scale: 0.8, x: scene.heroMotion.x, y: scene.heroMotion.y, opacity: 0 }}
                  animate={{ scale: scene.heroMotion.scale, x: 0, y: 0, opacity: 1 }}
                  exit={{ scale: 0.92, x: scene.heroMotion.x * -0.5, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 76, damping: 18 }}
                  className="relative z-10 flex h-full w-full items-center justify-center"
                >
                  <PlanetSphere
                    body={activeBody}
                    large
                    interactive
                    rotationOffset={rotationOffsets[selected] ?? 0}
                    zoom={planetZoom}
                    resetKey={viewResetKey}
                    onRotateDrag={handlePlanetRotateDrag}
                  />
                </motion.div>
              </div>
            </div>

            {!isMobile && (
              <PlanetControlDock
                body={activeBody}
                zoom={planetZoom}
                autoRotate={autoRotate}
                onZoomIn={() => setPlanetZoom((current) => Math.min(current + 0.12, 1.36))}
                onZoomOut={() => setPlanetZoom((current) => Math.max(current - 0.12, 0.76))}
                onReset={resetPlanetView}
                onToggleAutoRotate={() => setAutoRotate((current) => !current)}
                onReturnEarth={() => {
                  if (onReturnEarth) onReturnEarth();
                  else onSelect('earth');
                }}
              />
            )}

            {!isMobile && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: -18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                  className="absolute left-6 top-[18%] max-w-[14.5rem] rounded-[1.35rem] border border-white/10 bg-[rgba(7,12,18,0.54)] px-3.5 py-3 backdrop-blur-xl"
                >
                  <div className="text-[7px] font-mono tracking-[0.28em] text-[var(--text-secondary)]">PLANETARY VISTA</div>
                  <div className="mt-2 text-[11px] font-semibold tracking-[0.18em] text-[var(--text-primary)]">{activeBody.vistaLabel}</div>
                  <div className="mt-2 text-[7px] font-mono tracking-[0.2em]" style={{ color: activeBody.accent }}>{activeBody.detailPill}</div>
                  <div className="mt-3 grid grid-cols-1 gap-1.5">
                    {scene.leftPanel.split('\n').map((item) => (
                      <div key={item} className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1 text-[7px] font-mono tracking-[0.18em] text-[var(--text-muted)]">
                        {item}
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className={`absolute ${isMobile ? 'left-1/2 top-[63%] w-[90vw] max-w-[20rem] -translate-x-1/2' : 'right-6 top-[18%] w-[18.5rem]'} rounded-[1.65rem] border border-white/10 bg-[rgba(7,12,18,0.58)] px-3.5 py-3 backdrop-blur-xl`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[8px] font-mono tracking-[0.32em] text-[var(--text-secondary)]">{activeBody.code}</div>
                  <div className="mt-1 text-base font-semibold tracking-[0.24em] text-[var(--text-heading)] md:text-lg">{activeBody.name.toUpperCase()}</div>
                  <div className="mt-1 text-[8px] font-mono tracking-[0.18em] text-[var(--text-muted)]">{activeBody.diameter} · {activeBody.day}</div>
                  {observatoryProfile && (
                    <div className="mt-2 text-[7px] font-mono leading-4 tracking-[0.16em] text-[var(--cyan-primary)]">
                      {observatoryProfile.mission}
                    </div>
                  )}
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[7px] font-mono tracking-[0.18em] text-[var(--text-secondary)]">
                  VISUAL-ONLY MODE
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {scene.telemetry.map((item) => (
                  <div key={item} className="rounded-xl border border-white/8 bg-white/[0.03] px-2 py-2 text-center">
                    <div className="text-[6px] font-mono tracking-[0.22em] text-[var(--text-muted)]">SIGNAL</div>
                    <div className="mt-1 text-[9px] font-semibold tracking-[0.14em]" style={{ color: activeBody.accent }}>{item}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-2 text-[7px] font-mono leading-5 tracking-[0.18em] text-[var(--text-muted)]">
                {scene.rightPanel.split('\n').join(' · ')}
              </div>
            </motion.div>

            <div className={`absolute ${isMobile ? 'top-16 left-1/2 -translate-x-1/2' : 'left-6 bottom-[18%]'} rounded-2xl border border-white/10 bg-[rgba(7,12,18,0.58)] px-3 py-2 shadow-[0_10px_36px_rgba(0,0,0,0.24)] backdrop-blur-xl`}>
              <div className="text-[7px] font-mono tracking-[0.24em] text-[var(--text-secondary)]">VISUAL SURFACE</div>
              <div className="mt-1 text-[9px] font-semibold tracking-[0.16em] text-[var(--text-primary)]">RETURN TO EARTH FOR LIVE DATA</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {enabled && <DesktopPlanetSlider selected={selected} activeBody={activeBody} onSelect={onSelect} onReturnEarth={onReturnEarth} locale={locale} />}
      {enabled && <MobilePlanetRail
        selected={selected}
        activeBody={activeBody}
        zoom={planetZoom}
        autoRotate={autoRotate}
        locale={locale}
        onSelect={onSelect}
        onReturnEarth={onReturnEarth}
        onZoomIn={() => setPlanetZoom((current) => Math.min(current + 0.12, 1.36))}
        onZoomOut={() => setPlanetZoom((current) => Math.max(current - 0.12, 0.76))}
        onReset={resetPlanetView}
        onToggleAutoRotate={() => setAutoRotate((current) => !current)}
      />}
    </>
  );
}
