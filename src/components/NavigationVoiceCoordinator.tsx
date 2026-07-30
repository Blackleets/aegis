'use client';

import { useEffect } from 'react';

import {
  coordinateNavigationVoiceMessage,
  shouldSpeakCoordinatedMessage,
} from '@/lib/navigation-voice-coordinator';

export default function NavigationVoiceCoordinator() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;

    const synthesis = window.speechSynthesis;
    const originalSpeak = synthesis.speak.bind(synthesis);
    const spokenAt = new Map<string, number>();

    const coordinatedSpeak = (utterance: SpeechSynthesisUtterance) => {
      const message = coordinateNavigationVoiceMessage(utterance.text);
      const now = Date.now();
      const previousAt = spokenAt.get(message.dedupeKey);
      if (!shouldSpeakCoordinatedMessage(previousAt, now, message.phase)) return;

      spokenAt.set(message.dedupeKey, now);
      if (spokenAt.size > 80) {
        for (const [key, timestamp] of spokenAt) {
          if (now - timestamp > 120_000) spokenAt.delete(key);
        }
      }

      if (message.interrupt) synthesis.cancel();
      utterance.text = message.text;
      originalSpeak(utterance);
    };

    synthesis.speak = coordinatedSpeak;
    return () => {
      synthesis.speak = originalSpeak;
      spokenAt.clear();
    };
  }, []);

  return null;
}
