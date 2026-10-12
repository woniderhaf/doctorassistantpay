import { openDB, type IDBPDatabase } from 'idb';
import { mergeSettings } from '@/core/settings';
import { startOfDay } from '@/core/dateHelpers';
import type { AppSettings, PlannedShift, WorkEntry } from '@/core/types';

const DB_NAME = 'shift-log';
const DB_VERSION = 1;
const STORE = 'data';

/** Ключи-блобы — зеркало трёх JSON-файлов iOS-версии. */
const KEY_ENTRIES = 'workEntries';
const KEY_SHIFTS = 'plannedShifts';
const KEY_SETTINGS = 'appSettings';

interface Blob<T> {
  schemaVersion: number;
  items: T;
}

export interface LoadedData {
  entries: WorkEntry[];
  plannedShifts: PlannedShift[];
  settings: AppSettings;
}

/**
 * Абстракция хранилища. Реализация — IndexedDB (idb).
 * Даты нормализуются к локальной полуночи при записи (date у записей и смен).
 */
export interface DataRepository {
  loadAll(): Promise<LoadedData>;
  saveEntries(entries: WorkEntry[]): Promise<void>;
  savePlannedShifts(shifts: PlannedShift[]): Promise<void>;
  saveSettings(settings: AppSettings): Promise<void>;
  /** Полный сброс (используется тестами; кнопка «сброс» UI v1 не предоставляет). */
  clear(): Promise<void>;
}

function normalizeEntry(e: WorkEntry): WorkEntry {
  return { ...e, date: startOfDay(e.date) };
}

async function connect(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    }
  });
}

/**
 * Глобальная FIFO-очередь: все операции на IndexedDB исполняются строго
 * в порядке вызова (fire-and-forget сохранения из стора не обгоняют clear/load
 * следующего потребителя). На практике операции микрозадачи, потерь нет.
 */
let queueTail: Promise<unknown> = Promise.resolve();
function enqueue<T>(op: () => Promise<T>): Promise<T> {
  const result = queueTail.then(op, op);
  queueTail = result.catch(() => undefined);
  return result;
}

export class IdbRepository implements DataRepository {
  private dbPromise: Promise<IDBPDatabase> | null = null;

  private db(): Promise<IDBPDatabase> {
    this.dbPromise ??= connect();
    return this.dbPromise;
  }

  async loadAll(): Promise<LoadedData> {
    return enqueue(async () => {
      const db = await this.db();
      const [entriesBlob, shiftsBlob, settingsBlob] = await Promise.all([
        db.get(STORE, KEY_ENTRIES) as Promise<Blob<WorkEntry[]> | undefined>,
        db.get(STORE, KEY_SHIFTS) as Promise<Blob<PlannedShift[]> | undefined>,
        db.get(STORE, KEY_SETTINGS) as Promise<Blob<Partial<AppSettings>> | undefined>
      ]);
      return {
        entries: (entriesBlob?.items ?? []).map(normalizeEntry),
        plannedShifts: (shiftsBlob?.items ?? []).map(s => ({ ...s, date: startOfDay(s.date) })),
        settings: mergeSettings(settingsBlob?.items ?? null)
      };
    });
  }

  async saveEntries(entries: WorkEntry[]): Promise<void> {
    return enqueue(async () => {
      const db = await this.db();
      await db.put(STORE, { schemaVersion: 1, items: entries.map(normalizeEntry) } satisfies Blob<WorkEntry[]>, KEY_ENTRIES);
    });
  }

  async savePlannedShifts(shifts: PlannedShift[]): Promise<void> {
    return enqueue(async () => {
      const db = await this.db();
      const items = shifts.map(s => ({ ...s, date: startOfDay(s.date) }));
      await db.put(STORE, { schemaVersion: 1, items } satisfies Blob<PlannedShift[]>, KEY_SHIFTS);
    });
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    return enqueue(async () => {
      const db = await this.db();
      await db.put(STORE, { schemaVersion: 1, items: settings } satisfies Blob<AppSettings>, KEY_SETTINGS);
    });
  }

  async clear(): Promise<void> {
    return enqueue(async () => {
      const db = await this.db();
      await db.clear(STORE);
    });
  }
}

/** In-memory реализация для тестов. */
export class MemoryRepository implements DataRepository {
  private entries: WorkEntry[] = [];
  private shifts: PlannedShift[] = [];
  private settings: AppSettings | null = null;

  async loadAll(): Promise<LoadedData> {
    return {
      entries: this.entries.map(normalizeEntry),
      plannedShifts: this.shifts,
      settings: mergeSettings(this.settings)
    };
  }

  async saveEntries(entries: WorkEntry[]): Promise<void> {
    this.entries = entries.map(normalizeEntry);
  }

  async savePlannedShifts(shifts: PlannedShift[]): Promise<void> {
    this.shifts = shifts;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    this.settings = settings;
  }

  async clear(): Promise<void> {
    this.entries = [];
    this.shifts = [];
    this.settings = null;
  }
}
