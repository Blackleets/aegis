import { describe, expect, it } from 'vitest';

import {
  coordinateNavigationVoiceMessage,
  shouldSpeakCoordinatedMessage,
} from './navigation-voice-coordinator';

describe('navigation voice coordinator', () => {
  it('normalizes the first step announcement into an advance instruction', () => {
    expect(coordinateNavigationVoiceMessage('320 metros. Gira a la derecha.')).toMatchObject({
      text: 'En 320 metros, Gira a la derecha',
      phase: 'advance',
      interrupt: true,
    });
  });

  it('turns the near-step announcement into an immediate instruction', () => {
    expect(coordinateNavigationVoiceMessage('En 80 metros, gira a la izquierda')).toMatchObject({
      text: 'Ahora, gira a la izquierda',
      phase: 'now',
      interrupt: true,
    });
  });

  it('prioritizes operational alerts and arrival messages', () => {
    expect(coordinateNavigationVoiceMessage('Incendio próximo a la ruta')).toMatchObject({ phase: 'alert', interrupt: true });
    expect(coordinateNavigationVoiceMessage('Has llegado a tu destino. La ruta ha finalizado.')).toMatchObject({ phase: 'arrival', interrupt: true });
  });

  it('blocks repeated messages during their cooldown', () => {
    expect(shouldSpeakCoordinatedMessage(undefined, 10_000, 'advance')).toBe(true);
    expect(shouldSpeakCoordinatedMessage(10_000, 20_000, 'advance')).toBe(false);
    expect(shouldSpeakCoordinatedMessage(10_000, 22_000, 'advance')).toBe(true);
  });
});
