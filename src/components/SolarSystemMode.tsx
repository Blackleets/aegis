'use client';

import { AnimatePresence, motion } from 'framer-motion';

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
}

// Local texture maps keep the planetarium mode stable in production.
// Source note: /public/planet-textures/SOURCE.txt
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
  },
  {
    id: 'moon',
    name: 'Moon',
    code: 'LUNA-01',
    diameter: '3,474 km',
    day: '27.3 d',
    accent: '#CBD5E1',
    glow: 'rgba(203,213,225,0.28)',
    texture: '/planet-textures/2k_moon.jpg',
    sceneScale: 'scale-[0.72]',
  },
  {
    id: 'mars',
    name: 'Mars',
    code: 'ARES-04',
    diameter: '6,779 km',
    day: '24h 37m',
    accent: '#F97316',
    glow: 'rgba(249,115,22,0.34)',
    texture: '/planet-textures/2k_mars.jpg',
    sceneScale: 'scale-[0.86]',
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
    sceneScale: 'scale-[0.98]',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    code: 'JOV-05',
    diameter: '139,820 km',
    day: '9h 56m',
    accent: '#FDBA74',
    glow: 'rgba(251,146,60,0.28)',
    texture: '/planet-textures/2k_jupiter.jpg',
    sceneScale: 'scale-[1.08]',
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
    sceneScale: 'scale-[1.02]',
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
    sceneScale: 'scale-[0.94]',
  },
];

const bodyById = Object.fromEntries(BODIES.map((body) => [body.id, body])) as Record<CelestialBodyId, CelestialBody>;

function getAdjacentBody(selected: CelestialBodyId, direction: -1 | 1) {
  const index = BODIES.findIndex((body) => body.id === selected);
  const nextIndex = (index + direction + BODIES.length) % BODIES.length;
  return BODIES[nextIndex].id;
}

function PlanetSphere({ body, large = false }: { body: CelestialBody; large?: boolean }) {
  const size = large ? 'h-[min(54vh,600px)] w-[min(54vh,600px)]' : 'h-10 w-10';

  return (
    <div className={`relative shrink-0 ${large ? body.sceneScale : ''}`}>
      {body.id === 'saturn' && large && (
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 z-0 h-[32%] w-[178%] -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-full border border-[#f7d98a]/42 bg-[linear-gradient(90deg,transparent_0%,rgba(253,230,138,0.06)_18%,rgba(253,230,138,0.24)_48%,rgba(253,230,138,0.08)_78%,transparent_100%)] shadow-[0_0_36px_rgba(253,230,138,0.14)]"
        />
      )}

      <motion.div
        className={`relative z-10 overflow-hidden rounded-full border border-white/12 ${size}`}
        style={{
          backgroundImage: `url(${body.texture})`,
          backgroundSize: large ? '200% 100%' : '190% 100%',
          backgroundPosition: '0% 50%',
          boxShadow: `0 0 ${large ? 96 : 24}px ${body.glow}, inset -42px -30px 66px rgba(0,0,0,0.48), inset 20px 14px 34px rgba(255,255,255,0.14)`,
        }}
        animate={large ? { backgroundPositionX: ['0%', '100%'] } : undefined}
        transition={large ? { repeat: Infinity, duration: 110, ease: 'linear' } : undefined}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_26%,rgba(255,255,255,0.32),transparent_19%),radial-gradient(circle_at_70%_72%,rgba(0,0,0,0.52),transparent_48%)]" />
        <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
        {large && <div className="absolute -inset-[12%] rounded-full bg-[radial-gradient(circle_at_50%_50%,transparent_58%,rgba(2,7,18,0.42)_72%,rgba(2,7,18,0.82)_100%)]" />}
      </motion.div>

      {body.id === 'saturn' && !large && (
        <div className="absolute left-1/2 top-1/2 h-[30%] w-[174%] -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-full border border-[#f7d98a]/42" />
      )}
    </div>
  );
}

function PlanetSlider({ selected, activeBody, onSelect }: { selected: CelestialBodyId; activeBody: CelestialBody; onSelect: (body: CelestialBodyId) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2.6, duration: 0.45 }}
      className="absolute bottom-[116px] left-1/2 z-[260] hidden w-[min(53rem,58vw)] -translate-x-1/2 pointer-events-auto xl:block"
    >
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#050b14]/72 px-4 py-3 shadow-[0_18px_64px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        <div className="absolute inset-x-8 top-1/2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <button
            onClick={() => onSelect(getAdjacentBody(selected, -1))}
            className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[8px] font-mono tracking-[0.2em] text-[var(--text-secondary)] transition-colors hover:border-white/20 hover:text-[var(--text-primary)]"
          >
            PREV
          </button>
          <div className="text-center">
            <div className="text-[8px] font-mono tracking-[0.34em] text-[var(--text-secondary)]">SOLAR SLIDER</div>
            <div className="mt-1 text-[10px] font-semibold tracking-[0.22em] text-[var(--text-primary)]">
              {selected === 'earth' ? 'EARTH OPERATIONS ACTIVE' : `${activeBody.name.toUpperCase()} NATURAL VISTA`}
            </div>
          </div>
          <button
            onClick={() => onSelect(getAdjacentBody(selected, 1))}
            className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[8px] font-mono tracking-[0.2em] text-[var(--text-secondary)] transition-colors hover:border-white/20 hover:text-[var(--text-primary)]"
          >
            NEXT
          </button>
        </div>

        <div className="flex snap-x snap-mandatory items-center justify-between gap-2 overflow-x-auto pb-1 styled-scrollbar">
          {BODIES.map((body) => {
            const active = body.id === selected;
            return (
              <button
                key={body.id}
                onClick={() => onSelect(body.id)}
                className={`group relative flex min-w-[5.1rem] snap-center flex-col items-center gap-1.5 rounded-2xl border px-3 py-2.5 transition-all ${active ? 'bg-white/[0.085]' : 'bg-white/[0.018] hover:bg-white/[0.05]'}`}
                style={{ borderColor: active ? body.accent : 'rgba(255,255,255,0.08)' }}
                title={`${body.name} — ${body.diameter}`}
              >
                {active && <span className="absolute -top-1 h-1.5 w-1.5 rounded-full" style={{ background: body.accent, boxShadow: `0 0 12px ${body.accent}` }} />}
                <PlanetSphere body={body} />
                <span className="text-[7px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--text-primary)]">{body.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export default function SolarSystemMode({ selected, onSelect }: { selected: CelestialBodyId; onSelect: (body: CelestialBodyId) => void }) {
  const activeBody = bodyById[selected];
  const isEarth = selected === 'earth';

  return (
    <>
      <AnimatePresence mode="wait">
        {!isEarth && (
          <motion.div
            key={selected}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32 }}
            className="absolute inset-0 z-[214] pointer-events-none overflow-hidden bg-[#020712]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(18,30,47,0.86),rgba(2,7,18,0.96)_57%,#020712_100%)]" />
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.48) 1px, transparent 1.7px)', backgroundSize: '96px 96px' }} />
            <div className="absolute left-1/2 top-1/2 h-[min(70vh,760px)] w-[min(70vh,760px)] -translate-x-1/2 -translate-y-[53%] rounded-full border border-white/[0.035]" />
            <div className="absolute left-1/2 top-1/2 h-[min(88vh,940px)] w-[min(88vh,940px)] -translate-x-1/2 -translate-y-[53%] rounded-full border border-white/[0.022]" />
            <div className="absolute left-1/2 top-[42%] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
              <motion.div
                initial={{ scale: 0.82, x: 90, opacity: 0 }}
                animate={{ scale: 1, x: 0, opacity: 1 }}
                exit={{ scale: 0.9, x: -80, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 78, damping: 18 }}
                className="relative flex items-center justify-center"
              >
                <PlanetSphere body={activeBody} large />
              </motion.div>
            </div>

            <div className="absolute left-1/2 top-[calc(50%+min(30vh,305px))] flex -translate-x-1/2 items-center gap-5 text-center">
              <div className="h-px w-20 bg-gradient-to-r from-transparent to-white/18" />
              <div>
                <div className="text-[8px] font-mono tracking-[0.32em] text-[var(--text-secondary)]">{activeBody.code}</div>
                <div className="mt-1 text-lg font-semibold tracking-[0.24em] text-[var(--text-heading)]">{activeBody.name.toUpperCase()}</div>
                <div className="mt-1 text-[8px] font-mono tracking-[0.18em] text-[var(--text-muted)]">
                  {activeBody.diameter} · {activeBody.day}
                </div>
              </div>
              <div className="h-px w-20 bg-gradient-to-l from-transparent to-white/18" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PlanetSlider selected={selected} activeBody={activeBody} onSelect={onSelect} />
    </>
  );
}
