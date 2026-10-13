import { describe, expect, it } from 'vitest';
import { importIosFiles, parseIosEntries, parseIosPlannedShifts, parseIosSettings } from '../legacy/iosImport';
import { startOfDay } from '../dateHelpers';

/**
 * Swift JSONEncoder по умолчанию кодирует Date как количество секунд от
 * reference date 2001-01-01T00:00:00Z (= 978 307 200 epoch-секунд).
 */
const REF_EPOCH_S = 978_307_200;

/** Инстанс → Swift-представление Date. */
function swiftDate(ms: number): { timeIntervalSinceReferenceDate: number } {
  return { timeIntervalSinceReferenceDate: ms / 1000 - REF_EPOCH_S };
}

describe('эпоха reference date', () => {
  it('2001-01-01T00:00:00Z = 0 секунд', () => {
    const { items } = parseIosEntries(
      JSON.stringify([
        {
          id: '3F2504E0-4F89-11D3-9A0C-0305E82C3301',
          date: swiftDate(Date.UTC(2001, 0, 1)),
          inputMode: { duration: { hours: 8, minutes: 0 } },
          rate: 500
        }
      ])
    );
    expect(items).toHaveLength(1);
    // дата нормализуется к локальной полуночи 1 января 2001
    const d = new Date(items[0]!.date);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2001, 0, 1]);
    expect(items[0]!.id).toBe('3f2504e0-4f89-11d3-9a0c-0305e82c3301');
  });

  it('зафиксированная пара секунд ↔ дата (2026-01-01T00:00:00Z)', () => {
    // 25 лет от reference date, 6 высокосных ⇒ 9131 сутки ⇒ 788 918 400 с
    expect(Date.UTC(2026, 0, 1) / 1000 - REF_EPOCH_S).toBe(788_918_400);
  });
});

describe('parseIosEntries', () => {
  it('timeRange: untagged-enumvariant как кодирует Swift', () => {
    const start = new Date(2026, 9, 12, 9, 0);
    const end = new Date(2026, 9, 12, 17, 30);
    const json = JSON.stringify([
      {
        id: '11111111-1111-4111-8111-111111111111',
        date: swiftDate(startOfDay(new Date(2026, 9, 12).getTime())),
        inputMode: { timeRange: { start: swiftDate(start.getTime()), end: swiftDate(end.getTime()) } },
        rate: 500,
        note: 'клиника №3'
      }
    ]);
    const { items, warnings } = parseIosEntries(json);
    expect(warnings).toEqual([]);
    expect(items[0]!.inputMode).toEqual({ kind: 'timeRange', start: start.getTime(), end: end.getTime() });
    expect(items[0]!.rate).toBe(500);
    expect(items[0]!.note).toBe('клиника №3');
    expect(items[0]!.overridePay).toBeNull();
  });

  it('duration: часы и минуты', () => {
    const json = JSON.stringify([
      {
        id: '22222222-2222-4222-8222-222222222222',
        date: swiftDate(startOfDay(new Date(2026, 10, 3).getTime())),
        inputMode: { duration: { hours: 6, minutes: 40 } },
        rate: 400,
        overridePay: 3000
      }
    ]);
    const { items } = parseIosEntries(json);
    expect(items[0]!.inputMode).toEqual({ kind: 'duration', hours: 6, minutes: 40 });
    expect(items[0]!.overridePay).toBe(3000);
  });

  it('tagged-вариант enum тоже принимается', () => {
    const start = new Date(2026, 0, 15, 8).getTime();
    const json = JSON.stringify([
      {
        id: '33333333-3333-4333-8333-333333333333',
        date: swiftDate(startOfDay(start)),
        inputMode: {
          kind: 'timeRange',
          start: swiftDate(start),
          end: swiftDate(new Date(2026, 0, 15, 16).getTime())
        },
        rate: 450
      }
    ]);
    const { items, warnings } = parseIosEntries(json);
    expect(warnings).toEqual([]);
    expect(items[0]!.inputMode).toMatchObject({ kind: 'timeRange' });
  });

  it('сырое число вместо объекта Date', () => {
    const day = startOfDay(new Date(2026, 4, 20).getTime());
    const json = JSON.stringify([
      {
        id: '44444444-4444-4444-8444-444444444444',
        date: day / 1000 - REF_EPOCH_S,
        inputMode: { duration: { hours: 10, minutes: 0 } },
        rate: 400
      }
    ]);
    const { items } = parseIosEntries(json);
    expect(items[0]!.date).toBe(day);
  });

  it('битые элементы пропускаются с warning, остальные импортируются', () => {
    const good = {
      id: '55555555-5555-4555-8555-555555555555',
      date: swiftDate(startOfDay(new Date(2026, 2, 5).getTime())),
      inputMode: { duration: { hours: 5, minutes: 0 } },
      rate: 400
    };
    const { items, warnings } = parseIosEntries(
      JSON.stringify([good, { date: swiftDate(0), inputMode: { duration: { hours: 1, minutes: 0 } }, rate: 1 }, 'мусор', { id: 'x', inputMode: { unknown: {} } }])
    );
    expect(items).toHaveLength(1);
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });

  it('нечётный UUID заменяется сгенерированным', () => {
    const { items, warnings } = parseIosEntries(
      JSON.stringify([
        {
          id: 'temp-1',
          date: swiftDate(startOfDay(new Date(2026, 6, 1).getTime())),
          inputMode: { duration: { hours: 4, minutes: 0 } },
          rate: 400
        }
      ])
    );
    expect(items[0]!.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(items[0]!.id).not.toBe('temp-1');
    expect(warnings).toEqual([]);
  });

  it('не-массив → ошибка', () => {
    expect(parseIosEntries('{"id":1}').error).toContain('ожидался массив');
    expect(parseIosEntries('не json').error).toContain('не корректный JSON');
  });
});

describe('parseIosPlannedShifts', () => {
  it('полный round-trip активной смены', () => {
    const day = startOfDay(new Date(2026, 9, 14).getTime());
    const start = new Date(2026, 9, 14, 9).getTime();
    const end = new Date(2026, 9, 14, 18).getTime();
    const actual = new Date(2026, 9, 14, 9, 12).getTime();
    const { items, warnings } = parseIosPlannedShifts(
      JSON.stringify([
        {
          id: '66666666-6666-4666-8666-666666666666',
          date: swiftDate(day),
          startTime: swiftDate(start),
          endTime: swiftDate(end),
          rate: 600,
          reminderEnabled: true,
          reminderOffsetMinutes: 30,
          status: 'active',
          actualStartTime: swiftDate(actual),
          note: 'сутки'
        }
      ])
    );
    expect(warnings).toEqual([]);
    expect(items[0]).toEqual({
      id: '66666666-6666-4666-8666-666666666666',
      date: day,
      startTime: start,
      endTime: end,
      rate: 600,
      reminderEnabled: true,
      reminderOffsetMinutes: 30,
      status: 'active',
      actualStartTime: actual,
      note: 'сутки'
    });
  });

  it('planned без actualStartTime и без note — без warnings', () => {
    const start = new Date(2026, 10, 1, 9).getTime();
    const { items, warnings } = parseIosPlannedShifts(
      JSON.stringify([
        {
          id: '77777777-7777-4777-8777-777777777777',
          date: swiftDate(startOfDay(start)),
          startTime: swiftDate(start),
          endTime: swiftDate(new Date(2026, 10, 1, 17).getTime()),
          rate: 400,
          reminderEnabled: false,
          reminderOffsetMinutes: 60,
          status: 'planned'
        }
      ])
    );
    expect(warnings).toEqual([]);
    expect(items[0]!.actualStartTime).toBeNull();
    expect(items[0]!.note).toBeNull();
    expect(items[0]!.status).toBe('planned');
  });
});

describe('parseIosSettings', () => {
  it('ставка и флаг напоминания', () => {
    const { settings, error } = parseIosSettings(JSON.stringify({ hourlyRate: 550, dailyReminderEnabled: false }));
    expect(error).toBeUndefined();
    expect(settings).toEqual({ hourlyRate: 550, dailyReminderEnabled: false });
  });

  it('незаполненные поля → дефолты', () => {
    const { settings } = parseIosSettings(JSON.stringify({ hourlyRate: 550 }));
    expect(settings).toEqual({ hourlyRate: 550, dailyReminderEnabled: true });
  });
});

describe('importIosFiles', () => {
  it('собирает три файла вместе', () => {
    const day = startOfDay(new Date(2026, 8, 1).getTime());
    const result = importIosFiles({
      workEntries: JSON.stringify([
        {
          id: '88888888-8888-4888-8888-888888888888',
          date: swiftDate(day),
          inputMode: { duration: { hours: 8, minutes: 0 } },
          rate: 400
        }
      ]),
      plannedShifts: JSON.stringify([]),
      appSettings: JSON.stringify({ hourlyRate: 700, dailyReminderEnabled: true })
    });
    if ('error' in result) throw new Error(result.error);
    expect(result.entries).toHaveLength(1);
    expect(result.plannedShifts).toHaveLength(0);
    expect(result.settings.hourlyRate).toBe(700);
  });

  it('пустые файлы дают предупреждение, а не тихую победу', () => {
    const result = importIosFiles({ workEntries: '[]', plannedShifts: '[]' });
    if ('error' in result) throw new Error(result.error);
    expect(result.entries).toHaveLength(0);
    expect(result.warnings.join(' ')).toContain('не найдено');
  });

  it('битый файл останавливает импорт целиком', () => {
    const result = importIosFiles({ workEntries: '}{', plannedShifts: '[]' });
    expect(result).toEqual({ error: expect.stringContaining('work_entries.json') });
  });
});
