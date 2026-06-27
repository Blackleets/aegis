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

export function LocalClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const parts = new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZoneName: 'short',
      }).formatToParts(new Date());

      const hour = parts.find((part) => part.type === 'hour')?.value ?? '--';
      const minute = parts.find((part) => part.type === 'minute')?.value ?? '--';
      const second = parts.find((part) => part.type === 'second')?.value ?? '--';
      const zone = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'LOCAL';

      setTime(`LOCAL ${hour}:${minute}:${second} ${zone}`);
    };

    updateTime();
    const intervalId = setInterval(updateTime, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return <span className="text-[var(--cyan-primary)] font-bold tabular-nums">{time || 'LOCAL --:--:--'}</span>;
}

export function ActiveEntityCount({ data }: { data: Record<string, unknown[]> }) {
  const count = useMemo(() => {
    if (!data) return 0;
    return Object.values(data).reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0);
  }, [data]);

  return <span className="text-[var(--alert-green)] font-bold tabular-nums">{count.toLocaleString()}</span>;
}
