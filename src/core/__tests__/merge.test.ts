import { describe, expect, it } from 'vitest';
import { parseBackup } from '../backup';
import { describeMerge, mergeEntries, mergePlannedShifts } from '../merge';
import { startOfDay } from '../dateHelpers';
import type { PlannedShift, WorkEntry } from '../types';

const day = startOfDay(new Date(2026, 9, 12).getTime());
const e = (id: string, rate = 500): WorkEntry => ({
  id,
  date: day,
  inputMode: { kind: 'duration', hours: 8, minutes: 0 },
  rate,
  overridePay: null,
  note: null,
  surgeries: []
});
const s = (id: string, rate = 600): PlannedShift => ({
  id,
  date: day,
  startTime: day + 9 * 3_600_000,
  endTime: day + 18 * 3_600_000,
  rate,
  reminderEnabled: false,
  reminderOffsetMinutes: 60,
  status: 'planned',
  actualStartTime: null,
  note: null,
  surgeries: []
});

describe('mergeById', () => {
  it('новые id добавляются, порядок существующих сохраняется', () => {
    const result = mergeEntries([e('a'), e('b')], [e('c')]);
    expect(result.items.map(i => i.id)).toEqual(['a', 'b', 'c']);
    expect(result).toMatchObject({ added: 1, updated: 0, unchanged: 0 });
  });

  it('повторный импорт того же файла — ноль изменений и ноль дублей', () => {
    const existing = [e('a'), e('b')];
    const result = mergeEntries(existing, [e('a'), e('b')]);
    expect(result.items).toHaveLength(2);
    expect(result).toMatchObject({ added: 0, updated: 0, unchanged: 2 });
  });

  it('при коллизии id побеждает импортируемая версия', () => {
    const result = mergeEntries([e('a', 100)], [e('a', 900)]);
    expect(result.items).toEqual([e('a', 900)]);
    expect(result).toMatchObject({ added: 0, updated: 1, unchanged: 0 });
  });

  it('лияние плановых смен работает так же', () => {
    const result = mergePlannedShifts([s('s1')], [s('s1'), s('s2')]);
    expect(result.items.map(i => i.id)).toEqual(['s1', 's2']);
    expect(result).toMatchObject({ added: 1, unchanged: 1 });
  });

  it('сообщение для интерфейса', () => {
    expect(describeMerge('записи', mergeEntries([], [e('x')]))).toBe('записи: добавлено 1');
    expect(describeMerge('записи', mergeEntries([e('x')], [e('x')]))).toBe('записи: без изменений');
  });
});

describe('кросс-формат: файл iOS-приложения читается веб-парсером', () => {
  /**
   * Фикстура повторяет вывод BackupExporter.swift: JSONEncoder с
   * [.prettyPrinted, .sortedKeys], даты — epoch-мс, inputMode — tagged,
   * id — строчный UUID.
   */
  const IOS_EXPORT = `{
  "entries" : [
    {
      "date" : ${day},
      "id" : "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
      "inputMode" : {
        "end" : ${day + 17 * 3_600_000},
        "kind" : "timeRange",
        "start" : ${day + 9 * 3_600_000}
      },
      "note" : "клиника №3",
      "overridePay" : 5000,
      "rate" : 500
    },
    {
      "date" : ${day},
      "id" : "11111111-1111-4111-8111-111111111111",
      "inputMode" : {
        "hours" : 6,
        "kind" : "duration",
        "minutes" : 40
      },
      "rate" : 400
    }
  ],
  "exportedAt" : "2026-10-13T07:30:00Z",
  "format" : "shift-log-backup",
  "plannedShifts" : [
    {
      "date" : ${day},
      "endTime" : ${day + 18 * 3_600_000},
      "id" : "66666666-6666-4666-8666-666666666666",
      "rate" : 600,
      "reminderEnabled" : true,
      "reminderOffsetMinutes" : 30,
      "startTime" : ${day + 9 * 3_600_000},
      "status" : "active",
      "actualStartTime" : ${day + 9 * 3_600_000 + 720_000}
    }
  ],
  "schemaVersion" : 1,
  "settings" : {
    "dailyReminderEnabled" : false,
    "hourlyRate" : 550
  }
}`;

  it('разбирается без ошибок, всё на месте', () => {
    const parsed = parseBackup(IOS_EXPORT);
    if (!parsed.ok) throw new Error(parsed.error);
    const { entries, plannedShifts, settings } = parsed.data;

    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      date: day,
      inputMode: { kind: 'timeRange', start: day + 9 * 3_600_000, end: day + 17 * 3_600_000 },
      rate: 500,
      overridePay: 5000,
      note: 'клиника №3',
      surgeries: []
    });
    expect(entries[1]!.inputMode).toEqual({ kind: 'duration', hours: 6, minutes: 40 });
    expect(entries[1]!.overridePay).toBeNull();
    expect(entries[1]!.note).toBeNull();
    expect(entries[1]!.surgeries).toEqual([]);

    expect(plannedShifts[0]).toMatchObject({
      status: 'active',
      actualStartTime: day + 9 * 3_600_000 + 720_000,
      reminderOffsetMinutes: 30
    });

    expect(settings).toEqual({ hourlyRate: 550, surgeryPrice: 1000, dailyReminderEnabled: false });
  });

  it('импорт поверх текущих данных добавляет, а не затирает', () => {
    const parsed = parseBackup(IOS_EXPORT);
    if (!parsed.ok) throw new Error(parsed.error);
    const own = [e('own-1')];
    const merged = mergeEntries(own, parsed.data.entries);
    expect(merged.items.map(i => i.id)).toEqual(['own-1', '3f2504e0-4f89-11d3-9a0c-0305e82c3301', '11111111-1111-4111-8111-111111111111']);
    expect(merged.added).toBe(2);

    // второй импорт того же файла ничего не добавляет
    const again = mergeEntries(merged.items, parsed.data.entries);
    expect(again).toMatchObject({ added: 0, updated: 0, unchanged: 2 });
  });
});
