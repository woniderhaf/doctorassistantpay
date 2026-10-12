import { describe, it, expect } from 'vitest';
import { roundedHoursFromMinutes, roundedHoursFromRange } from '../timeRounding';

const HOUR = 3_600_000;
const MIN = 60_000;

describe('TimeRounding.roundedHoursFromMinutes', () => {
  it('пример из ТЗ: 6ч40м → 6,5', () => {
    expect(roundedHoursFromMinutes(6 * 60 + 40)).toBeCloseTo(6.5, 4);
  });

  it('пример из ТЗ: 6ч50м → 7', () => {
    expect(roundedHoursFromMinutes(6 * 60 + 50)).toBeCloseTo(7.0, 4);
  });

  it('целые часы — без округления', () => {
    expect(roundedHoursFromMinutes(4 * 60)).toBeCloseTo(4.0, 4);
  });

  it('ровно полчаса остаётся получасом', () => {
    expect(roundedHoursFromMinutes(6 * 60 + 30)).toBeCloseTo(6.5, 4);
  });

  it('14 минут (ниже середины) — вниз', () => {
    expect(roundedHoursFromMinutes(3 * 60 + 14)).toBeCloseTo(3.0, 4);
  });

  it('16 минут (выше середины) — вверх', () => {
    expect(roundedHoursFromMinutes(3 * 60 + 16)).toBeCloseTo(3.5, 4);
  });

  it('ровно 15 минут — вверх (от нуля)', () => {
    expect(roundedHoursFromMinutes(3 * 60 + 15)).toBeCloseTo(3.5, 4);
  });

  it('ровно 45 минут — вверх до следующего часа', () => {
    expect(roundedHoursFromMinutes(3 * 60 + 45)).toBeCloseTo(4.0, 4);
  });

  it('51 минута — полный следующий час', () => {
    expect(roundedHoursFromMinutes(3 * 60 + 51)).toBeCloseTo(4.0, 4);
  });

  it('0 и отрицательная длительность — 0', () => {
    expect(roundedHoursFromMinutes(0)).toBe(0);
    expect(roundedHoursFromMinutes(-10)).toBe(0);
  });
});

describe('TimeRounding.roundedHoursFromRange', () => {
  it('15:00 → 19:00 = 4 часа', () => {
    const start = new Date(2026, 8, 7, 15, 0).getTime();
    const end = new Date(2026, 8, 7, 19, 0).getTime();
    expect(roundedHoursFromRange(start, end)).toBeCloseTo(4.0, 4);
  });

  it('end раньше start — 0', () => {
    const start = new Date(2026, 8, 7, 19, 0).getTime();
    const end = new Date(2026, 8, 7, 15, 0).getTime();
    expect(roundedHoursFromRange(start, end)).toBe(0);
  });

  it('смена через полночь: 22:00 → 02:00 = 4 часа', () => {
    const start = new Date(2026, 8, 7, 22, 0).getTime();
    const end = start + 4 * HOUR; // 02:00 следующего дня
    expect(roundedHoursFromRange(start, end)).toBeCloseTo(4.0, 4);
  });

  it('минута длительности округляется в 0 (защита closeShift +60с)', () => {
    const start = Date.now();
    expect(roundedHoursFromRange(start, start + MIN)).toBe(0);
  });
});
