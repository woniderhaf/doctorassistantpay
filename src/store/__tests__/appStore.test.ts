import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { createAppStore } from '../appStore';
import { IdbRepository, MemoryRepository, type DataRepository } from '../repository';
import type { PlannedShift, WorkEntry } from '@/core/types';

const day = (d: number) => new Date(2026, 9, d).getTime();

function makeEntry(id: string, dayNum: number, hours = 8): WorkEntry {
  return {
    id,
    date: day(dayNum),
    inputMode: { kind: 'duration', hours, minutes: 0 },
    rate: 400,
    overridePay: null,
    note: null,
    surgeries: []
  };
}

function makeShift(id: string, dayNum: number): PlannedShift {
  return {
    id,
    date: day(dayNum),
    startTime: new Date(2026, 9, dayNum, 9, 0).getTime(),
    endTime: new Date(2026, 9, dayNum, 17, 0).getTime(),
    rate: 400,
    reminderEnabled: true,
    reminderOffsetMinutes: 60,
    status: 'planned',
    actualStartTime: null,
    note: null,
    surgeries: []
  };
}

const repositories: Array<[string, () => DataRepository]> = [
  ['MemoryRepository', () => new MemoryRepository()],
  ['IdbRepository', () => new IdbRepository()]
];

describe.each(repositories)('appStore on %s', (_name, makeRepo) => {
  let repo: DataRepository;

  beforeEach(async () => {
    // fake-indexeddb глобальная: чистим store между тестами через сам репозиторий
    repo = makeRepo();
    await repo.clear();
  });

  it('init на пустом хранилище — дефолты', async () => {
    const store = createAppStore(repo);
    await store.getState().init();
    expect(store.getState().loaded).toBe(true);
    expect(store.getState().entries).toEqual([]);
    expect(store.getState().settings.hourlyRate).toBe(400);
  });

  it('addEntry → persist → новый store с тем же repo видит запись', async () => {
    const store = createAppStore(repo);
    await store.getState().init();
    store.getState().addEntry(makeEntry('e1', 5));
    await Promise.resolve();

    const store2 = createAppStore(repo);
    await store2.getState().init();
    expect(store2.getState().entries).toHaveLength(1);
    expect(store2.getState().entries[0]!.id).toBe('e1');
  });

  it('updateEntry/deleteEntry', async () => {
    const store = createAppStore(repo);
    await store.getState().init();
    store.getState().addEntry(makeEntry('e1', 5));
    store.getState().updateEntry({ ...makeEntry('e1', 5, 6), note: 'правка' });
    expect(store.getState().entries[0]!.note).toBe('правка');
    store.getState().deleteEntry('e1');
    expect(store.getState().entries).toHaveLength(0);
  });

  it('closeShift переносит операции смены в запись', async () => {
    const store = createAppStore(repo);
    await store.getState().init();
    store.getState().addPlannedShift({
      ...makeShift('s1', 6),
      surgeries: [{ name: 'имплантат', price: 1000 }]
    });
    const original = store.getState().plannedShifts[0]!.surgeries;

    const entry = store.getState().closeShift('s1', new Date(2026, 9, 6, 17, 0).getTime());
    expect(entry?.surgeries).toEqual([{ name: 'имплантат', price: 1000 }]);
    // копия, а не та же ссылка — правка записи не должна задевать исходник
    expect(entry?.surgeries).not.toBe(original);
    expect(store.getState().entries[0]!.surgeries).toEqual([{ name: 'имплантат', price: 1000 }]);
  });

  it('activate → closeShift: запись создана (9:00→17:00 = 8ч · 3200₽), смена удалена', async () => {
    const store = createAppStore(repo);
    await store.getState().init();
    store.getState().addPlannedShift(makeShift('s1', 6));

    const now = new Date(2026, 9, 6, 9, 10).getTime();
    store.getState().activateShift('s1', now);
    expect(store.getState().plannedShifts[0]!.status).toBe('active');
    expect(store.getState().plannedShifts[0]!.actualStartTime).toBe(now);

    const end = new Date(2026, 9, 6, 17, 0).getTime();
    const entry = store.getState().closeShift('s1', end);
    expect(entry).not.toBeNull();
    expect(store.getState().plannedShifts).toHaveLength(0);
    expect(store.getState().entries).toHaveLength(1);
    const e = store.getState().entries[0]!;
    if (e.inputMode.kind !== 'timeRange') throw new Error('expected timeRange');
    expect(e.inputMode.start).toBe(now); // фактическое начало, не плановое
    expect(e.rate).toBe(400);
    expect(e.date).toBe(day(6));
  });

  it('cancelShift — без создания записи', async () => {
    const store = createAppStore(repo);
    await store.getState().init();
    store.getState().addPlannedShift(makeShift('s1', 6));
    store.getState().cancelShift('s1');
    expect(store.getState().plannedShifts).toHaveLength(0);
    expect(store.getState().entries).toHaveLength(0);
  });

  it('setHourlyRate сохраняется между сессиями', async () => {
    const store = createAppStore(repo);
    await store.getState().init();
    store.getState().setHourlyRate(550);
    await Promise.resolve();

    const store2 = createAppStore(repo);
    await store2.getState().init();
    expect(store2.getState().settings.hourlyRate).toBe(550);
  });

  it('даты нормализуются к полуночи при сохранении', async () => {
    const store = createAppStore(repo);
    await store.getState().init();
    store.getState().addEntry({ ...makeEntry('e1', 7), date: new Date(2026, 9, 7, 23, 59).getTime() });
    expect(store.getState().entries[0]!.date).toBe(day(7));
  });
});
