'use client';

import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://swgixcbwyhxttnmrglbk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_b748XKL85hwy_imabpkFxg_ZQZ-rYqF';
const PRESENCE_CHANNEL = 'aegis:global-presence';

type PresenceStatus = 'connecting' | 'live' | 'unavailable';

function getAnonymousPresenceKey() {
  const storageKey = 'aegis:presence-id';
  try {
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const id = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(storageKey, id);
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function useRealtimePresence() {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [status, setStatus] = useState<PresenceStatus>('connecting');

  useEffect(() => {
    const presenceKey = getAnonymousPresenceKey();
    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 2 } },
    });
    let channel: RealtimeChannel | null = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: presenceKey } },
    });
    let active = true;
    const timeout = window.setTimeout(() => {
      if (!active) return;
      setStatus('unavailable');
      setOnlineCount(null);
    }, 10000);

    const syncCount = () => {
      if (!active || !channel) return;
      const state = channel.presenceState();
      setOnlineCount(Object.keys(state).length);
      setStatus('live');
      window.clearTimeout(timeout);
    };

    channel
      .on('presence', { event: 'sync' }, syncCount)
      .on('presence', { event: 'join' }, syncCount)
      .on('presence', { event: 'leave' }, syncCount)
      .subscribe(async (subscriptionStatus) => {
        if (!active || !channel) return;
        if (subscriptionStatus === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
            surface: 'earth',
          });
          syncCount();
        } else if (subscriptionStatus === 'CHANNEL_ERROR' || subscriptionStatus === 'TIMED_OUT') {
          setStatus('unavailable');
          setOnlineCount(null);
        }
      });

    return () => {
      active = false;
      window.clearTimeout(timeout);
      if (channel) {
        void channel.untrack();
        void supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, []);

  return { onlineCount, status };
}
