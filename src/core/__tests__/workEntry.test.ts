import { describe, it, expect } from 'vitest';
import { computedPay, finalPay, isPayOverridden, rawMinutes, roundedHours } from '../workEntry';
import type { WorkEntry } from '../types';

function makeEntry(patch: Partial<WorkEntry> = {}): WorkEntry {
  const start = new Date(2026, 8, 7, 15, 0).getTime();
  return {
    id: 'e1',
    date: new Date(2026, 8, 7).getTime(),
    inputMode: { kind: 'timeRange', start, end: start + 4 * 3_600_000 },
    rate: 400,
    overridePay: null,
    note: null,
    ...patch
  };
}

describe('WorkEntry', () => {
  it('computedPay из timeRange', () => {
    const e = makeEntry();
    expect(roundedHours(e)).toBeCloseTo(4.0, 4);
    expect(computedPay(e)).toBeCloseTo(1600, 4);
    expect(finalPay(e)).toBeCloseTo(1600, 4);
    expect(isPayOverridden(e)).toBe(false);
  });

  it('computedPay из duration: 6ч40м при 400 → 2600', () => {
    const e = makeEntry({ inputMode: { kind: 'duration', hours: 6, minutes: 40 } });
    expect(rawMinutes(e)).toBe(400);
    expect(roundedHours(e)).toBeCloseTo(6.5, 4);
    expect(computedPay(e)).toBeCloseTo(2600, 4);
  });

  it('computedPay из duration: 6ч50м при 400 → 2800', () => {
    const e = makeEntry({ inputMode: { kind: 'duration', hours: 6, minutes: 50 } });
    expect(roundedHours(e)).toBeCloseTo(7.0, 4);
    expect(computedPay(e)).toBeCloseTo(2800, 4);
  });

  it('override приоритетнее авторасчёта, computedPay остаётся', () => {
    const e = makeEntry({ inputMode: { kind: 'duration', hours: 6, minutes: 40 }, overridePay: 3000 });
    expect(finalPay(e)).toBeCloseTo(3000, 4);
    expect(isPayOverridden(e)).toBe(true);
    expect(computedPay(e)).toBeCloseTo(2600, 4);
  });

  it('timeRange с end <= start → 0 минут', () => {
    const start = new Date(2026, 8, 7, 19, 0).getTime();
    const e = makeEntry({ inputMode: { kind: 'timeRange', start, end: start - 3_600_000 } });
    expect(rawMinutes(e)).toBe(0);
    expect(roundedHours(e)).toBe(0);
  });
});
