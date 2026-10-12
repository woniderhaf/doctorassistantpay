/**
 * Правила округления отработанного времени — порт TimeRounding.swift.
 *
 * Смена округляется до ближайшего получаса: 6ч40м → 6,5; 6ч50м → 7.
 * Ровно 15/45 минут округляются вверх (toNearestOrAwayFromZero; для
 * положительных значений Math.round ведёт себя так же).
 */

/** Округляет длительность в минутах к кратным 0,5 часам. */
export function roundedHoursFromMinutes(minutes: number): number {
  if (!(minutes > 0)) return 0;
  const halfHourUnits = Math.round(minutes / 30);
  return (halfHourUnits * 30) / 60;
}

/** Вариант от начала до конца; если end <= start — 0. */
export function roundedHoursFromRange(startMs: number, endMs: number): number {
  return roundedHoursFromMinutes((endMs - startMs) / 60_000);
}
