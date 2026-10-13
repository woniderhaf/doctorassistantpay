import { startOfDay } from '../dateHelpers';
import { mergeSettings } from '../settings';
import type { AppSettings, InputMode, PlannedShift, Surgery, WorkEntry } from '../types';

/**
 * Импорт файлов iOS-приложения (work_entries.json / planned_shifts.json / app_settings.json).
 *
 * Swift JSONEncoder по умолчанию:
 * - Date → {"timeIntervalSinceReferenceDate": секунды}, reference date = 2001-01-01T00:00 UTC;
 * - enum InputMode без associated-тега → {"timeRange": {start,end}} / {"duration": {hours,minutes}};
 * - опциональные nil-поля просто отсутствуют.
 *
 * Парсер толерантный: принимаем и «сырое число» вместо объекта Date, и tagged-вариант
 * enum ({"kind":"timeRange",...}), и лишние поля — на случай ручной правки файлов.
 */

/** Epoch reference date 2001-01-01T00:00:00Z в секундах. */
const SWIFT_REFERENCE_DATE_EPOCH_S = 978_307_200;

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export interface IosImportResult {
  entries: WorkEntry[];
  plannedShifts: PlannedShift[];
  settings: AppSettings;
  /** Что пропущено и почему — показываем пользователю, молчаливая потеря данных хуже ошибки. */
  warnings: string[];
}

function parseJsonArray(source: string, fileName: string): Json[] | string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return `${fileName}: не корректный JSON`;
  }
  if (!Array.isArray(parsed)) return `${fileName}: ожидался массив`;
  return parsed as Json[];
}

/**
 * Swift Date → epoch ms. При required=false отсутствующее/непарсящееся значение
 * молча даёт null — так ведёт себя Swift с optional-полями (nil просто не кодируется).
 */
function swiftDateToMs(
  value: Json | undefined,
  where: string,
  warnings: string[],
  required = true
): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return (value + SWIFT_REFERENCE_DATE_EPOCH_S) * 1000;
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const seconds = value['timeIntervalSinceReferenceDate'];
    if (typeof seconds === 'number' && Number.isFinite(seconds)) {
      return (seconds + SWIFT_REFERENCE_DATE_EPOCH_S) * 1000;
    }
    const ms = value['timeIntervalSince1970'];
    if (typeof ms === 'number' && Number.isFinite(ms)) return ms * 1000;
  }
  if (required) warnings.push(`${where}: не удалось разобрать дату — запись пропущена`);
  return null;
}

function readString(value: Json | undefined): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function readNumber(value: Json | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readInt(value: Json | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function parseInputMode(value: Json | undefined, where: string, warnings: string[]): InputMode | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    warnings.push(`${where}: отсутствует inputMode — запись пропущена`);
    return null;
  }
  // untagged (Swift по умолчанию) и tagged (наш формат) варианты
  const timeRange = value['timeRange'] ?? (value['kind'] === 'timeRange' ? value : undefined);
  if (timeRange && typeof timeRange === 'object' && !Array.isArray(timeRange)) {
    const start = swiftDateToMs(timeRange['start'], `${where} start`, warnings);
    const end = swiftDateToMs(timeRange['end'], `${where} end`, warnings);
    if (start == null || end == null) return null;
    return { kind: 'timeRange', start, end };
  }
  const duration = value['duration'] ?? (value['kind'] === 'duration' ? value : undefined);
  if (duration && typeof duration === 'object' && !Array.isArray(duration)) {
    const hours = readInt(duration['hours'], 0);
    const minutes = readInt(duration['minutes'], 0);
    return { kind: 'duration', hours, minutes };
  }
  warnings.push(`${where}: неизвестный inputMode — запись пропущена`);
  return null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function parseIosEntries(source: string): { items: WorkEntry[]; warnings: string[]; error?: string } {
  const parsed = parseJsonArray(source, 'work_entries.json');
  if (typeof parsed === 'string') return { items: [], warnings: [], error: parsed };
  const warnings: string[] = [];
  const items: WorkEntry[] = [];
  parsed.forEach((raw, i) => {
    const where = `work_entries[${i}]`;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      warnings.push(`${where}: не объект — пропущено`);
      return;
    }
    const rawId = readString(raw['id']);
    if (!rawId) {
      warnings.push(`${where}: нет id — пропущено`);
      return;
    }
    // Swift UUIDcanonical: с дефисами; генерируем новый, если формат неизвестен
    const id = isUuid(rawId) ? rawId.toLowerCase() : crypto.randomUUID();
    const dateMs = swiftDateToMs(raw['date'], `${where} date`, warnings);
    if (dateMs == null) return;
    const inputMode = parseInputMode(raw['inputMode'], where, warnings);
    if (!inputMode) return;
    const rate = readNumber(raw['rate']);
    items.push({
      id,
      date: startOfDay(dateMs),
      inputMode,
      rate: rate ?? 0,
      overridePay: readNumber(raw['overridePay']),
      note: readString(raw['note']),
      // iOS-файлы операций не содержат — пустой список; пользователь добавит сам
      surgeries: parseSurgeries(raw['surgeries'])
    });
  });
  return { items, warnings };
}

/** Операции: толерантно, кривые элементы пропускаем (не роняем ради них всю запись). */
function parseSurgeries(value: Json | undefined): Surgery[] {
  if (!Array.isArray(value)) return [];
  const items: Surgery[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const name = readString(raw['name']) ?? '';
    const price = readNumber(raw['price']);
    if (price == null) continue;
    items.push({ name, price });
  }
  return items;
}

export function parseIosPlannedShifts(source: string): { items: PlannedShift[]; warnings: string[]; error?: string } {
  const parsed = parseJsonArray(source, 'planned_shifts.json');
  if (typeof parsed === 'string') return { items: [], warnings: [], error: parsed };
  const warnings: string[] = [];
  const items: PlannedShift[] = [];
  parsed.forEach((raw, i) => {
    const where = `planned_shifts[${i}]`;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      warnings.push(`${where}: не объект — пропущено`);
      return;
    }
    const rawId = readString(raw['id']);
    if (!rawId) {
      warnings.push(`${where}: нет id — пропущено`);
      return;
    }
    const dateMs = swiftDateToMs(raw['date'], `${where} date`, warnings);
    const startTime = swiftDateToMs(raw['startTime'], `${where} startTime`, warnings);
    const endTime = swiftDateToMs(raw['endTime'], `${where} endTime`, warnings);
    if (dateMs == null || startTime == null || endTime == null) return;
    const statusRaw = readString(raw['status']);
    items.push({
      id: isUuid(rawId) ? rawId.toLowerCase() : crypto.randomUUID(),
      date: startOfDay(dateMs),
      startTime,
      endTime,
      rate: readNumber(raw['rate']) ?? 0,
      reminderEnabled: raw['reminderEnabled'] === true,
      reminderOffsetMinutes: readInt(raw['reminderOffsetMinutes'], 60),
      status: statusRaw === 'active' ? 'active' : 'planned',
      actualStartTime: swiftDateToMs(raw['actualStartTime'], `${where} actualStartTime`, warnings, false),
      note: readString(raw['note']),
      surgeries: parseSurgeries(raw['surgeries'])
    });
  });
  return { items, warnings };
}

export function parseIosSettings(source: string): { settings: AppSettings; warnings: string[]; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return { settings: mergeSettings(null), warnings: [], error: 'app_settings.json: не корректный JSON' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { settings: mergeSettings(null), warnings: [], error: 'app_settings.json: ожидался объект' };
  }
  const rate = (parsed as Record<string, unknown>)['hourlyRate'];
  const daily = (parsed as Record<string, unknown>)['dailyReminderEnabled'];
  const settings = mergeSettings({
    hourlyRate: typeof rate === 'number' && Number.isFinite(rate) ? rate : undefined,
    dailyReminderEnabled: typeof daily === 'boolean' ? daily : undefined
  });
  return { settings, warnings: [] };
}

/** Совмещает разобранные куски; ошибочный файл = ошибка импорта целиком. */
export function importIosFiles(files: {
  workEntries?: string;
  plannedShifts?: string;
  appSettings?: string;
}): IosImportResult | { error: string } {
  const warnings: string[] = [];
  let entries: WorkEntry[] = [];
  let plannedShifts: PlannedShift[] = [];
  let settings: AppSettings = mergeSettings(null);

  if (files.workEntries != null) {
    const r = parseIosEntries(files.workEntries);
    if (r.error) return { error: r.error };
    entries = r.items;
    warnings.push(...r.warnings);
  }
  if (files.plannedShifts != null) {
    const r = parseIosPlannedShifts(files.plannedShifts);
    if (r.error) return { error: r.error };
    plannedShifts = r.items;
    warnings.push(...r.warnings);
  }
  if (files.appSettings != null) {
    const r = parseIosSettings(files.appSettings);
    if (r.error) return { error: r.error };
    settings = r.settings;
    warnings.push(...r.warnings);
  }

  if (entries.length === 0 && plannedShifts.length === 0) {
    warnings.push('В файлах не найдено ни одной записи или смены — убедитесь, что выбрали файлы из приложения на iOS.');
  }

  return { entries, plannedShifts, settings, warnings };
}
