import { describe, it, expect } from 'vitest';
import {
  availableMonths,
  entriesInMonth,
  groupByDay,
  monthlySummaries,
  summarize,
  summarizePeriod
} from '../aggregator';
import type { WorkEntry } from '../types';

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d).getTime();

function entry(date: number, hours: number, pay: number, id = ''): WorkEntry {
  return {
    id: id || `e-${date}`,
    date,
    inputMode: { kind: 'duration', hours, minutes: 0 },
    rate: hours ? pay / hours : 0,
    overridePay: pay, // фиксируем сумму: hours*rate == pay
    note: null
  };
}

describe('summarize', () => {
  it('пустой набор — нули', () => {
    expect(summarize([])).toEqual({ totalHours: 0, totalPay: 0, entryCount: 0 });
  });

  it('суммы часов и оплаты', () => {
    const s = summarize([entry(day(2026, 9, 1), 4, 1600), entry(day(2026, 9, 2), 6.5, 2600)]);
    expect(s.totalHours).toBeCloseTo(10.5, 4);
    expect(s.totalPay).toBeCloseTo(4200, 4);
    expect(s.entryCount).toBe(2);
  });
});

describe('monthlySummaries', () => {
  const entries = [
    entry(day(2026, 8, 10), 4, 1600),
    entry(day(2026, 9, 1), 8, 3200),
    entry(day(2026, 9, 15), 6, 2400),
    entry(day(2026, 7, 5), 2, 800)
  ];

  it('сортировка новые сверху, группировка по месяцам', () => {
    const list = monthlySummaries(entries);
    expect(list.map(i => `${i.month.year}-${i.month.month}`)).toEqual(['2026-9', '2026-8', '2026-7']);
    expect(list[0]!.summary.totalPay).toBeCloseTo(5600, 4);
    expect(list[0]!.summary.entryCount).toBe(2);
  });
});

describe('summarizePeriod', () => {
  const entries = [
    entry(day(2026, 6, 1), 4, 1600),
    entry(day(2026, 7, 1), 4, 1600),
    entry(day(2026, 8, 1), 4, 1600),
    entry(day(2026, 9, 1), 4, 1600)
  ];

  it('диапазон включительно с обоих концов', () => {
    const s = summarizePeriod(entries, { year: 2026, month: 7 }, { year: 2026, month: 8 });
    expect(s.entryCount).toBe(2);
    expect(s.totalPay).toBeCloseTo(3200, 4);
  });

  it('порядок from/to не важен', () => {
    const s = summarizePeriod(entries, { year: 2026, month: 8 }, { year: 2026, month: 7 });
    expect(s.entryCount).toBe(2);
  });

  it('один месяц — только он', () => {
    const s = summarizePeriod(entries, { year: 2026, month: 9 }, { year: 2026, month: 9 });
    expect(s.entryCount).toBe(1);
  });
});

describe('entriesInMonth / groupByDay / availableMonths', () => {
  const e1 = entry(day(2026, 9, 1), 4, 1600, 'a');
  const e2 = entry(day(2026, 9, 20), 4, 1600, 'b');
  const other = entry(day(2026, 8, 15), 4, 1600, 'c');
  const entries = [e1, e2, other];

  it('entriesInMonth фильтрует и сортирует новые сверху', () => {
    const list = entriesInMonth(entries, { year: 2026, month: 9 });
    expect(list.map(e => e.id)).toEqual(['b', 'a']);
  });

  it('groupByDay группирует по локальной полуночи', () => {
    const map = groupByDay(entries);
    expect(map.size).toBe(3);
    expect([...map.keys()].every(k => k === day(2026, 9, 1) || k === day(2026, 9, 20) || k === day(2026, 8, 15))).toBe(true);
  });

  it('availableMonths включает месяцы записей + текущий, новые сверху', () => {
    const months = availableMonths(entries, day(2026, 10, 5));
    expect(months.map(m => `${m.year}-${m.month}`)).toEqual(['2026-10', '2026-9', '2026-8']);
  });
});
