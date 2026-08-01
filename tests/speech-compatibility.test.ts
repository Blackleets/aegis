import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { MOBILE_NOTIFICATION_GUARD_SCRIPT } from '../src/lib/notification-compatibility';

function runGuard({
  speak,
  cancel,
  construct,
}: {
  speak: () => void;
  cancel: () => void;
  construct: (text: string) => object;
}) {
  const speechSynthesis = { speak, cancel };
  function NativeUtterance(this: object, text: string) {
    return construct(text);
  }

  const windowObject = {
    speechSynthesis,
    SpeechSynthesisUtterance: NativeUtterance,
  };
  const context = vm.createContext({
    window: windowObject,
    navigator: {
      userAgent: 'Mozilla/5.0 (Linux; Android 16; Mobile)',
      userAgentData: { mobile: true },
    },
  });

  vm.runInContext(MOBILE_NOTIFICATION_GUARD_SCRIPT, context);
  return windowObject;
}

describe('speech synthesis compatibility guard', () => {
  it('contains speak and cancel failures', () => {
    const guarded = runGuard({
      speak: () => { throw new Error('speak blocked'); },
      cancel: () => { throw new Error('cancel blocked'); },
      construct: (text) => ({ text }),
    });

    expect(() => guarded.speechSynthesis.cancel()).not.toThrow();
    expect(() => guarded.speechSynthesis.speak({} as SpeechSynthesisUtterance)).not.toThrow();
  });

  it('preserves working speech behavior', () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    const guarded = runGuard({
      speak,
      cancel,
      construct: (text) => ({ text }),
    });
    const utterance = new guarded.SpeechSynthesisUtterance('Gira a la derecha');

    guarded.speechSynthesis.cancel();
    guarded.speechSynthesis.speak(utterance as SpeechSynthesisUtterance);

    expect(cancel).toHaveBeenCalledOnce();
    expect(speak).toHaveBeenCalledWith(utterance);
  });

  it('returns a safe utterance when the native constructor fails', () => {
    const guarded = runGuard({
      speak: () => undefined,
      cancel: () => undefined,
      construct: () => { throw new TypeError('Illegal constructor'); },
    });

    expect(() => new guarded.SpeechSynthesisUtterance('Continúa recto')).not.toThrow();
    const utterance = new guarded.SpeechSynthesisUtterance('Continúa recto') as { text: string; rate: number };
    expect(utterance.text).toBe('Continúa recto');
    expect(utterance.rate).toBe(1);
  });
});
