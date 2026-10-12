import { create } from 'zustand';
import { makeEntryFromShift } from '@/core/plannedShift';
import { startOfDay } from '@/core/dateHelpers';
import type { AppSettings, PlannedShift, WorkEntry } from '@/core/types';
import type { DataRepository } from './repository';

/**
 * Порт WorkStore (iOS): три куска состояния + действия.
 * Каждая мутация делает fire-and-forget save — аналог didSet в Swift.
 */
export interface AppState {
  loaded: boolean;
  entries: WorkEntry[];
  plannedShifts: PlannedShift[];
  settings: AppSettings;

  init: () => Promise<void>;

  addEntry: (entry: WorkEntry) => void;
  updateEntry: (entry: WorkEntry) => void;
  deleteEntry: (id: string) => void;

  addPlannedShift: (shift: PlannedShift) => void;
  updatePlannedShift: (shift: PlannedShift) => void;
  /** «Смена началась» → status active + фактическое время. */
  activateShift: (id: string, now: number) => void;
  /** Закрытие активной смены → создаёт WorkEntry, смена удаляется. */
  closeShift: (id: string, endMs: number) => WorkEntry | null;
  /** Отмена смены (planned или active) — без создания записи. */
  cancelShift: (id: string) => void;

  setHourlyRate: (rate: number) => void;
  /** Полная замена данных (после импорта). */
  replaceAll: (data: { entries: WorkEntry[]; plannedShifts: PlannedShift[]; settings: AppSettings }) => void;
}

export function createAppStore(repository: DataRepository) {
  return create<AppState>((set, get) => {
    const persistEntries = (entries: WorkEntry[]) => void repository.saveEntries(entries);
    const persistShifts = (plannedShifts: PlannedShift[]) => void repository.savePlannedShifts(plannedShifts);
    const persistSettings = (settings: AppSettings) => void repository.saveSettings(settings);

    return {
      loaded: false,
      entries: [],
      plannedShifts: [],
      settings: { hourlyRate: 400, dailyReminderEnabled: true },

      async init() {
        const data = await repository.loadAll();
        set({ ...data, loaded: true });
      },

      addEntry(entry) {
        const entries = [...get().entries, { ...entry, date: startOfDay(entry.date) }];
        set({ entries });
        persistEntries(entries);
      },

      updateEntry(entry) {
        const normalized = { ...entry, date: startOfDay(entry.date) };
        const entries = get().entries.map(e => (e.id === normalized.id ? normalized : e));
        set({ entries });
        persistEntries(entries);
      },

      deleteEntry(id) {
        const entries = get().entries.filter(e => e.id !== id);
        set({ entries });
        persistEntries(entries);
      },

      addPlannedShift(shift) {
        const plannedShifts = [...get().plannedShifts, { ...shift, date: startOfDay(shift.date) }];
        set({ plannedShifts });
        persistShifts(plannedShifts);
      },

      updatePlannedShift(shift) {
        const normalized = { ...shift, date: startOfDay(shift.date) };
        const plannedShifts = get().plannedShifts.map(s => (s.id === normalized.id ? normalized : s));
        set({ plannedShifts });
        persistShifts(plannedShifts);
      },

      activateShift(id, now) {
        const plannedShifts = get().plannedShifts.map(s =>
          s.id === id ? { ...s, status: 'active' as const, actualStartTime: now } : s
        );
        set({ plannedShifts });
        persistShifts(plannedShifts);
      },

      closeShift(id, endMs) {
        const shift = get().plannedShifts.find(s => s.id === id);
        if (!shift) return null;
        const entry = makeEntryFromShift(shift, endMs, () => crypto.randomUUID());
        const entries = [...get().entries, entry];
        const plannedShifts = get().plannedShifts.filter(s => s.id !== id);
        set({ entries, plannedShifts });
        void repository.saveEntries(entries);
        persistShifts(plannedShifts);
        return entry;
      },

      cancelShift(id) {
        const plannedShifts = get().plannedShifts.filter(s => s.id !== id);
        set({ plannedShifts });
        persistShifts(plannedShifts);
      },

      setHourlyRate(rate) {
        const settings = { ...get().settings, hourlyRate: rate };
        set({ settings });
        persistSettings(settings);
      },

      replaceAll({ entries, plannedShifts, settings }) {
        set({
          entries: entries.map(e => ({ ...e, date: startOfDay(e.date) })),
          plannedShifts: plannedShifts.map(s => ({ ...s, date: startOfDay(s.date) })),
          settings
        });
        void repository.saveEntries(get().entries);
        void repository.savePlannedShifts(get().plannedShifts);
        void repository.saveSettings(get().settings);
      }
    };
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
