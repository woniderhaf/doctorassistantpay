import { describe, it, expect } from 'vitest';
import { estimatedPay, isDue, makeEntryFromShift, plannedRoundedHours } from '../plannedShift';
import { startOfDay } from '../dateHelpers';
import type { PlannedShift } from '../types';

const MIN = 60_000;

function makeShift(patch: Partial<PlannedShift> = {}): PlannedShift {
  const date = new Date(2026, 8, 8).getTime();
  return {
    id: 's1',
    date,
    startTime: new Date(2026, 8, 8, 9, 0).getTime(),
    endTime: new Date(2026, 8, 8, 17, 0).getTime(),
    rate: 400,
    reminderEnabled: true,
    reminderOffsetMinutes: 60,
    status: 'planned',
    actualStartTime: null,
    note: null,
    surgeries: [],
    ...patch
  };
}

const newId = (() => {
  let n = 0;
  return () => `gen-${++n}`;
})();

describe('PlannedShift', () => {
  it('plannedRoundedHours/estimatedPay — справка, 9–17 при 400 = 3200', () => {
    const s = makeShift();
    expect(plannedRoundedHours(s)).toBeCloseTo(8.0, 4);
    expect(estimatedPay(s)).toBeCloseTo(3200, 4);
  });

  it('isDue: planned и startTime <= now → true', () => {
    const s = makeShift();
    expect(isDue(s, s.startTime)).toBe(true);
    expect(isDue(s, s.startTime + MIN)).toBe(true);
  });

  it('isDue: будущая смена → false', () => {
    const s = makeShift();
    expect(isDue(s, s.startTime - MIN)).toBe(false);
  });

  it('isDue: активная смена → false (уже подтверждена)', () => {
    const s = makeShift({ status: 'active' });
    expect(isDue(s, s.startTime + MIN)).toBe(false);
  });

  it('estimatedPay включает операции: 8 ч × 400 + 1500 = 4700', () => {
    const s = makeShift({ surgeries: [{ name: 'имплантат', price: 1500 }] });
    expect(estimatedPay(s)).toBeCloseTo(4700, 4);
  });
});

describe('makeEntryFromShift (порт WorkStore.closeShift)', () => {
  it('создаёт запись с фактическим временем и копирует ставку/заметку', () => {
    const actual = new Date(2026, 8, 8, 9, 5).getTime();
    const s = makeShift({ status: 'active', actualStartTime: actual, note: 'плановая' });
    const end = new Date(2026, 8, 8, 17, 0).getTime();
    const entry = makeEntryFromShift(s, end, newId);
    expect(entry.inputMode).toEqual({ kind: 'timeRange', start: actual, end });
    expect(entry.rate).toBe(400);
    expect(entry.note).toBe('плановая');
    expect(entry.overridePay).toBeNull();
    expect(entry.date).toBe(startOfDay(actual));
  });

  it('без actualStartTime берёт плановое начало', () => {
    const s = makeShift();
    const entry = makeEntryFromShift(s, s.endTime, newId);
    if (entry.inputMode.kind !== 'timeRange') throw new Error('expected timeRange');
    expect(entry.inputMode.start).toBe(s.startTime);
  });

  it('end <= start → end = start + 60с (защита от нулевой длительности)', () => {
    const s = makeShift({ status: 'active', actualStartTime: new Date(2026, 8, 8, 9, 0).getTime() });
    const entry = makeEntryFromShift(s, s.startTime, newId); // end == start
    if (entry.inputMode.kind !== 'timeRange') throw new Error('expected timeRange');
    expect(entry.inputMode.end - entry.inputMode.start).toBe(MIN);
  });
});
