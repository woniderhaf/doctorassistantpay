import { roundedHoursFromRange } from './timeRounding';
import { addMinutes, startOfDay } from './dateHelpers';
import { surgeriesTotal } from './workEntry';
import type { PlannedShift, Surgery, WorkEntry } from './types';

/** Ориентировочная длительность по плану (справка в UI, в оплату не идёт). */
export function plannedRoundedHours(shift: PlannedShift): number {
  return roundedHoursFromRange(shift.startTime, shift.endTime);
}

/** Ориентировочная сумма по плану: часы × ставка + операции (в оплату не идёт до closeShift). */
export function estimatedPay(shift: PlannedShift): number {
  return plannedRoundedHours(shift) * shift.rate + surgeriesTotal(shift.surgeries);
}

/** Время напоминания (поле сохранено для round-trip iOS; UI v1 не использует). */
export function reminderFireDate(shift: PlannedShift): number | null {
  if (!shift.reminderEnabled) return null;
  return addMinutes(shift.startTime, -shift.reminderOffsetMinutes);
}

/** Плановое время начала наступило, а смена ещё не подтверждена. */
export function isDue(shift: PlannedShift, now: number = Date.now()): boolean {
  return shift.status === 'planned' && shift.startTime <= now;
}

/**
 * Закрытие смены → запись о работе (порт WorkStore.closeShift).
 * start = фактическое начало либо плановое; защита end <= start ⇒ start + 60с.
 * Ставка, заметка и операции переносятся, день — локальная полночь начала смены.
 */
export function makeEntryFromShift(shift: PlannedShift, endMs: number, newId: () => string): WorkEntry {
  const start = shift.actualStartTime ?? shift.startTime;
  const end = endMs <= start ? start + 60_000 : endMs;
  return {
    id: newId(),
    date: startOfDay(start),
    inputMode: { kind: 'timeRange', start, end },
    rate: shift.rate,
    overridePay: null,
    note: shift.note,
    surgeries: shift.surgeries.map(s => ({ ...s }))
  };
}

/** Черновик операции: пустое имя, цена по умолчанию из настроек. */
export function draftSurgery(defaultPrice: number): Surgery {
  return { name: '', price: defaultPrice };
}
