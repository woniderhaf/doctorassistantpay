/**
 * Форматирование через Intl (ru-RU) — замена пяти Swift-форматтеров.
 *
 * Разделители разрядов нормализуются к NBSP (U+00A0): ICU в разных браузерах
 * ставит то узкий U+202F, то обычный U+0020, а iOS-форматтеры дают NBSP —
 * держим NBSP стабильно, чтобы вид не зависел от версии ICU.
 */

const LOCALE = 'ru-RU';
const NBSP = ' ';

/** Любые пробелоподобные разделители → NBSP (\s покрывает U+0020, U+00A0, U+202F, U+2009). */
function normalizeSpaces(value: string): string {
  return value.replace(/\s/g, NBSP);
}

const moneyNumber = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const hoursNumber = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });

/** "12 600 ₽" — до двух знаков после запятой, NBSP перед ₽. */
export function formatMoney(value: number): string {
  return `${normalizeSpaces(moneyNumber.format(value))}${NBSP}₽`;
}

/** "6,5 ч" / "7 ч". */
export function formatHours(value: number): string {
  return `${normalizeSpaces(hoursNumber.format(value))}${NBSP}ч`;
}

const timeFmt = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

/** "09:00". */
export function formatTime(ms: number): string {
  return timeFmt.format(ms);
}

const shortDayFmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long' });
const weekdayFmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'long' });
const monthFmt = new Intl.DateTimeFormat(LOCALE, { month: 'long' });

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** "12 октября, понедельник" — как в iOS «d MMMM, EEEE»: weekday со строчной, день впереди. */
export function formatFullDay(ms: number): string {
  return `${formatShortDay(ms)}, ${weekdayFmt.format(ms)}`;
}

/** "12 октября". */
export function formatShortDay(ms: number): string {
  return capitalize(normalizeSpaces(shortDayFmt.format(ms)));
}

/** "Октябрь 2026" — без суффикса « г.», который Intl добавляет в режиме year. */
export function formatMonthYear(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  d.setHours(0, 0, 0, 0);
  return `${capitalize(monthFmt.format(d))}${NBSP}${year}`;
}

const entryPlural = new Intl.PluralRules(LOCALE);
const ENTRY_FORMS: Record<string, string> = {
  one: 'запись',
  few: 'записи',
  many: 'записей',
  other: 'записей'
};

/** Русская плюрализация: 1 запись, 2 записи, 5 записей. */
export function formatEntriesCount(count: number): string {
  return `${count} ${ENTRY_FORMS[entryPlural.select(count)]}`;
}
