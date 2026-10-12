import type { MonthKey } from './types';

export function monthKeyId(key: MonthKey): string {
  return `${key.year}-${String(key.month).padStart(2, '0')}`;
}

export function compareMonthKeys(a: MonthKey, b: MonthKey): number {
  return a.year !== b.year ? a.year - b.year : a.month - b.month;
}

/** Сдвиг месяца на delta (корректно через границу года). */
export function addMonths(key: MonthKey, delta: number): MonthKey {
  const zeroBased = key.month - 1 + delta;
  const year = key.year + Math.floor(zeroBased / 12);
  const month = ((zeroBased % 12) + 12) % 12 + 1;
  return { year, month };
}

/** Первый день месяца (локальная полночь). */
export function monthStart(key: MonthKey): number {
  const d = new Date(key.year, key.month - 1, 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Первый день следующего месяца (верхняя граница, не включительно). */
export function monthEnd(key: MonthKey): number {
  return monthStart(addMonths(key, 1));
}

export function parseMonthKey(value: string): MonthKey | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year: Number(match[1]), month };
}

/** Текущий месяц относительно now. */
export function currentMonthKey(now: number = Date.now()): MonthKey {
  const d = new Date(now);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
