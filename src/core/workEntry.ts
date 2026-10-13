import { roundedHoursFromMinutes, roundedHoursFromRange } from './timeRounding';
import type { Surgery, WorkEntry } from './types';

/** Сумма операций смены. */
export function surgeriesTotal(surgeries: Surgery[]): number {
  return surgeries.reduce((sum, s) => sum + s.price, 0);
}

/** Продолжительность смены в минутах без округления. */
export function rawMinutes(entry: WorkEntry): number {
  switch (entry.inputMode.kind) {
    case 'timeRange':
      return Math.max((entry.inputMode.end - entry.inputMode.start) / 60_000, 0);
    case 'duration':
      return entry.inputMode.hours * 60 + entry.inputMode.minutes;
  }
}

/** Отработанные часы после округления до ближайшего получаса. */
export function roundedHours(entry: WorkEntry): number {
  return entry.inputMode.kind === 'timeRange'
    ? roundedHoursFromRange(entry.inputMode.start, entry.inputMode.end)
    : roundedHoursFromMinutes(rawMinutes(entry));
}

/** Автоматическая сумма (без ручной правки): часы × ставка + операции. */
export function computedPay(entry: WorkEntry): number {
  return roundedHours(entry) * entry.rate + surgeriesTotal(entry.surgeries);
}

/** Итог к выплате: ручная правка либо авторасчёт. */
export function finalPay(entry: WorkEntry): number {
  return entry.overridePay ?? computedPay(entry);
}

export function isPayOverridden(entry: WorkEntry): boolean {
  return entry.overridePay !== null && entry.overridePay !== undefined;
}
