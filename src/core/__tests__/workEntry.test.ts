import { describe, it, expect } from 'vitest';
import { computedPay, finalPay, isPayOverridden, rawMinutes, roundedHours, surgeriesTotal } from '../workEntry';
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
    surgeries: [],
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

  it('операции прибавляются к авторасчёту', () => {
    const e = makeEntry({
      inputMode: { kind: 'duration', hours: 6, minutes: 40 },
      surgeries: [
        { name: 'имплантат', price: 1000 },
        { name: 'чистка', price: 1500 }
      ]
    });
    expect(surgeriesTotal(e.surgeries)).toBe(2500);
    // 6,5 ч × 400 + 2500 = 5100
    expect(computedPay(e)).toBeCloseTo(5100, 4);
    expect(finalPay(e)).toBeCloseTo(5100, 4);
  });

  it('ручная сумма перекрывает и часы, и операции', () => {
    const e = makeEntry({
      surgeries: [{ name: 'имплантат', price: 1000 }],
      overridePay: 10000
    });
    expect(finalPay(e)).toBe(10000);
    // авторасчёт остаётся виден: 4 ч × 400 + 1000
    expect(computedPay(e)).toBeCloseTo(2600, 4);
  });

  it('пустые операции не меняют сумму', () => {
    expect(surgeriesTotal([])).toBe(0);
    expect(computedPay(makeEntry())).toBeCloseTo(1600, 4);
  });
});
