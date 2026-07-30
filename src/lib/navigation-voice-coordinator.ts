export type NavigationVoicePhase = 'advance' | 'now' | 'alert' | 'arrival' | 'other';

export type CoordinatedVoiceMessage = {
  text: string;
  phase: NavigationVoicePhase;
  dedupeKey: string;
  interrupt: boolean;
};

const ALERT_PATTERN = /(terremoto|incendio|accidente|inundaci[oó]n|cierre|peligro|alerta|precauci[oó]n)/i;
const ARRIVAL_PATTERN = /(has llegado|destino.*finaliz)/i;

function normalizeInstruction(value: string) {
  return value.trim().replace(/\s+/g, ' ').replace(/[.!]+$/, '');
}

export function coordinateNavigationVoiceMessage(rawText: string): CoordinatedVoiceMessage {
  const source = normalizeInstruction(rawText);
  const advanceMatch = source.match(/^(\d+)\s+metros[.,]?\s*(.+)$/i);
  const nearMatch = source.match(/^en\s+(\d+)\s+metros,?\s*(.+)$/i);

  if (ARRIVAL_PATTERN.test(source)) {
    return {
      text: source,
      phase: 'arrival',
      dedupeKey: `arrival:${source.toLowerCase()}`,
      interrupt: true,
    };
  }

  if (ALERT_PATTERN.test(source)) {
    return {
      text: source,
      phase: 'alert',
      dedupeKey: `alert:${source.toLowerCase()}`,
      interrupt: true,
    };
  }

  if (nearMatch) {
    const instruction = normalizeInstruction(nearMatch[2]);
    return {
      text: `Ahora, ${instruction}`,
      phase: 'now',
      dedupeKey: `now:${instruction.toLowerCase()}`,
      interrupt: true,
    };
  }

  if (advanceMatch) {
    const meters = Math.max(10, Number(advanceMatch[1]));
    const instruction = normalizeInstruction(advanceMatch[2]);
    return {
      text: `En ${meters} metros, ${instruction}`,
      phase: 'advance',
      dedupeKey: `advance:${instruction.toLowerCase()}`,
      interrupt: true,
    };
  }

  return {
    text: source,
    phase: 'other',
    dedupeKey: `other:${source.toLowerCase()}`,
    interrupt: false,
  };
}

export function shouldSpeakCoordinatedMessage(
  previousAt: number | undefined,
  now: number,
  phase: NavigationVoicePhase,
) {
  if (previousAt === undefined) return true;
  const cooldownMs = phase === 'alert' ? 30_000 : phase === 'arrival' ? 60_000 : 12_000;
  return now - previousAt >= cooldownMs;
}
