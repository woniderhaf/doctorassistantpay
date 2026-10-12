import { describe, it, expect } from 'vitest';
import { addMonths, compareMonthKeys, monthEnd, monthKeyId, monthStart, parseMonthKey } from '../monthKey';
import { parseLocalDate, startOfDay, toDateInputValue, combineDateTime, isSameDay } from '../dateHelpers';
import { mergeSettings, DEFAULT_SETTINGS } from '../settings';
import { parseNumber } from '../parseNumber';

describe('MonthKey', () => {
  it('id в формате YYYY-MM', () => {
    expect(monthKeyId({ year: 2026, month: 9 })).toBe('2026-09');
    expect(monthKeyId({ year: 2026, month: 12 })).toBe('2026-12');
  });

  it('сравнение: сначала год, потом месяц', () => {
    expect(compareMonthKeys({ year: 2025, month: 12 }, { year: 2026, month: 1 })).toBeLessThan(0);
    expect(compareMonthKeys({ year: 2026, month: 3 }, { year: 2026, month: 5 })).toBeLessThan(0);
    expect(compareMonthKeys({ year: 2026, month: 5 }, { year: 2026, month: 5 })).toBe(0);
  });

  it('addMonths через границу года', () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths({ year: 2026, month: 6 }, 0)).toEqual({ year: 2026, month: 6 });
  });

  it('monthStart/monthEnd — границы, первый день следующего месяца', () => {
    expect(monthStart({ year: 2026, month: 12 })).toBe(new Date(2026, 11, 1).getTime());
    expect(monthEnd({ year: 2026, month: 12 })).toBe(new Date(2027, 0, 1).getTime());
  });

  it('parseMonthKey принимает только валидные', () => {
    expect(parseMonthKey('2026-09')).toEqual({ year: 2026, month: 9 });
    expect(parseMonthKey('2026-13')).toBeNull();
    expect(parseMonthKey('мусор')).toBeNull();
  });
});

describe('dateHelpers', () => {
  it('parseLocalDate никогда не использует UTC-парсинг', () => {
    const ms = parseLocalDate('2026-10-12');
    expect(ms).not.toBeNull();
    const d = new Date(ms!);
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 10, 12]);
    expect(d.getHours()).toBe(0);
  });

  it('parseLocalDate отбраковывает переполнение и мусор', () => {
    expect(parseLocalDate('2026-02-30')).toBeNull();
    expect(parseLocalDate('2026-1-2')).toBeNull();
  });

  it('toDateInputValue ↔ parseLocalDate round-trip', () => {
    const ms = startOfDay(new Date(2026, 9, 5, 13, 37).getTime());
    expect(parseLocalDate(toDateInputValue(ms))).toBe(ms);
  });

  it('combineDateTime/round-trip', () => {
    const dayMs = startOfDay(Date.now());
    const ms = combineDateTime(dayMs, { hours: 9, minutes: 15 });
    const d = new Date(ms);
    expect([d.getHours(), d.getMinutes()]).toEqual([9, 15]);
    expect(isSameDay(ms, dayMs)).toBe(true);
  });
});

describe('settings / parseNumber', () => {
  it('mergeSettings подтягивает дефолты (анлог decodeIfPresent)', () => {
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings({ hourlyRate: 500 }).hourlyRate).toBe(500);
    expect(mergeSettings({ hourlyRate: NaN }).hourlyRate).toBe(DEFAULT_SETTINGS.hourlyRate);
  });

  it('parseNumber: запятая, пробелы, мусор', () => {
    expect(parseNumber('400')).toBe(400);
    expect(parseNumber('400,5')).toBe(400.5);
    expect(parseNumber('1 234,56')).toBe(1234.56);
    expect(parseNumber('1000')).toBe(1000);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('4.0')).toBe(4);
  });
});
