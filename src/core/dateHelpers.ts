import type { MonthKey } from './types';

const MS_PER_MINUTE = 60_000;

/** Нормализует отметку времени к полуночи локального календаря (анлог calendar.startOfDay). */
export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** true, если две отметки относятся к одному календарному дню. */
export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

/** Полночь сегодняшнего дня. */
export function todayStart(now: number = Date.now()): number {
  return startOfDay(now);
}

export interface TimeOfDay {
  hours: number;
  minutes: number;
}

/** Собирает отметку времени из дня (локальная полночь) и времени суток. */
export function combineDateTime(dayMs: number, time: TimeOfDay): number {
  const d = new Date(dayMs);
  d.setHours(time.hours, time.minutes, 0, 0);
  return d.getTime();
}

/** Разбирает отметку времени на часы/минуты локального календаря. */
export function splitTime(ms: number): TimeOfDay {
  const d = new Date(ms);
  return { hours: d.getHours(), minutes: d.getMinutes() };
}

export function addMinutes(ms: number, minutes: number): number {
  return ms + minutes * MS_PER_MINUTE;
}

export function addDays(dayMs: number, days: number): number {
  const d = new Date(dayMs);
  d.setDate(d.getDate() + days);
  return startOfDay(d.getTime());
}

/** 'YYYY-MM-DD' из локальной полночи (для input[type=date] и URL-параметров). */
export function toDateInputValue(dayMs: number): string {
  const d = new Date(dayMs);
  const y = String(d.getFullYear()).padStart(4, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 'YYYY-MM-DD' → локальная полночь. ВАЖНО: никогда new Date('YYYY-MM-DD') —
 * это UTC-полночь, дата «поплывёт» на западных часовых поясах.
 */
export function parseLocalDate(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const d = new Date(year, month - 1, day);
  d.setHours(0, 0, 0, 0);
  // Отбраковка переполнения (2026-02-30 → март) — как DateComponents в Swift не дал бы.
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d.getTime();
}

export function monthKeyOf(ms: number): MonthKey {
  const d = new Date(ms);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
