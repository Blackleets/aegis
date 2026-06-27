'use client';

import { AnimatePresence, motion } from 'framer-motion';

export type CelestialBodyId = 'earth' | 'moon' | 'mars' | 'venus' | 'jupiter' | 'saturn' | 'neptune';

interface CelestialBody {
  id: CelestialBodyId;
  name: string;
  code: string;
  subtitle: string;
  detail: string;
  diameter: string;
  day: string;
  accent: string;
  shadow: string;
  texture: string;
  scale: string;
}

// Planetary texture maps are stored locally under /public/planet-textures.
// Source: Solar System Scope texture maps, downloaded into the repo so the
// production UI does not depend on fragile third-party image delivery at run time.
const BODIES: CelestialBody[] = [
  {
    id: 'earth',
    name: 'Earth',
    code: 'SOL-03',
    subtitle: 'Operational intelligence surface',
    detail: 'Live layers active: aviation, maritime, weather, news, OSINT and regional watch overlays.',
    diameter: '12,742 km',
    day: '23h 56m',
    accent: '#00E5FF',
    shadow: 'rgba(0,229,255,0.36)',
    texture: '/planet-textures/2k_earth_daymap.jpg',
    scale: 'scale-100',
  },
  {
    id: 'moon',
    name: 'Moon',
    code: 'LUNA-01',
    subtitle: 'Lunar surface vista',
    detail: 'Texture-based lunar globe view. Earth intelligence feeds are intentionally suspended here.',
    diameter: '3,474 km',
    day: '27.3 d',
    accent: '#CBD5E1',
    shadow: 'rgba(203,213,225,0.28)',
    texture: '/planet-textures/2k_moon.jpg',
    scale: 'scale-[0.74]',
  },
  {
    id: 'mars',
    name: 'Mars',
    code: 'ARES-04',
    subtitle: 'Red terrain reconnaissance',
    detail: 'Real terrain texture vista with no operational overlays. Reserved for future mission/lab expansion.',
    diameter: '6,779 km',
    day: '24h 37m',
    accent: '#F97316',
    shadow: 'rgba(249,115,22,0.36)',
    texture: '/planet-textures/2k_mars.jpg',
    scale: 'scale-[0.86]',
  },
  {
    id: 'venus',
    name: 'Venus',
    code: 'APH-02',
    subtitle: 'Cloud-veiled planet vista',
    detail: 'Surface texture study mode. No Earth data layers are rendered outside Earth.',
    diameter: '12,104 km',
    day: '243 d',
    accent: '#FACC15',
    shadow: 'rgba(250,204,21,0.3)',
    texture: '/planet-textures/2k_venus_surface.jpg',
    scale: 'scale-[0.98]',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    code: 'JOV-05',
    subtitle: 'Gas giant observation',
    detail: 'Band-rich Jovian texture view. Oversized enough to feel like a gas giant without covering the command UI.',
    diameter: '139,820 km',
    day: '9h 56m',
    accent: '#FDBA74',
    shadow: 'rgba(251,146,60,0.3)',
    texture: '/planet-textures/2k_jupiter.jpg',
    scale: 'scale-[1.1]',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    code: 'CRN-06',
    subtitle: 'Ring-plane vista',
    detail: 'Texture-based Saturn view with a clean tactical ring plane. Data overlays remain Earth-only.',
    diameter: '116,460 km',
    day: '10h 33m',
    accent: '#FDE68A',
    shadow: 'rgba(253,230,138,0.3)',
    texture: '/planet-textures/2k_saturn.jpg',
    scale: 'scale-[1.02]',
  },
  {
    id: 'neptune',
    name: 'Neptune',
    code: 'NEP-08',
    subtitle: 'Outer system blue world',
    detail: 'Cold outer-system texture view for visual exploration only. No live intelligence projected.',
    diameter: '49,244 km',
    day: '16h 6m',
    accent: '#60A5FA',
    shadow: 'rgba(96,165,250,0.34)',
    texture: '/planet-textures/2k_neptune.jpg',
    scale: 'scale-[0.92]',
  },
];

const bodyById = Object.fromEntries(BODIES.map((body) => [body.id, body])) as Record<CelestialBodyId, CelestialBody>;

function TexturedPlanet({ body, large = false }: { body: CelestialBody; large?: boolean }) {
  const size = large ? 'h-[min(52vh,560px)] w-[min(52vh,560px)]' : 'h-9 w-9';

  return (
    <div className={`relative shrink-0 ${large ? body.scale : ''}`}>
      {body.id === 'saturn' && large && (
        <div
          className="absolute left-1/2 top-1/2 z-0 h-[34%] w-[172%] -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-full border border-[#f7d98a]/45 bg-[linear-gradient(90deg,transparent_0%,rgba(253,230,138,0.08)_18%,rgba(253,230,138,0.28)_48%,rgba(253,230,138,0.1)_78%,transparent_100%)] shadow-[0_0_34px_rgba(253,230,138,0.16)]"
          aria-hidden="true"
        />
      )}
      <div
        className={`relative z-10 overflow-hidden rounded-full border border-white/15 ${size}`}
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.14), transparent 18%, transparent 68%, rgba(0,0,0,0.34)), url(${body.texture})`,
          backgroundSize: large ? 'auto 100%, 200% 100%' : 'auto 100%, 190% 100%',
          backgroundPosition: 'center, 0% 50%',
          boxShadow: `0 0 ${large ? 92 : 22}px ${body.shadow}, inset -34px -22px 52px rgba(0,0,0,0.46), inset 18px 12px 30px rgba(255,255,255,0.14)`,
        }}
      >
        {large && (
          <>
            <motion.div
              className="absolute inset-0 opacity-90"
              animate={{ backgroundPositionX: ['0%', '100%'] }}
              transition={{ repeat: Infinity, duration: 90, ease: 'linear' }}
              style={{
                backgroundImage: `url(${body.texture})`,
                backgroundSize: '200% 100%',
                mixBlendMode: 'multiply',
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.28),transparent_20%),radial-gradient(circle_at_68%_70%,rgba(0,0,0,0.48),transparent_48%)]" />
            <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
          </>
        )}
      </div>
      {body.id === 'saturn' && !large && (
        <div className="absolute left-1/2 top-1/2 h-[30%] w-[170%] -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-full border border-[#f7d98a]/45" />
      )}
    </div>
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
            transition={{ duration: 0.28 }}
            className="absolute inset-0 z-[214] pointer-events-none overflow-hidden bg-[#020712]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(20,35,54,0.72),rgba(2,7,18,0.98)_58%,#020712_100%)]" />
            <div className="absolute inset-0 opacity-35" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.42) 1px, transparent 1.6px)', backgroundSize: '92px 92px' }} />
            <div className="absolute inset-x-[18%] top-[8%] bottom-[19%] flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.84, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 88, damping: 18 }}
                className="relative flex items-center justify-center"
              >
                <div className="absolute h-[132%] w-[132%] rounded-full border border-white/[0.045]" />
                <div className="absolute h-[168%] w-[168%] rounded-full border border-white/[0.025]" />
                <div className="absolute h-[210%] w-[210%] rounded-full border border-white/[0.018]" />
                <TexturedPlanet body={activeBody} large />
              </motion.div>
            </div>

            <div className="absolute left-[21rem] top-24 hidden w-[20rem] rounded-[2rem] border border-white/10 bg-[#08111d]/82 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl 2xl:block">
              <div className="mb-3 text-[8px] font-mono tracking-[0.34em] text-[var(--text-secondary)]">TEXTURED PLANET VISTA</div>
              <div className="flex items-center gap-3">
                <TexturedPlanet body={activeBody} />
                <div>
                  <div className="text-2xl font-bold tracking-[0.22em] text-[var(--text-heading)]">{activeBody.name.toUpperCase()}</div>
                  <div className="mt-1 text-[8px] font-mono tracking-[0.22em]" style={{ color: activeBody.accent }}>{activeBody.code}</div>
                </div>
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-[var(--text-secondary)]">{activeBody.detail}</p>
              <div className="mt-5 grid grid-cols-2 gap-2 text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">
                <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                  <div>Diameter</div>
                  <div className="mt-2 text-[var(--text-primary)]">{activeBody.diameter}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                  <div>Day</div>
                  <div className="mt-2 text-[var(--text-primary)]">{activeBody.day}</div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-[var(--gold-primary)]/20 bg-[var(--gold-primary)]/8 px-3 py-2 text-[8px] font-mono tracking-[0.16em] text-[var(--gold-primary)]">
                EARTH INTELLIGENCE LAYERS HIDDEN OUTSIDE EARTH
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.1, duration: 0.45 }}
        className="absolute bottom-[118px] left-1/2 z-[260] hidden -translate-x-1/2 pointer-events-auto xl:block"
      >
        <div className="rounded-[2rem] border border-white/10 bg-[#07111d]/84 px-3 py-2 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between gap-5 px-1">
            <div>
              <div className="text-[8px] font-mono tracking-[0.28em] text-[var(--text-secondary)]">SOLAR SYSTEM MODE</div>
              <div className="mt-0.5 text-[9px] font-semibold tracking-[0.18em] text-[var(--text-primary)]">{isEarth ? 'Earth intelligence active' : `${activeBody.name} high-resolution texture vista`}</div>
            </div>
            <div className="rounded-full border border-white/8 bg-white/[0.035] px-2 py-1 text-[7px] font-mono tracking-[0.18em]" style={{ color: activeBody.accent }}>
              {activeBody.code}
            </div>
          </div>
          <div className="flex items-end gap-2">
            {BODIES.map((body) => {
              const active = body.id === selected;
              return (
                <button
                  key={body.id}
                  onClick={() => onSelect(body.id)}
                  className={`group relative flex min-w-[4.25rem] flex-col items-center gap-1.5 rounded-2xl border px-2 py-2 transition-all ${active ? 'bg-white/[0.08]' : 'bg-white/[0.025] hover:bg-white/[0.055]'}`}
                  style={{ borderColor: active ? body.accent : 'rgba(255,255,255,0.08)' }}
                  title={`${body.name} — ${body.subtitle}`}
                >
                  <TexturedPlanet body={body} />
                  <span className="text-[7px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--text-primary)]">{body.name}</span>
                  {active && <span className="absolute -top-1 h-1.5 w-1.5 rounded-full" style={{ background: body.accent, boxShadow: `0 0 10px ${body.accent}` }} />}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </>
  );
}
