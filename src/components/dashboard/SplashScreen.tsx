'use client';

import { AnimatePresence, motion } from 'framer-motion';

type SplashScreenProps = {
  showSplash: boolean;
};

export default function SplashScreen({ showSplash }: SplashScreenProps) {
  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'radial-gradient(ellipse at center, #0a0a14 0%, var(--bg-void) 70%)' }}
        >
          <div className="absolute inset-0 pointer-events-none z-[1]" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(212,175,55,0.015) 2px, rgba(212,175,55,0.015) 4px)',
            animation: 'splashScanDrift 8s linear infinite',
          }} />

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 0.8, duration: 0.5 }} className="absolute top-6 left-6 z-[2] font-mono text-[10px] tracking-[0.3em] text-[var(--gold-primary)]">
            V4.2
          </motion.div>

          <div className="relative w-[18rem] max-w-[82vw] mb-7 flex flex-col items-center z-[2]">
            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.75, ease: 'easeOut' }}
              className="w-full rounded-[24px] border border-[rgba(34,211,238,0.16)] bg-[linear-gradient(180deg,rgba(6,14,24,0.96)_0%,rgba(7,11,18,0.92)_100%)] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.03)]"
            >
              <div className="mb-3 flex items-center justify-between text-[9px] font-mono tracking-[0.28em] text-[var(--text-muted)]">
                <span>AEGIS</span>
                <span className="text-[var(--cyan-primary)]">WORLD MODEL</span>
              </div>

              <div className="relative h-[92px] overflow-hidden rounded-[16px] border border-[rgba(34,211,238,0.12)] bg-[linear-gradient(180deg,rgba(8,16,28,0.96)_0%,rgba(5,10,18,0.84)_100%)]">
                <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(34,211,238,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.07) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
                <div className="absolute left-0 right-0 top-1/2 h-[1px] -translate-y-1/2 bg-gradient-to-r from-transparent via-[rgba(34,211,238,0.38)] to-transparent" />
                <div className="absolute bottom-0 left-[18%] top-0 w-[1px] bg-gradient-to-b from-transparent via-[rgba(212,175,55,0.2)] to-transparent" />
                <div className="absolute bottom-0 right-[22%] top-0 w-[1px] bg-gradient-to-b from-transparent via-[rgba(34,211,238,0.16)] to-transparent" />

                <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35, duration: 0.6 }} className="absolute left-3 top-3 rounded-full border border-[rgba(212,175,55,0.26)] bg-[rgba(212,175,55,0.08)] px-2 py-[3px] text-[8px] font-mono tracking-[0.2em] text-[var(--gold-primary)]">
                  GRID LOCK
                </motion.div>

                <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: 0.45, duration: 0.8, ease: 'easeOut' }} className="absolute left-4 right-4 top-1/2 h-[2px] origin-left rounded-full bg-gradient-to-r from-[rgba(34,211,238,0.12)] via-[rgba(191,219,254,0.92)] to-[rgba(212,175,55,0.4)] shadow-[0_0_16px_rgba(34,211,238,0.24)]" />

                {[
                  { left: '22%', top: '50%', delay: 0.8, color: 'rgba(34,211,238,0.95)' },
                  { left: '46%', top: '50%', delay: 1.0, color: 'rgba(191,219,254,0.95)' },
                  { left: '71%', top: '50%', delay: 1.2, color: 'rgba(212,175,55,0.95)' },
                ].map((node, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: [0.55, 1, 0.55], scale: [0.9, 1.08, 0.9] }}
                    transition={{ delay: node.delay, duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ left: node.left, top: node.top, background: node.color, boxShadow: `0 0 14px ${node.color}` }}
                  />
                ))}

                <motion.div initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6, duration: 0.55 }} className="absolute right-3 top-3 text-right text-[8px] font-mono tracking-[0.22em] text-[var(--text-secondary)]">
                  <div>SYNC 3/3</div>
                  <div className="mt-1 text-[var(--cyan-primary)]">VERIFIED FEEDS</div>
                </motion.div>

                <div className="absolute bottom-3 left-3 text-[8px] font-mono tracking-[0.22em] text-[rgba(212,175,55,0.72)]">COMMAND SURFACE</div>
                <div className="absolute right-3 bottom-3 text-[8px] font-mono tracking-[0.22em] text-[rgba(34,211,238,0.72)]">LIVE MODEL</div>
              </div>
            </motion.div>
          </div>

          <div className="flex flex-col items-center mb-7 z-[2] px-4 text-center">
            <motion.h1 initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.55, duration: 0.65, ease: 'easeOut' }} className="text-[2.15rem] md:text-[3.2rem] font-bold tracking-[0.36em] md:tracking-[0.42em] font-mono text-[var(--text-heading)]" style={{ textShadow: '0 0 26px rgba(212,175,55,0.14)' }}>
              AEGIS
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.92 }} transition={{ delay: 0.95, duration: 0.5 }} className="mt-2 text-[10px] md:text-[11px] font-mono tracking-[0.44em] text-[var(--gold-primary)]">
              LIVE WORLD MODEL
            </motion.p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.72 }} transition={{ delay: 1.1, duration: 0.5 }} className="mt-2 max-w-[24rem] text-[8px] md:text-[9px] font-mono uppercase tracking-[0.22em] text-[var(--text-secondary)]">
              VERIFIED GLOBAL INTELLIGENCE • COMMAND SURFACE ONLINE
            </motion.p>
          </div>

          <div className="w-64 md:w-80 z-[2]">
            <div className="mb-2 flex items-center justify-between text-[8px] font-mono tracking-[0.22em] text-[var(--text-muted)]">
              <span>BOOTSTRAP</span>
              <span className="text-[var(--gold-primary)]">V4.2</span>
            </div>
            <div className="relative w-full h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.12)' }}>
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: ['0%', '22%', '48%', '74%', '100%'] }}
                transition={{ duration: 2.2, delay: 0.45, times: [0, 0.22, 0.5, 0.78, 1], ease: 'easeInOut' }}
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ background: 'linear-gradient(90deg, rgba(34,211,238,0.88), rgba(191,219,254,0.95), rgba(212,175,55,0.9))', boxShadow: '0 0 12px rgba(34,211,238,0.32)' }}
              />
            </div>

            <div className="mt-3 h-4 flex items-center justify-center">
              {[
                { text: 'LOCKING WORLD GRID...', delay: 0.5 },
                { text: 'SYNCING VERIFIED FEEDS...', delay: 1.1 },
                { text: 'ALIGNING COMMAND SURFACE...', delay: 1.7 },
                { text: 'AEGIS READY', delay: 2.2 },
              ].map((stage, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{ delay: stage.delay, duration: 0.62, times: [0, 0.1, 0.72, 1] }}
                  className="absolute text-[9px] font-mono tracking-[0.24em]"
                  style={{ color: i === 3 ? 'var(--cyan-primary)' : 'var(--text-muted)' }}
                >
                  {stage.text}
                </motion.span>
              ))}
            </div>
          </div>

          <div className="absolute inset-0 pointer-events-none z-[0]" style={{ opacity: 0.03 }}>
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(212,175,55,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.5) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }} />
          </div>

          {[
            { t: '10px', l: '10px', bw: '2px 0 0 2px' },
            { t: '10px', r: '10px', bw: '2px 2px 0 0' },
            { b: '10px', l: '10px', bw: '0 0 2px 2px' },
            { b: '10px', r: '10px', bw: '0 2px 2px 0' },
          ].map((pos, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
              className="absolute w-8 h-8 z-[2]"
              style={{ top: pos.t, bottom: pos.b, left: pos.l, right: pos.r, borderWidth: pos.bw, borderStyle: 'solid', borderColor: 'var(--gold-primary)' }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
