import { describe, expect, it } from 'vitest';
import { BACKUP_FORMAT, backupFileName, parseBackup, serializeBackup } from '../backup';
import { startOfDay } from '../dateHelpers';
import type { PlannedShift, WorkEntry } from '../types';

const day = startOfDay(new Date(2026, 9, 12).getTime());

const entry: WorkEntry = {
  id: 'a1',
  date: day,
  inputMode: { kind: 'timeRange', start: day + 9 * 3_600_000, end: day + 17 * 3_600_000 },
  rate: 500,
  overridePay: null,
  note: 'заметка'
};

const shift: PlannedShift = {
  id: 's1',
  date: day,
  startTime: day + 9 * 3_600_000,
  endTime: day + 18 * 3_600_000,
  rate: 600,
  reminderEnabled: true,
  reminderOffsetMinutes: 30,
  status: 'planned',
  actualStartTime: null,
  note: null
};

const data = { entries: [entry], plannedShifts: [shift], settings: { hourlyRate: 500, dailyReminderEnabled: true } };

describe('бэкап', () => {
  it('round-trip сохраняет всё дословно', () => {
    const parsed = parseBackup(serializeBackup(data));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.entries).toEqual([entry]);
      expect(parsed.data.plannedShifts).toEqual([shift]);
      expect(parsed.data.settings.hourlyRate).toBe(500);
    }
  });

  it('в файле есть format и schemaVersion', () => {
    const file = JSON.parse(serializeBackup(data));
    expect(file.format).toBe(BACKUP_FORMAT);
    expect(file.schemaVersion).toBe(1);
    expect(typeof file.exportedAt).toBe('string');
  });

  it('чужой JSON отклоняется с внятной ошибкой', () => {
    expect(parseBackup('{"entries":[]}')).toEqual({
      ok: false,
      error: expect.stringContaining('не бэкап')
    });
    expect(parseBackup('не json').ok).toBe(false);
  });

  it('будущая версия схемы отклоняется', () => {
    const file = serializeBackup(data);
    const future = JSON.stringify({ ...JSON.parse(file), schemaVersion: 99 });
    expect(parseBackup(future)).toEqual({ ok: false, error: expect.stringContaining('версия') });
  });

  it('битые элементы отбраковываются, валидные остаются', () => {
    const file = JSON.stringify({
      format: BACKUP_FORMAT,
      schemaVersion: 1,
      entries: [entry, { id: 'broken' }, null],
      plannedShifts: [shift]
    });
    const parsed = parseBackup(file);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.entries).toEqual([entry]);
      expect(parsed.data.plannedShifts).toEqual([shift]);
    }
  });

  it('имя файла с датой', () => {
    expect(backupFileName(new Date(2026, 9, 12, 8, 5))).toBe('uchet-smen-20261012-0805.json');
  });
});
