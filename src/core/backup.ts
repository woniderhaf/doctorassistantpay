import { startOfDay } from './dateHelpers';
import { mergeSettings } from './settings';
import type { AppSettings, PlannedShift, WorkEntry } from './types';

/**
 * Собственный формат бэкапа: один JSON со всеми данными. Даты — epoch-ms
 * (в отличие от iOS-файлов с reference date — здесь ничего не конвертим).
 */
export const BACKUP_FORMAT = 'shift-log-backup';
export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  entries: WorkEntry[];
  plannedShifts: PlannedShift[];
  settings: AppSettings;
}

export function serializeBackup(data: {
  entries: WorkEntry[];
  plannedShifts: PlannedShift[];
  settings: AppSettings;
  now?: Date;
}): string {
  const file: BackupFile = {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date((data.now ?? new Date()).getTime()).toISOString(),
    entries: data.entries,
    plannedShifts: data.plannedShifts,
    settings: data.settings
  };
  return JSON.stringify(file, null, 2);
}

/** Имя файла с датой — удобно складывать несколько бэкапов в папку. */
export function backupFileName(now: Date = new Date()): string {
  const d = now;
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  return `uchet-smen-${stamp}.json`;
}

export type BackupParseResult =
  | { ok: true; data: { entries: WorkEntry[]; plannedShifts: PlannedShift[]; settings: AppSettings } }
  | { ok: false; error: string };

/** Толерантный разбор: проверяем каркас, поля нормализуем, мусор отбраковываем. */
export function parseBackup(source: string): BackupParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch {
    return { ok: false, error: 'Файл не является корректным JSON.' };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Ожидался объект бэкапа.' };
  }
  const obj = raw as Record<string, unknown>;
  if (obj['format'] !== BACKUP_FORMAT) {
    return { ok: false, error: 'Это не бэкап «Учёт смен». Для файлов из iOS-приложения используйте отдельный импорт.' };
  }
  const version = obj['schemaVersion'];
  if (typeof version !== 'number' || version > BACKUP_SCHEMA_VERSION) {
    return { ok: false, error: `Неизвестная версия бэкапа (${String(version)}). Обновите приложение.` };
  }

  const entries = parseEntries(obj['entries']);
  const plannedShifts = parseShifts(obj['plannedShifts']);
  if (entries === null) return { ok: false, error: 'Поле entries повреждено.' };
  if (plannedShifts === null) return { ok: false, error: 'Поле plannedShifts повреждено.' };

  return {
    ok: true,
    data: {
      entries,
      plannedShifts,
      settings: mergeSettings(obj['settings'] as Partial<AppSettings> | undefined)
    }
  };
}

function parseEntries(value: unknown): WorkEntry[] | null {
  if (value == null) return [];
  if (!Array.isArray(value)) return null;
  const items: WorkEntry[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const o = raw as Record<string, unknown>;
    if (typeof o['id'] !== 'string' || typeof o['date'] !== 'number') continue;
    const mode = o['inputMode'] as Record<string, unknown> | undefined;
    let inputMode: WorkEntry['inputMode'] | null = null;
    if (mode?.['kind'] === 'timeRange' && typeof mode['start'] === 'number' && typeof mode['end'] === 'number') {
      inputMode = { kind: 'timeRange', start: mode['start'], end: mode['end'] };
    } else if (mode?.['kind'] === 'duration') {
      inputMode = {
        kind: 'duration',
        hours: typeof mode['hours'] === 'number' ? mode['hours'] : 0,
        minutes: typeof mode['minutes'] === 'number' ? mode['minutes'] : 0
      };
    }
    if (!inputMode) continue;
    items.push({
      id: o['id'],
      date: startOfDay(o['date']),
      inputMode,
      rate: typeof o['rate'] === 'number' ? o['rate'] : 0,
      overridePay: typeof o['overridePay'] === 'number' ? o['overridePay'] : null,
      note: typeof o['note'] === 'string' ? o['note'] : null
    });
  }
  return items;
}

function parseShifts(value: unknown): PlannedShift[] | null {
  if (value == null) return [];
  if (!Array.isArray(value)) return null;
  const items: PlannedShift[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const o = raw as Record<string, unknown>;
    if (
      typeof o['id'] !== 'string' ||
      typeof o['date'] !== 'number' ||
      typeof o['startTime'] !== 'number' ||
      typeof o['endTime'] !== 'number'
    ) {
      continue;
    }
    items.push({
      id: o['id'],
      date: startOfDay(o['date']),
      startTime: o['startTime'],
      endTime: o['endTime'],
      rate: typeof o['rate'] === 'number' ? o['rate'] : 0,
      reminderEnabled: o['reminderEnabled'] === true,
      reminderOffsetMinutes: typeof o['reminderOffsetMinutes'] === 'number' ? o['reminderOffsetMinutes'] : 60,
      status: o['status'] === 'active' ? 'active' : 'planned',
      actualStartTime: typeof o['actualStartTime'] === 'number' ? o['actualStartTime'] : null,
      note: typeof o['note'] === 'string' ? o['note'] : null
    });
  }
  return items;
}
