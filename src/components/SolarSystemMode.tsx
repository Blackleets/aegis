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
  surface: string;
  size: string;
}

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
    shadow: 'rgba(0,229,255,0.32)',
    surface: 'radial-gradient(circle at 34% 24%, #e8f7ff 0 2%, transparent 3%), radial-gradient(circle at 44% 42%, #2fb36f 0 9%, transparent 10%), radial-gradient(circle at 62% 56%, #b99454 0 12%, transparent 13%), linear-gradient(135deg, #1d8bb3 0%, #16365f 45%, #0b1930 100%)',
    size: 'h-7 w-7',
  },
  {
    id: 'moon',
    name: 'Moon',
    code: 'LUNA-01',
    subtitle: 'Quiet orbital body view',
    detail: 'Clean visual mode only. Earth intelligence feeds are intentionally suspended here.',
    diameter: '3,474 km',
    day: '27.3 d',
    accent: '#CBD5E1',
    shadow: 'rgba(203,213,225,0.28)',
    surface: 'radial-gradient(circle at 34% 30%, rgba(255,255,255,0.75) 0 5%, transparent 6%), radial-gradient(circle at 62% 58%, rgba(30,41,59,0.45) 0 9%, transparent 10%), radial-gradient(circle at 45% 72%, rgba(15,23,42,0.35) 0 6%, transparent 7%), linear-gradient(135deg, #d7dce3 0%, #8d97a5 48%, #3f4a59 100%)',
    size: 'h-5 w-5',
  },
  {
    id: 'mars',
    name: 'Mars',
    code: 'ARES-04',
    subtitle: 'Red terrain reconnaissance',
    detail: 'Dry planet vista with no operational overlays. Designed for future mission/lab expansion.',
    diameter: '6,779 km',
    day: '24h 37m',
    accent: '#F97316',
    shadow: 'rgba(249,115,22,0.34)',
    surface: 'radial-gradient(circle at 30% 25%, rgba(255,215,170,0.5) 0 8%, transparent 9%), radial-gradient(circle at 67% 65%, rgba(92,35,20,0.42) 0 16%, transparent 17%), linear-gradient(145deg, #f08a3c 0%, #a44427 45%, #471b18 100%)',
    size: 'h-6 w-6',
  },
  {
    id: 'venus',
    name: 'Venus',
    code: 'APH-02',
    subtitle: 'Cloud-veiled planet vista',
    detail: 'Atmospheric visual study mode. No Earth data layers are rendered outside Earth.',
    diameter: '12,104 km',
    day: '243 d',
    accent: '#FACC15',
    shadow: 'rgba(250,204,21,0.3)',
    surface: 'radial-gradient(ellipse at 40% 30%, rgba(255,245,190,0.65) 0 14%, transparent 15%), linear-gradient(165deg, #ffe08a 0%, #c58b35 48%, #5c3416 100%)',
    size: 'h-6 w-6',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    code: 'JOV-05',
    subtitle: 'Gas giant observation',
    detail: 'Large-scale atmospheric vista. Rings, storms and bands are stylized for command clarity.',
    diameter: '139,820 km',
    day: '9h 56m',
    accent: '#FDBA74',
    shadow: 'rgba(251,146,60,0.28)',
    surface: 'linear-gradient(180deg, #ead7bb 0 11%, #a86f45 12% 20%, #f2dec0 21% 35%, #7d4d33 36% 44%, #e9cfa5 45% 58%, #b8794d 59% 70%, #f3dfc4 71% 100%)',
    size: 'h-8 w-8',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    code: 'CRN-06',
    subtitle: 'Ring-plane vista',
    detail: 'Stylized ring system view. Data overlays remain Earth-only to protect operational clarity.',
    diameter: '116,460 km',
    day: '10h 33m',
    accent: '#FDE68A',
    shadow: 'rgba(253,230,138,0.28)',
    surface: 'linear-gradient(180deg, #f7e4ad 0 18%, #c99b52 19% 27%, #fae8b7 28% 58%, #9f743b 59% 66%, #ead39a 67% 100%)',
    size: 'h-8 w-8',
  },
  {
    id: 'neptune',
    name: 'Neptune',
    code: 'NEP-08',
    subtitle: 'Outer system blue world',
    detail: 'Cold outer-system vista for visual exploration only. No live intelligence projected.',
    diameter: '49,244 km',
    day: '16h 6m',
    accent: '#60A5FA',
    shadow: 'rgba(96,165,250,0.34)',
    surface: 'radial-gradient(circle at 36% 32%, rgba(191,219,254,0.5) 0 9%, transparent 10%), linear-gradient(145deg, #60a5fa 0%, #2563eb 48%, #1e1b4b 100%)',
    size: 'h-7 w-7',
  },
];

const bodyById = Object.fromEntries(BODIES.map((body) => [body.id, body])) as Record<CelestialBodyId, CelestialBody>;

function PlanetDisc({ body, large = false }: { body: CelestialBody; large?: boolean }) {
  return (
    <div
      className={`relative shrink-0 rounded-full border border-white/15 ${large ? 'h-[min(46vh,520px)] w-[min(46vh,520px)]' : body.size}`}
      style={{
        background: body.surface,
        boxShadow: `0 0 ${large ? 80 : 18}px ${body.shadow}, inset -18px -22px 40px rgba(0,0,0,0.38), inset 10px 8px 18px rgba(255,255,255,0.13)`,
      }}
    >
      {body.id === 'saturn' && (
        <div className="absolute left-1/2 top-1/2 h-[34%] w-[160%] -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-full border border-[#fde68a]/55 bg-[#fde68a]/8 shadow-[0_0_22px_rgba(253,230,138,0.2)]" />
      )}
      {large && (
        <>
          <div className="absolute inset-[-10%] rounded-full border border-white/5" />
          <div className="absolute inset-[-20%] rounded-full border border-white/[0.03]" />
        </>
      )}
    </div>
  );
}

export default function SolarSystemMode({ selected, onSelect }: { selected: CelestialBodyId; onSelect: (body: CelestialBodyId) => void }) {
  const activeBody = bodyById[selected];
  const isEarth = selected === 'earth';

  return (
    <>
      <AnimatePresence>
        {!isEarth && (
          <motion.div
            key={selected}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 z-[120] pointer-events-none overflow-hidden bg-[radial-gradient(circle_at_50%_45%,rgba(14,26,42,0.2),rgba(3,7,13,0.92)_62%,rgba(1,4,9,0.98)_100%)]"
          >
            <div className="absolute inset-0 opacity-35" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.45) 1px, transparent 1.5px)', backgroundSize: '86px 86px' }} />
            <div className="absolute left-[31%] right-[22%] top-[14%] bottom-[12%] flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.86, y: 24 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                className="relative flex items-center justify-center"
              >
                <div className="absolute h-[132%] w-[132%] rounded-full border border-white/[0.04]" />
                <div className="absolute h-[164%] w-[164%] rounded-full border border-white/[0.025]" />
                <PlanetDisc body={activeBody} large />
              </motion.div>
            </div>
            <div className="absolute left-[24rem] top-28 hidden max-w-[19rem] rounded-3xl border border-white/10 bg-[#08111d]/75 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl xl:block">
              <div className="mb-2 text-[8px] font-mono tracking-[0.32em] text-[var(--text-secondary)]">CELESTIAL VISTA</div>
              <div className="flex items-center gap-3">
                <PlanetDisc body={activeBody} />
                <div>
                  <div className="text-xl font-bold tracking-[0.2em] text-[var(--text-heading)]">{activeBody.name.toUpperCase()}</div>
                  <div className="mt-1 text-[8px] font-mono tracking-[0.22em]" style={{ color: activeBody.accent }}>{activeBody.code}</div>
                </div>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-[var(--text-secondary)]">{activeBody.detail}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">
                <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-2">
                  <div>Diameter</div>
                  <div className="mt-1 text-[var(--text-primary)]">{activeBody.diameter}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-2">
                  <div>Day</div>
                  <div className="mt-1 text-[var(--text-primary)]">{activeBody.day}</div>
                </div>
              </div>
              <div className="mt-3 rounded-2xl border border-[var(--gold-primary)]/20 bg-[var(--gold-primary)]/8 px-3 py-2 text-[8px] font-mono tracking-[0.16em] text-[var(--gold-primary)]">
                EARTH DATA LAYERS SUSPENDED IN THIS VIEW
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.1, duration: 0.45 }}
        className="absolute bottom-[124px] left-1/2 z-[230] hidden -translate-x-1/2 pointer-events-auto xl:block"
      >
        <div className="rounded-[2rem] border border-white/10 bg-[#07111d]/72 px-3 py-2 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between gap-5 px-1">
            <div>
              <div className="text-[8px] font-mono tracking-[0.28em] text-[var(--text-secondary)]">SOLAR SYSTEM MODE</div>
              <div className="mt-0.5 text-[9px] font-semibold tracking-[0.18em] text-[var(--text-primary)]">{isEarth ? 'Earth intelligence active' : `${activeBody.name} visual-only vista`}</div>
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
                  className={`group relative flex min-w-[4rem] flex-col items-center gap-1.5 rounded-2xl border px-2 py-2 transition-all ${active ? 'bg-white/[0.07]' : 'bg-white/[0.025] hover:bg-white/[0.05]'}`}
                  style={{ borderColor: active ? body.accent : 'rgba(255,255,255,0.08)' }}
                  title={`${body.name} — ${body.subtitle}`}
                >
                  <PlanetDisc body={body} />
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
