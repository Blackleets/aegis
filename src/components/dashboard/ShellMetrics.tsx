import { useEffect, useMemo, useRef, useState } from 'react';

export function UptimeClock() {
  const [uptime, setUptime] = useState('00:00:00');
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    startTime.current = Date.now();
    const intervalId = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - (startTime.current ?? Date.now())) / 1000);
      const hours = String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0');
      const seconds = String(elapsedSeconds % 60).padStart(2, '0');
      setUptime(`${hours}:${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <span className="hidden lg:inline">
      UPTIME: <span className="text-[var(--gold-primary)]">{uptime}</span>
    </span>
  );
}

function formatLocalClock(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
    timeZone,
    timeZoneName: 'short',
  }).formatToParts(now);

  const hour = parts.find((part) => part.type === 'hour')?.value ?? '--';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '--';
  const second = parts.find((part) => part.type === 'second')?.value ?? '--';
  const zone = parts.find((part) => part.type === 'timeZoneName')?.value ?? timeZone;

  return `LOCAL ${hour}:${minute}:${second} ${zone}`;
}

export function LocalClock() {
  const [time, setTime] = useState('LOCAL --:--:--');

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const updateTime = () => {
      setTime(formatLocalClock(new Date(), timeZone));
    };

    const startAlignedClock = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);

      updateTime();
      const delayToNextSecond = 1000 - (Date.now() % 1000) + 8;
      timeoutId = setTimeout(() => {
        updateTime();
        intervalId = setInterval(updateTime, 1000);
      }, delayToNextSecond);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) startAlignedClock();
    };

    startAlignedClock();
    window.addEventListener('focus', startAlignedClock);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('focus', startAlignedClock);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return <span className="text-[var(--cyan-primary)] font-bold tabular-nums">{time}</span>;
}

export function ActiveEntityCount({ data }: { data: Record<string, unknown[]> }) {
  const count = useMemo(() => {
    if (!data) return 0;
    return Object.values(data).reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0);
  }, [data]);

  return <span className="text-[var(--alert-green)] font-bold tabular-nums">{count.toLocaleString()}</span>;
}
