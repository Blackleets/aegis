import { describe, expect, it } from 'vitest';
import { safeVibrate } from '../src/lib/browser-capabilities';

describe('safe browser capabilities', () => {
  it('returns unavailable when vibration is unsupported', () => {
    expect(safeVibrate([100], null)).toEqual({
      capability: 'vibration',
      status: 'unavailable',
      value: false,
    });
  });

  it('returns available when vibration succeeds', () => {
    const calls: Array<number | number[]> = [];
    const result = safeVibrate([120, 80, 120], (pattern) => {
      calls.push(pattern);
      return true;
    });

    expect(calls).toEqual([[120, 80, 120]]);
    expect(result).toEqual({
      capability: 'vibration',
      status: 'available',
      value: true,
    });
  });

  it('returns blocked when the browser refuses vibration', () => {
    expect(safeVibrate(80, () => false)).toEqual({
      capability: 'vibration',
      status: 'blocked',
      value: false,
    });
  });

  it('contains capability exceptions instead of throwing', () => {
    expect(safeVibrate([200], () => {
      throw new DOMException('Not allowed', 'NotAllowedError');
    })).toEqual({
      capability: 'vibration',
      status: 'failed',
      value: false,
    });
  });
});
