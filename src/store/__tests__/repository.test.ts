import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { describe, it, expect } from 'vitest';
import { IdbRepository } from '../repository';
import { monthlySummaries } from '@/core/aggregator';

const day = (d: number) => new Date(2026, 9, d).getTime();

/**
 * Пишет в то же хранилище raw-блобы СТАРЫХ записей — до фичи «операции»
 * (commit afdc5f7): у записей и смен нет поля surgeries. Так выглядит
 * IndexedDB пользователя, который пользовался сайтом до обновления.
 */
async function seedLegacyBlob(key: string, items: unknown[]): Promise<void> {
  const db = await openDB('shift-log', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('data')) db.createObjectStore('data');
    }
  });
  await db.put('data', { schemaVersion: 1, items }, key);
  db.close();
}

describe('IdbRepository.loadAll — миграция старого формата', () => {
  it('записи и смены без surgeries (сохранены до фичи «операции») читаются с пустым списком', async () => {
    await seedLegacyBlob('workEntries', [
      {
        id: 'e-legacy',
        date: day(10),
        inputMode: { kind: 'duration', hours: 8, minutes: 0 },
        rate: 400,
        overridePay: null,
        note: null
      }
    ]);
    await seedLegacyBlob('plannedShifts', [
      {
        id: 's-legacy',
        date: day(11),
        startTime: new Date(2026, 9, 11, 9, 0).getTime(),
        endTime: new Date(2026, 9, 11, 17, 0).getTime(),
        rate: 400,
        reminderEnabled: true,
        reminderOffsetMinutes: 60,
        status: 'planned',
        actualStartTime: null,
        note: null
      }
    ]);

    const repo = new IdbRepository();
    const data = await repo.loadAll();

    // до фикса здесь surgeries === undefined
    expect(data.entries[0]?.surgeries).toEqual([]);
    expect(data.plannedShifts[0]?.surgeries).toEqual([]);

    // регрессия белого экрана: агрегатор истории вызывает finalPay → surgeriesTotal
    expect(() => monthlySummaries(data.entries)).not.toThrow();
    expect(monthlySummaries(data.entries)[0]?.summary.totalPay).toBe(3200);
  });
});
