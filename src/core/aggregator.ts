import { monthKeyOf, startOfDay } from './dateHelpers';
import { compareMonthKeys, monthKeyId } from './monthKey';
import { finalPay, roundedHours } from './workEntry';
import { PERIOD_SUMMARY_ZERO } from './types';
import type { MonthKey, MonthlySummaryItem, PeriodSummary, WorkEntry } from './types';

/** Суммарные часы/оплата/число записей по набору. */
export function summarize(entries: WorkEntry[]): PeriodSummary {
  if (entries.length === 0) return PERIOD_SUMMARY_ZERO;
  let totalHours = 0;
  let totalPay = 0;
  for (const e of entries) {
    totalHours += roundedHours(e);
    totalPay += finalPay(e);
  }
  return { totalHours, totalPay, entryCount: entries.length };
}

/** Группировка по месяцу; ключ Map — monthKeyId. */
export function groupByMonth(entries: WorkEntry[]): Map<string, WorkEntry[]> {
  const map = new Map<string, WorkEntry[]>();
  for (const e of entries) {
    const id = monthKeyId(monthKeyOf(e.date));
    const bucket = map.get(id);
    if (bucket) bucket.push(e);
    else map.set(id, [e]);
  }
  return map;
}

/** Группировка по календарному дню (для детализации месяца). */
export function groupByDay(entries: WorkEntry[]): Map<number, WorkEntry[]> {
  const map = new Map<number, WorkEntry[]>();
  for (const e of entries) {
    const day = startOfDay(e.date);
    const bucket = map.get(day);
    if (bucket) bucket.push(e);
    else map.set(day, [e]);
  }
  return map;
}

/** Итоги по всем месяцам, новые сверху — основа истории. */
export function monthlySummaries(entries: WorkEntry[]): MonthlySummaryItem[] {
  const items: MonthlySummaryItem[] = [];
  for (const [id, bucket] of groupByMonth(entries)) {
    const [year, month] = id.split('-').map(Number) as [number, number];
    items.push({ month: { year, month }, summary: summarize(bucket) });
  }
  return items.sort((a, b) => compareMonthKeys(b.month, a.month));
}

/** Итог за диапазон месяцев включительно (порядок from/to не важен). */
export function summarizePeriod(entries: WorkEntry[], from: MonthKey, to: MonthKey): PeriodSummary {
  const lower = compareMonthKeys(from, to) <= 0 ? from : to;
  const upper = compareMonthKeys(from, to) <= 0 ? to : from;
  const filtered = entries.filter(e => {
    const key = monthKeyOf(e.date);
    return compareMonthKeys(key, lower) >= 0 && compareMonthKeys(key, upper) <= 0;
  });
  return summarize(filtered);
}

/** Месяцы, в которых есть записи, + текущий; новые сверху (для фильтров «Итогов»). */
export function availableMonths(entries: WorkEntry[], now: number = Date.now()): MonthKey[] {
  const keys = new Map<string, MonthKey>();
  for (const [id] of groupByMonth(entries)) {
    const [year, month] = id.split('-').map(Number) as [number, number];
    keys.set(id, { year, month });
  }
  const current = monthKeyOf(now);
  keys.set(monthKeyId(current), current);
  return [...keys.values()].sort((a, b) => compareMonthKeys(b, a));
}

/** Записи месяца, новые сверху. */
export function entriesInMonth(entries: WorkEntry[], month: MonthKey): WorkEntry[] {
  return entries
    .filter(e => compareMonthKeys(monthKeyOf(e.date), month) === 0)
    .sort((a, b) => b.date - a.date);
}
