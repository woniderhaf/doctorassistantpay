/**
 * Порт предметной модели PayCalcCore (iOS) в TypeScript.
 *
 * Все даты — epoch milliseconds (number). Поле `date` нормализуется к полуночи
 * локального календаря — та же семантика, что `Calendar.current.startOfDay` в Swift.
 */

/** Смена задана временем начала/окончания либо длительностью напрямую. */
export type InputMode =
  | { kind: 'timeRange'; start: number; end: number }
  | { kind: 'duration'; hours: number; minutes: number };

/** Одна запись о работе за конкретный день. */
export interface WorkEntry {
  id: string;
  /** День записи (нормализован к полуночи). */
  date: number;
  inputMode: InputMode;
  /** Ставка в час (₽/час) на момент создания/редактирования. */
  rate: number;
  /** Ручная правка итоговой суммы — приоритетнее авторасчёта. */
  overridePay: number | null;
  note: string | null;
}

/**
 * Плановая смена. Пока status planned|active — в расчёт зарплаты НЕ входит
 * (агрегатор их никогда не видит). При закрытии из неё создаётся WorkEntry.
 */
export type PlannedShiftStatus = 'planned' | 'active';

export interface PlannedShift {
  id: string;
  date: number;
  startTime: number;
  endTime: number;
  rate: number;
  /** Поля напоминаний сохранены для round-trip с iOS-экспортом; UI веб-версии v1 их не показывает. */
  reminderEnabled: boolean;
  reminderOffsetMinutes: number;
  status: PlannedShiftStatus;
  actualStartTime: number | null;
  note: string | null;
}

export interface AppSettings {
  /** Ставка по умолчанию, ₽/час (дефолт iOS — 400). */
  hourlyRate: number;
  /** Сохранено для round-trip с iOS; UI v1 не показывает. */
  dailyReminderEnabled: boolean;
}

/** Итоги по набору записей. */
export interface PeriodSummary {
  totalHours: number;
  totalPay: number;
  entryCount: number;
}

export interface MonthlySummaryItem {
  month: MonthKey;
  summary: PeriodSummary;
}

/** Ключ месяца (год + месяц 1..12) — группировка истории и итоги за период. */
export interface MonthKey {
  year: number;
  /** 1..12 */
  month: number;
}

export const PERIOD_SUMMARY_ZERO: PeriodSummary = { totalHours: 0, totalPay: 0, entryCount: 0 };
